/**
 * /api/returns — customer return requests (FAZ 6).
 *
 *  GET   ?mine=1            → all returns of the signed-in user
 *        ?order=BBK-…       → returns for one of their orders
 *  POST  { orderNumber, items, reason, description, photos, iban }
 *        → open a return request. Server-side validation: the order must belong
 *          to the caller, be delivered, be inside the 14-day window; items must
 *          be a subset of the order's items; the refund amount is recomputed
 *          from order_items (never trusted from the client).
 *  PATCH { id }             → customer cancels their own request (only while
 *          it is still "requested").
 *
 * Writes use the service role after validation — no public write path (same
 * pattern as /api/reviews).
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildReturnMessage, type ReturnStatusKey } from "@/lib/i18n/orderMessages";
import { renderEmailHtml, EMAIL_FROM } from "@/lib/email/render";
import type { Locale } from "@/lib/i18n/config";
import {
  ACTIVE_RETURN_STATUSES,
  isValidGeorgianIban,
  reasonMeta,
  returnWindowEndsAt,
  type ReturnItem,
} from "@/lib/returns";
import { requireVerifiedSession } from "@/lib/auth/requireVerifiedSession";

export const dynamic = "force-dynamic";

/** Error response. `code` (when set) lets the client show a translated
 *  message instead of the raw English `error` string. */
function bad(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

/** Table missing → the SQL file hasn't been run yet. */
function isMissingTable(msg: string) {
  return /relation .*returns.* does not exist|returns.*schema cache/i.test(msg);
}

/** Return-flow email via Resend. Failures never block the request. */
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
        from: EMAIL_FROM,
        to: [to],
        subject: msg.subject,
        text: msg.body,
        html: renderEmailHtml(msg.body),
      }),
    });
    if (!res.ok) {
      console.warn("[returns] email failed:", res.status, (await res.text()).slice(0, 200));
    }
  } catch (e) {
    console.warn("[returns] email failed:", (e as Error).message);
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ returns: [] });

  const orderNumber = new URL(req.url).searchParams.get("order");
  try {
    // RLS ("returns_select_own") limits rows to the caller's own returns.
    let query = supabase
      .from("returns")
      .select("id, return_number, order_id, order_number, status, items, reason, description, photos, refund_amount, admin_note, created_at, resolved_at")
      .order("created_at", { ascending: false });
    if (orderNumber) query = query.eq("order_number", orderNumber);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ returns: data ?? [], ready: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (!isMissingTable(msg)) console.warn("[returns] GET failed:", msg);
    return NextResponse.json({ returns: [], ready: false });
  }
}

interface ReturnItemInput {
  productId: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
}

