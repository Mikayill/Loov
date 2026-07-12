/** /api/admin/orders — list all orders / change status. Admin only. */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildStatusMessage, type OrderStatusKey } from "@/lib/i18n/orderMessages";
import { renderEmailHtml, EMAIL_FROM } from "@/lib/email/render";
import { getSettings } from "@/lib/db/settings";
import { reverseOrderLoyalty, restoreOrderLoyalty } from "@/lib/loyaltyReversal";
import { adjustPromoUse } from "@/lib/promoValidation";
import type { Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

/**
 * Allowed status moves — stops nonsensical jumps (e.g. delivered → pending)
 * that would desync the delivered_at stamp / return window. Forward progress,
 * sensible corrections back one step, cancel from any live state, and
 * reactivating a cancelled order are all permitted.
 */
const TRANSITIONS: Record<string, string[]> = {
  pending:    ["processing", "shipped", "delivered", "cancelled"],
  processing: ["pending", "shipped", "delivered", "cancelled"],
  shipped:    ["processing", "delivered", "cancelled"],
  delivered:  ["shipped", "cancelled"],
  cancelled:  ["pending", "processing"],
};

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

/** Status-update email via Resend. Failures never block the status change. */
async function sendStatusEmail(
  to: string,
  locale: string,
  name: string,
  orderNum: string,
  status: OrderStatusKey,
  deliveryDays: string
) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  try {
    const msg = buildStatusMessage(locale as Locale, status, { name, orderNum, deliveryDays });
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
      console.warn("[admin/orders] status email failed:", res.status, (await res.text()).slice(0, 200));
    }
  } catch (e) {
    console.warn("[admin/orders] status email failed:", (e as Error).message);
  }
}

export async function GET(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const status = new URL(req.url).searchParams.get("status");

  let query = admin
    .from("orders")
    .select(
      "id, order_number, status, first_name, last_name, email, phone, street, city, district, region, zip, notes, gift_wrap, gift_message, locale, total, subtotal, shipping, shipping_method, promo_code, promo_discount, created_at, order_items(product_id, product_name, quantity, price, color, size, bundle_slug, bundle_name)"
    )
    .order("created_at", { ascending: false });
  if (status && STATUSES.includes(status)) query = query.eq("status", status);

  let { data, error } = await query;
  // promo_code/promo_discount/bundle_slug/bundle_name need supabase/discounts.sql —
  // retry without them so the admin panel still works before it's run.
  if (error && /promo_|bundle_/.test(error.message)) {
    let fallbackQuery = admin
      .from("orders")
      .select(
        "id, order_number, status, first_name, last_name, email, phone, street, city, district, region, zip, notes, gift_wrap, gift_message, locale, total, subtotal, shipping, shipping_method, created_at, order_items(product_id, product_name, quantity, price, color, size)"
      )
      .order("created_at", { ascending: false });
    if (status && STATUSES.includes(status)) fallbackQuery = fallbackQuery.eq("status", status);
    const fallback = await fallbackQuery;
    data = fallback.data as typeof data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const orders = data ?? [];

  // Product lookup (photo + slug) so the admin can SEE what to pack and jump
  // straight to the product page.
  const productIds = [
    ...new Set(
      orders.flatMap((o) =>
        ((o.order_items ?? []) as { product_id: string | null }[])
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

  return NextResponse.json({ orders, products: productMap });
}

export async function PATCH(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const { id, status } = body ?? {};
  if (!id || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid order or status" }, { status: 400 });
  }

  // Read the current status + items so we can keep stock, loyalty points and
  // the promo usage counter in sync with cancellations.
  let read = await admin
    .from("orders")
    .select("status, email, first_name, locale, promo_code, order_items(product_id, quantity)")
    .eq("id", id)
    .single();
  // promo_code column needs supabase/discounts.sql — retry without it.
  if (read.error && /promo_code/i.test(read.error.message)) {
    read = (await admin
      .from("orders")
      .select("status, email, first_name, locale, order_items(product_id, quantity)")
      .eq("id", id)
      .single()) as typeof read;
  }
  const { data: current, error: readErr } = read;
  if (readErr || !current) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const oldStatus = current.status as string;

  // No-op (same status) → nothing to do. Otherwise enforce the transition map.
  if (status === oldStatus) return NextResponse.json({ ok: true });
  if (!(TRANSITIONS[oldStatus] ?? []).includes(status)) {
    return NextResponse.json(
      { error: `Can't move an order from "${oldStatus}" to "${status}".` },
      { status: 400 }
    );
  }

  const items = (current.order_items ?? []).map((it: { product_id: string; quantity: number }) => ({
    id: it.product_id, qty: it.quantity,
  }));

  if (status !== oldStatus && items.length > 0) {
    if (status === "cancelled") {
      // Cancelling → give the reserved stock back.
      await admin.rpc("release_stock", { p_items: items });
    } else if (oldStatus === "cancelled") {
      // Un-cancelling → take the stock again; refuse if it's no longer available.
      const { error: rErr } = await admin.rpc("reserve_stock", { p_items: items });
      if (rErr && /INSUFFICIENT_STOCK/.test(rErr.message)) {
        return NextResponse.json({ error: "Not enough stock to reactivate this order." }, { status: 409 });
      }
    }
  }

  // Loyalty + promo bookkeeping — mirrors the customer cancel flow so an
  // admin cancel never eats the customer's redeemed points, never lets
  // earned points survive, and keeps the promo usage counter honest.
  const promoCode = ("promo_code" in current ? (current.promo_code as string | null) : null) ?? null;
  if (status === "cancelled") {
    await reverseOrderLoyalty(admin, String(id));
    if (promoCode) await adjustPromoUse(admin, promoCode, -1);
  } else if (oldStatus === "cancelled") {
    await restoreOrderLoyalty(admin, String(id));
    if (promoCode) await adjustPromoUse(admin, promoCode, 1);
  }

  // Delivered → stamp delivered_at (starts the 14-day return window).
  // The column comes from returns.sql — retry without it if not migrated yet.
  const patch: Record<string, unknown> = { status };
  if (status === "delivered") patch.delivered_at = new Date().toISOString();
  let updated = await admin
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("order_number")
    .single();
  if (updated.error && /delivered_at/i.test(updated.error.message)) {
    updated = await admin.from("orders").update({ status }).eq("id", id).select("order_number").single();
  }
  const { data, error } = updated;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit({
    actorEmail: guard.email,
    action: "order.status",
    entity: "order",
    entityId: data?.order_number ?? String(id),
    detail: { status },
  });

  // Item 13: tell the customer what happened (only on a REAL change; pending
  // has its own confirmation email from checkout).
  if (status !== oldStatus && status !== "pending") {
    const settings = await getSettings();
    await sendStatusEmail(
      (current.email as string) ?? "",
      (current.locale as string) || "en",
      (current.first_name as string) || "there",
      data?.order_number ?? "",
      status as OrderStatusKey,
      `${settings.deliveryMinDays}–${settings.deliveryMaxDays}`
    );
  }

  return NextResponse.json({ ok: true });
}
