/** /api/admin/returns — list return requests / move them through the flow. Admin only. */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildReturnMessage, type ReturnStatusKey } from "@/lib/i18n/orderMessages";
import type { Locale } from "@/lib/i18n/config";
import { RETURN_TRANSITIONS, type ReturnStatus } from "@/lib/returns";

export const dynamic = "force-dynamic";

const STATUSES: ReturnStatus[] = ["requested", "approved", "received", "refunded", "rejected", "cancelled"];

function isMissingTable(msg: string) {
  return /relation .*returns.* does not exist|returns.*schema cache/i.test(msg);
}

/** Status email via Resend. Failures never block the status change. */
async function sendReturnEmail(
  to: string,
  locale: string,
  status: ReturnStatusKey,
  params: { name: string; returnNum: string; orderNum: string; amount: number; note?: string }
) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  try {
    const msg = buildReturnMessage(locale as Locale, status, params);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // TODO: switch to orders@loov.ge once the domain is verified in Resend.
        from: "Loov <onboarding@resend.dev>",
        to: [to],
        subject: msg.subject,
        text: msg.body,
      }),
    });
    if (!res.ok) {
      console.warn("[admin/returns] email failed:", res.status, (await res.text()).slice(0, 200));
    }
  } catch (e) {
    console.warn("[admin/returns] email failed:", (e as Error).message);
  }
}

/**
 * Refund → fix the customer's points, pro-rata by refunded amount:
 *  - claw back the points EARNED on this order (negative "return" row)
 *  - give back the points REDEEMED on this order (positive "return" row)
 * Idempotent per order (skips if a "return" row already exists) and
 * best-effort: a ledger hiccup never blocks the refund itself.
 * "return" rows are excluded from lifetime-earned, so tiers don't move.
 */
async function adjustLoyaltyForRefund(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  ret: { order_id: string; user_id: string | null; refund_amount: number }
) {
  if (!ret.user_id) return; // guest order — no account ledger to fix
  try {
    const { data: txs, error } = await admin
      .from("loyalty_transactions")
      .select("delta, reason")
      .eq("order_id", ret.order_id);
    if (error || !txs || txs.length === 0) return;
    if (txs.some((t) => t.reason === "return")) return; // already adjusted

    const earned = txs
      .filter((t) => t.reason === "order" && Number(t.delta) > 0)
      .reduce((s, t) => s + Number(t.delta), 0);
    const redeemed = -txs
      .filter((t) => t.reason === "redeem" && Number(t.delta) < 0)
      .reduce((s, t) => s + Number(t.delta), 0);
    if (earned <= 0 && redeemed <= 0) return;

    const { data: order } = await admin
      .from("orders")
      .select("total")
      .eq("id", ret.order_id)
      .maybeSingle();
    const orderTotal = Number(order?.total ?? 0);
    const ratio = orderTotal > 0 ? Math.min(1, Number(ret.refund_amount) / orderTotal) : 1;

    const clawback = Math.min(earned, Math.round(earned * ratio));
    const restore = Math.min(redeemed, Math.round(redeemed * ratio));
    const rows = [
      ...(clawback > 0 ? [{ user_id: ret.user_id, order_id: ret.order_id, delta: -clawback, reason: "return" }] : []),
      ...(restore > 0 ? [{ user_id: ret.user_id, order_id: ret.order_id, delta: restore, reason: "return" }] : []),
    ];
    if (rows.length === 0) return;
    const { error: insErr } = await admin.from("loyalty_transactions").insert(rows);
    if (insErr) console.warn("[admin/returns] loyalty adjustment failed:", insErr.message);
  } catch (e) {
    console.warn("[admin/returns] loyalty adjustment failed:", (e as Error).message);
  }
}