export async function POST(req: NextRequest) {
  // ── CSRF: only accept same-origin requests ──
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return bad("Cross-origin request rejected", 403);
  }

  // Financial (IBAN) + PII (photos) — requires a recently-verified session.
  const verified = await requireVerifiedSession();
  if (verified instanceof NextResponse) return verified;
  const user = verified;

  const supabase = await createSupabaseServerClient();

  const body = await req.json().catch(() => ({}));
  const orderNumber = String(body.orderNumber ?? "").trim();
  const reason = String(body.reason ?? "");
  const description = String(body.description ?? "").trim();
  const iban = String(body.iban ?? "").replace(/\s/g, "").toUpperCase();
  const photos: string[] = Array.isArray(body.photos) ? body.photos.filter((p: unknown) => typeof p === "string") : [];
  const itemsIn: ReturnItemInput[] = Array.isArray(body.items) ? body.items : [];

  // ── Validate the request shape ──
  if (!orderNumber) return bad("Missing order number");
  const meta = reasonMeta(reason);
  if (!meta) return bad("Please choose a return reason");
  if (description.length > 2000) return bad("Description is too long (max 2000 characters).");
  if (!isValidGeorgianIban(iban)) return bad("Please enter a valid Georgian IBAN (GE + 20 characters).", 400, "iban_invalid");
  if (photos.length > 3) return bad("Maximum 3 photos");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const photoPrefix = `${supabaseUrl}/storage/v1/object/public/return-photos/`;
  if (photos.some((p) => !p.startsWith(photoPrefix))) return bad("Invalid photo URL");
  if (meta.photoRequired && photos.length === 0) {
    return bad("Please add at least one photo showing the problem.", 400, "photo_required");
  }
  if (itemsIn.length === 0) return bad("Select at least one item to return");
  for (const it of itemsIn) {
    if (typeof it.quantity !== "number" || !Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 99) {
      return bad("Invalid item quantity");
    }
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return bad("Returns are temporarily unavailable.", 500);

  // ── Load the order (must belong to the caller, be delivered, in-window) ──
  const ORDER_SELECT =
    "id, order_number, user_id, status, created_at, shipping, email, first_name, locale, order_items(product_id, product_name, price, quantity, color, size)";
  let orderRow: Record<string, unknown> | null = null;
  {
    // delivered_at only exists after returns.sql — retry without it if missing.
    const withCol = await admin
      .from("orders")
      .select(`${ORDER_SELECT}, delivered_at`)
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (!withCol.error) orderRow = withCol.data;
    else if (/delivered_at/i.test(withCol.error.message)) {
      const withoutCol = await admin.from("orders").select(ORDER_SELECT).eq("order_number", orderNumber).maybeSingle();
      if (withoutCol.error) return bad(withoutCol.error.message, 500);
      orderRow = withoutCol.data;
    } else {
      return bad(withCol.error.message, 500);
    }
  }
  if (!orderRow || orderRow.user_id !== user.id) return bad("Order not found", 404);
  if (orderRow.status !== "delivered") return bad("Only delivered orders can be returned.", 400, "not_delivered");

  const windowEnd = returnWindowEndsAt(
    orderRow.delivered_at as string | undefined,
    orderRow.created_at as string
  );
  if (new Date() > windowEnd) {
    return bad("The 14-day return window for this order has closed.", 400, "window_closed");
  }

  // ── One active return per order ──
  {
    const { data: existing, error } = await admin
      .from("returns")
      .select("id, status")
      .eq("order_id", orderRow.id as string)
      .in("status", ACTIVE_RETURN_STATUSES);
    if (error) {
      if (isMissingTable(error.message)) {
        return bad("Returns aren't set up yet. Run supabase/returns.sql in the SQL Editor.", 500);
      }
      return bad(error.message, 500);
    }
    if (existing && existing.length > 0) {
      return bad("There is already an active return for this order.", 409, "active_exists");
    }
  }

  // ── Match requested items against the order's real items; recompute refund ──
  type OrderItemRow = {
    product_id: string | null; product_name: string | null;
    price: number; quantity: number; color: string | null; size: string | null;
  };
  const orderItems = (orderRow.order_items ?? []) as OrderItemRow[];
  const returnItems: ReturnItem[] = [];
  let refund = 0;
  const usedIdx = new Set<number>();

  for (const it of itemsIn) {
    const idx = orderItems.findIndex(
      (oi, i) =>
        !usedIdx.has(i) &&
        (oi.product_id ?? null) === (it.productId ?? null) &&
        (oi.color ?? null) === (it.color ?? null) &&
        (oi.size ?? null) === (it.size ?? null)
    );
    if (idx === -1) return bad("An item in your request doesn't match this order.");
    const oi = orderItems[idx];
    if (it.quantity > oi.quantity) return bad(`You can return at most ${oi.quantity} of "${oi.product_name}".`);
    usedIdx.add(idx);
    refund += Number(oi.price) * it.quantity;
    returnItems.push({
      product_id: oi.product_id,
      product_name: oi.product_name ?? "Product",
      quantity: it.quantity,
      price: Number(oi.price),
      color: oi.color,
      size: oi.size,
    });
  }

  // Full-order return → shipping is refunded too (consumer-rights law).
  // Every order line was matched (usedIdx covers all) with its full quantity.
  const fullReturn =
    usedIdx.size === orderItems.length &&
    orderItems.every((oi) =>
      returnItems.some(
        (ri) => ri.product_id === oi.product_id && ri.color === oi.color && ri.size === oi.size && ri.quantity === oi.quantity
      )
    );
  if (fullReturn) refund += Number(orderRow.shipping ?? 0);
  refund = Math.round(refund * 100) / 100;

  // ── Create the return ──
  const returnNumber = `RTN-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(
    Math.random() * 36
  ).toString(36).toUpperCase()}`;
  const locale = (orderRow.locale as string) || "en";

  const { error: insErr } = await admin.from("returns").insert({
    return_number: returnNumber,
    order_id: orderRow.id as string,
    order_number: orderNumber,
    user_id: user.id,
    email: (orderRow.email as string) || user.email || "",
    locale,
    status: "requested",
    items: returnItems,
    reason,
    description: description || null,
    photos,
    iban,
    refund_amount: refund,
  });
  if (insErr) {
    if (isMissingTable(insErr.message)) {
      return bad("Returns aren't set up yet. Run supabase/returns.sql in the SQL Editor.", 500);
    }
    if (/duplicate key|unique/i.test(insErr.message)) {
      return bad("There is already an active return for this order.", 409, "active_exists");
    }
    return bad(insErr.message, 500);
  }

  await sendReturnEmail((orderRow.email as string) || user.email || "", locale, "requested", {
    name: (orderRow.first_name as string) || "there",
    returnNum: returnNumber,
    orderNum: orderNumber,
    amount: refund,
  });

  return NextResponse.json({ ok: true, returnNumber, refundAmount: refund });
}

export async function PATCH(req: NextRequest) {
  // Customer cancels their own request (only while still "requested").
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return bad("Cross-origin request rejected", 403);
  }

  const verified = await requireVerifiedSession();
  if (verified instanceof NextResponse) return verified;
  const user = verified;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return bad("Missing return id");

  const admin = createSupabaseAdminClient();
  if (!admin) return bad("Returns are temporarily unavailable.", 500);

  const { data: row, error } = await admin
    .from("returns")
    .select("id, user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (error) return bad(isMissingTable(error.message) ? "Returns aren't set up yet." : error.message, 500);
  if (!row || row.user_id !== user.id) return bad("Return not found", 404);
  if (row.status !== "requested") {
    return bad("This return can no longer be cancelled — please contact us.", 409, "cancel_too_late");
  }

  const { error: updErr } = await admin
    .from("returns")
    .update({ status: "cancelled", updated_at: new Date().toISOString(), resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) return bad(updErr.message, 500);

  return NextResponse.json({ ok: true });
}