export async function GET(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const status = new URL(req.url).searchParams.get("status");
  let query = admin.from("returns").select("*").order("created_at", { ascending: false });
  if (status && STATUSES.includes(status as ReturnStatus)) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error.message)) {
      return NextResponse.json({ returns: [], ready: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const returns = data ?? [];

  // Product lookup (photo + slug) so the admin sees what is coming back.
  const productIds = [
    ...new Set(
      returns.flatMap((r) =>
        ((r.items ?? []) as { product_id: string | null }[])
          .map((it) => it.product_id)
          .filter((id): id is string => !!id)
      )
    ),
  ];
  let productMap: Record<string, { slug: string; image_url: string | null; emoji: string | null; card_color: string | null }> = {};
  if (productIds.length > 0) {
    const { data: prods } = await admin
      .from("products")
      .select("id, slug, image_url, emoji, card_color")
      .in("id", productIds);
    productMap = Object.fromEntries(
      (prods ?? []).map((p) => [p.id as string, { slug: p.slug, image_url: p.image_url ?? null, emoji: p.emoji ?? null, card_color: p.card_color ?? null }])
    );
  }

  // Customer contact details come from the linked orders (phone for pickup).
  const orderIds = [...new Set(returns.map((r) => r.order_id as string))];
  let orderMap: Record<string, { phone: string | null; street: string | null; city: string | null; district: string | null }> = {};
  if (orderIds.length > 0) {
    const { data: ords } = await admin
      .from("orders")
      .select("id, phone, street, city, district")
      .in("id", orderIds);
    orderMap = Object.fromEntries(
      (ords ?? []).map((o) => [o.id as string, { phone: o.phone ?? null, street: o.street ?? null, city: o.city ?? null, district: o.district ?? null }])
    );
  }

  return NextResponse.json({ returns, products: productMap, orders: orderMap, ready: true });
}

export async function PATCH(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const status = String(body.status ?? "") as ReturnStatus;
  const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim() : "";
  if (!id || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid return or status" }, { status: 400 });
  }

  const { data: current, error: readErr } = await admin
    .from("returns")
    .select("id, return_number, order_id, order_number, user_id, status, email, locale, refund_amount, orders(first_name)")
    .eq("id", id)
    .maybeSingle();
  if (readErr) {
    const msg = isMissingTable(readErr.message)
      ? "Returns aren't set up yet — run supabase/returns.sql."
      : readErr.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: "Return not found" }, { status: 404 });

  const oldStatus = current.status as ReturnStatus;
  const allowed = RETURN_TRANSITIONS[oldStatus] ?? [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot move a "${oldStatus}" return to "${status}".` },
      { status: 400 }
    );
  }
  // "cancelled" is a customer-only action (their own PATCH on /api/returns).
  if (status === "cancelled") {
    return NextResponse.json({ error: "Only the customer can cancel their request." }, { status: 400 });
  }
  if (status === "rejected" && !adminNote) {
    return NextResponse.json({ error: "A rejection reason (note) is required." }, { status: 400 });
  }

  const isTerminal = status === "refunded" || status === "rejected";
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (adminNote) patch.admin_note = adminNote;
  if (isTerminal) patch.resolved_at = new Date().toISOString();

  const { error: updErr } = await admin.from("returns").update(patch).eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Money went back → points go back too (earned clawed back, redeemed restored).
  if (status === "refunded") {
    await adjustLoyaltyForRefund(admin, {
      order_id: current.order_id as string,
      user_id: (current.user_id as string | null) ?? null,
      refund_amount: Number(current.refund_amount ?? 0),
    });
  }

  await writeAudit({
    actorEmail: guard.email,
    action: "return.status",
    entity: "return",
    entityId: current.return_number as string,
    detail: { status, ...(adminNote ? { note: adminNote } : {}) },
  });

  // Tell the customer (requested has its own email from the customer API).
  const orderRel = current.orders as { first_name: string | null } | { first_name: string | null }[] | null;
  const firstName =
    (Array.isArray(orderRel) ? orderRel[0]?.first_name : orderRel?.first_name) ||
    ((current.email as string) || "").split("@")[0] ||
    "there";
  await sendReturnEmail(
    (current.email as string) ?? "",
    (current.locale as string) || "en",
    status as ReturnStatusKey,
    {
      name: firstName,
      returnNum: current.return_number as string,
      orderNum: current.order_number as string,
      amount: Number(current.refund_amount ?? 0),
      note: adminNote || undefined,
    }
  );

  return NextResponse.json({ ok: true });
}
