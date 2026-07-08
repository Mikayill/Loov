/**
 * POST /api/orders — create an order (guest or logged-in).
 *
 * Security notes:
 * - Prices are NEVER trusted from the client: each item price is re-read from the
 *   products table and totals are recomputed server-side.
 * - Same-origin check (Origin vs Host) blocks cross-site form posts (CSRF).
 * - Input is validated with the same Georgian phone/postal patterns the UI uses.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PHONE_PATTERN, POSTAL_CODE_PATTERN } from "@/lib/georgia";
import { buildOrderMessage } from "@/lib/i18n/orderMessages";
import type { Locale } from "@/lib/i18n/config";
import {
  REDEEM_BLOCK,
  GEL_PER_BLOCK,
  MAX_DISCOUNT_RATIO,
  tierForAt,
  tiersFromSettings,
  pointsForAmountAt,
} from "@/lib/loyalty";
import { getSettings } from "@/lib/db/settings";
import { effectivePrice } from "@/lib/pricing";
import { promoDiscountAmount } from "@/lib/promo";
import { validatePromoServer, recordPromoUse } from "@/lib/promoValidation";
import { priceCartWithBundles, type BundleGroupLine, type BundleDef } from "@/lib/bundlePricing";

/** Fire the confirmation email via Resend. Failures never block the order. */
async function sendOrderEmail(to: string, locale: string, name: string, orderNum: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const msg = buildOrderMessage(locale as Locale, { name, orderNum });
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // TODO: switch to orders@loov.ge once the domain is verified in Resend.
        from: "Loov <onboarding@resend.dev>",
        to: [to],
        subject: msg.subject,
        text: msg.email,
      }),
    });
    if (!res.ok) {
      console.warn("[orders] email send failed:", res.status, (await res.text()).slice(0, 200));
    }
  } catch (e) {
    console.warn("[orders] email send failed:", (e as Error).message);
  }
}

const phoneRe = new RegExp(`^${PHONE_PATTERN}$`);
const postalRe = new RegExp(`^${POSTAL_CODE_PATTERN}$`);
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface OrderItemInput {
  productId: string;
  color: string;
  size: string;
  quantity: number;
  /** Set when added via "Add Bundle to Cart" — which bundle this line came from. */
  bundleSlug?: string;
}

interface OrderInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  region: string;
  district?: string;
  city: string;
  zip?: string;
  notes?: string;
  shipping: "standard" | "express";
  giftWrap?: boolean;
  giftMessage?: string;
  locale?: string;
  /** Loov Rewards points to redeem (whole blocks of REDEEM_BLOCK). */
  redeemPoints?: number;
  /** Cart promo code — re-resolved and validated server-side, see src/lib/promo.ts. */
  promoCode?: string;
  items: OrderItemInput[];
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  // ── CSRF: only accept same-origin requests ──
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return bad("Cross-origin request rejected", 403);
  }

  let body: OrderInput;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  // ── Validate ──
  if (!body.firstName?.trim() || !body.lastName?.trim()) return bad("Name is required");
  if (!body.email?.trim() || !emailRe.test(body.email.trim())) return bad("Valid email required");
  const phone = (body.phone ?? "").replace(/\s/g, "");
  if (!phone || !phoneRe.test(phone)) return bad("Valid Georgian phone required");
  if (!body.street?.trim()) return bad("Street address required");
  if (!body.region?.trim()) return bad("Region required");
  if (!body.city?.trim()) return bad("City required");
  if (body.zip?.trim() && !postalRe.test(body.zip.trim())) return bad("Postal code must be 4 digits");
  if (body.shipping !== "standard" && body.shipping !== "express") return bad("Invalid shipping method");
  if (!Array.isArray(body.items) || body.items.length === 0) return bad("Order has no items");
  if (body.items.length > 50) return bad("Too many items");
  for (const it of body.items) {
    if (
      !it.productId ||
      typeof it.quantity !== "number" ||
      !Number.isInteger(it.quantity) ||
      it.quantity < 1 ||
      it.quantity > 99 ||
      (it.bundleSlug !== undefined && typeof it.bundleSlug !== "string")
    ) {
      return bad("Invalid order item");
    }
  }
  // Promo codes are validated further down (needs the signed-in user + the
  // service client — codes live in the promo_codes table, members only).

  const supabase = await createSupabaseServerClient();

  // ── Re-price server-side from the DB (never trust client prices) ──
  const ids = [...new Set(body.items.map((i) => i.productId))];
  const firstTry = await supabase
    .from("products")
    .select("id, slug, name, price, discount_percent, size_prices")
    .in("id", ids);
  let products: unknown[] | null = firstTry.data;
  let prodErr = firstTry.error;
  // size_prices column missing (supabase/size-prices.sql not run yet) →
  // fall back to base pricing so orders NEVER fail on a missing migration.
  if (prodErr && /size_prices/i.test(prodErr.message)) {
    console.warn("[orders] size_prices column missing — run supabase/size-prices.sql. Using base prices.");
    const retry = await supabase
      .from("products")
      .select("id, slug, name, price, discount_percent")
      .in("id", ids);
    products = retry.data;
    prodErr = retry.error;
  }
  if (prodErr) return bad("Could not verify products", 500);
  interface PriceRow {
    id: string;
    slug: string;
    name: string;
    price: number;
    discount_percent?: number | null;
    size_prices?: Record<string, number> | null;
  }
  const byId = new Map(
    ((products ?? []) as PriceRow[]).map((p) => [String(p.id), p])
  );
  for (const it of body.items) {
    if (!byId.has(it.productId)) return bad(`Unknown product: ${it.productId}`);
  }
  // The DISCOUNTED per-size unit price the customer actually pays — computed
  // server-side so a client can never spoof the discount OR the size price.
  const unitPriceOf = (it: OrderItemInput): number => {
    const p = byId.get(it.productId)!;
    return effectivePrice(
      {
        price: Number(p.price),
        discountPercent: Number(p.discount_percent) || 0,
        sizePrices: p.size_prices ?? undefined,
      },
      it.size || undefined
    );
  };
  const keyOf = (it: OrderItemInput, i: number) => `${it.productId}::${it.color}::${it.size}::${i}`;

  // ── Bundle pricing (never trust the client's bundleSlug tag alone — the
  //    group must exactly match a REAL active bundle's item list). ──
  const bundleSlugs = [...new Set(body.items.map((i) => i.bundleSlug).filter((s): s is string => !!s))];
  let bundleDefs: BundleDef[] = [];
  const bundleNameBySlug = new Map<string, string>();
  if (bundleSlugs.length > 0) {
    const { data: bundleRows, error: bundleErr } = await supabase
      .from("bundles")
      .select("slug, name, items, bundle_price")
      .in("slug", bundleSlugs)
      .eq("active", true);
    if (bundleErr) {
      console.warn("[orders] bundles table unavailable — run supabase/bundles.sql. Bundle groups priced individually.", bundleErr.message);
    } else {
      bundleDefs = (bundleRows ?? []).map((b) => ({
        slug: String(b.slug),
        items: Array.isArray(b.items) ? b.items : [],
        bundlePrice: Number(b.bundle_price),
      }));
      for (const b of bundleRows ?? []) bundleNameBySlug.set(String(b.slug), String(b.name));
    }
  }
  const bundleLines: BundleGroupLine[] = body.items.map((it, i) => ({
    key: keyOf(it, i),
    productSlug: byId.get(it.productId)!.slug,
    unitPrice: unitPriceOf(it),
    quantity: it.quantity,
    bundleSlug: it.bundleSlug,
  }));
  const priced = priceCartWithBundles(bundleLines, bundleDefs);

  // Store-wide settings (free-shipping threshold + points rate). Falls back to
  // sensible defaults if the settings table isn't set up yet.
  const settings = await getSettings();

  const subtotal = priced.subtotal;

  // ── Attach the user if they're logged in (guests stay null) ──
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;
  // `admin` bypasses RLS — needed for promo lookup, loyalty and stock below.
  const admin = createSupabaseAdminClient();

  // ── Promo code (DB-backed, members only, expiry + usage limits) ──
  let resolvedPromo: { code: string; type: "percent" | "shipping"; value: number; rowId: string } | null = null;
  if (body.promoCode) {
    if (!admin) return bad("Promo codes are temporarily unavailable", 500);
    const check = await validatePromoServer(admin, body.promoCode, userId);
    if (check.error === "signin") return bad("Promo codes require an account — please sign in");
    if (check.error === "expired") return bad("This promo code has expired");
    if (check.error === "limit") return bad("This promo code has reached its usage limit");
    if (check.error === "used") return bad("You've already used this promo code");
    if (check.error || !check.promo) return bad("Invalid promo code");
    resolvedPromo = check.promo;
  }

  // ── Promo discount (percent off subtotal, or free shipping) ──
  const promoDiscount = promoDiscountAmount(resolvedPromo, subtotal);
  const promoShippingFree = resolvedPromo?.type === "shipping";
  const postPromoSubtotal = subtotal - promoDiscount;

  // Express must actually be offered (admin can turn it off in /admin/settings).
  if (body.shipping === "express" && !settings.expressEnabled) {
    return bad("Express delivery is currently unavailable");
  }
  // Express is always charged; the free-shipping threshold applies to standard only.
  const shippingCost =
    body.shipping === "express"
      ? settings.expressPrice
      : promoShippingFree || postPromoSubtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingPrice;
  const giftWrapCost = body.giftWrap ? 5 : 0;

  // ── Loov Rewards redemption (server-side rules, never trust the client) ──
  let redeemPoints = Number(body.redeemPoints) || 0;
  if (redeemPoints < 0 || !Number.isInteger(redeemPoints) || redeemPoints % REDEEM_BLOCK !== 0) {
    return bad("Invalid points amount");
  }
  const maxByOrder =
    Math.floor((postPromoSubtotal * MAX_DISCOUNT_RATIO) / GEL_PER_BLOCK) * REDEEM_BLOCK;
  redeemPoints = Math.min(redeemPoints, maxByOrder);

  // Points can ONLY be redeemed by a signed-in user whose DB balance covers it.
  // Guests have no server-verifiable balance (their "points" are cosmetic,
  // localStorage-only), so redemption is refused for them — otherwise anyone
  // could send `redeemPoints` and get up to MAX_DISCOUNT_RATIO off for free.
  let ledger: "db" | "local" = "local";
  let lifetimeEarned = 0;
  if (userId && admin) {
    const { data: txRows, error: txErr } = await admin
      .from("loyalty_transactions")
      .select("delta, reason")
      .eq("user_id", userId);
    if (!txErr) {
      ledger = "db";
      const rows = (txRows ?? []).map((r) => ({ delta: Number(r.delta), reason: String(r.reason ?? "order") }));
      // Return adjustments never count toward the tier: a restored redemption
      // (positive "return" row) isn't newly earned points.
      lifetimeEarned = rows
        .filter((r) => r.delta > 0 && r.reason !== "return")
        .reduce((s, r) => s + r.delta, 0);
      const balance = rows.reduce((s, r) => s + r.delta, 0);
      if (redeemPoints > balance) return bad("Not enough points for this redemption");
    } else {
      if (!/loyalty_transactions/.test(txErr.message)) {
        console.warn("[orders] loyalty balance check failed:", txErr.message);
      }
      redeemPoints = 0; // couldn't verify a real balance → no discount
    }
  } else {
    redeemPoints = 0; // guests cannot redeem points
  }

  const pointsDiscount = (redeemPoints / REDEEM_BLOCK) * GEL_PER_BLOCK;
  const total = Math.max(0, postPromoSubtotal + shippingCost + giftWrapCost - pointsDiscount);

  const orderNumber = `BBK-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(
    Math.random() * 36
  ).toString(36).toUpperCase()}`;

  // ── Reserve stock atomically (prevents overselling the last unit) ──
  // reserve_stock decrements each product in one transaction and rejects if any
  // item lacks stock. Called with the SERVICE ROLE (not the anon client) so the
  // stock functions can be revoked from anon — otherwise a user could call
  // release_stock to inflate stock or reserve_stock to grief inventory.
  // If the service key or migration is missing, we skip gracefully.
  const stockItems = body.items.map((it) => ({ id: it.productId, qty: it.quantity }));
  let stockReserved = false;
  if (admin) {
    const { error: rErr } = await admin.rpc("reserve_stock", { p_items: stockItems });
    if (rErr) {
      const m = rErr.message || "";
      if (/INSUFFICIENT_STOCK:(\S+)/.test(m)) {
        const badId = m.match(/INSUFFICIENT_STOCK:(\S+)/)![1];
        const name = byId.get(badId)?.name ?? "An item";
        return NextResponse.json(
          { error: `Sorry — "${name}" just sold out or doesn't have enough stock left.` },
          { status: 409 }
        );
      }
      if (/reserve_stock/.test(m)) {
        console.warn("[orders] reserve_stock missing — run supabase/stock.sql. Skipping stock guard.");
      } else {
        console.error("[orders] reserve_stock failed:", m);
        return bad("Could not verify stock — please try again", 500);
      }
    } else {
      stockReserved = true;
    }
  }

  // ── Insert order ──
  // Generate the id ourselves: RLS allows guests to INSERT but not SELECT
  // their row back, so `insert().select()` would be rejected. With a
  // pre-generated id we never need the row returned.
  const orderId = crypto.randomUUID();
  const orderRow = {
    id: orderId,
    order_number: orderNumber,
    user_id: userId,
    status: "pending",
    first_name: body.firstName.trim(),
    last_name: body.lastName.trim(),
    email: body.email.trim(),
    phone,
    street: body.street.trim(),
    region: body.region.trim(),
    district: body.district?.trim() || null,
    city: body.city.trim(),
    zip: body.zip?.trim() || null,
    notes: body.notes?.trim() || null,
    shipping_method: body.shipping,
    gift_wrap: !!body.giftWrap,
    gift_message: body.giftWrap ? body.giftMessage?.trim() || null : null,
    locale: body.locale || "en",
    subtotal,
    shipping: shippingCost,
    total,
  };
  // Loyalty + promo columns live in migrations that may not be run yet
  // (supabase/loyalty.sql, supabase/discounts.sql) — retry without whichever
  // is missing so orders never fail on an unapplied migration.
  let { error: orderErr } = await supabase
    .from("orders")
    .insert({
      ...orderRow,
      points_redeemed: redeemPoints,
      points_discount: pointsDiscount,
      promo_code: resolvedPromo ? body.promoCode : null,
      promo_discount: promoDiscount,
    });
  if (orderErr && /promo_/.test(orderErr.message)) {
    console.warn("[orders] promo columns missing — run supabase/discounts.sql. Saving without them.");
    ({ error: orderErr } = await supabase
      .from("orders")
      .insert({ ...orderRow, points_redeemed: redeemPoints, points_discount: pointsDiscount }));
  }
  if (orderErr && /points_/.test(orderErr.message)) {
    console.warn("[orders] loyalty columns missing — run supabase/loyalty.sql. Saving without them.");
    ({ error: orderErr } = await supabase.from("orders").insert(orderRow));
  }
  if (orderErr) {
    console.error("[orders] insert failed:", orderErr.message);
    if (stockReserved && admin) await admin.rpc("release_stock", { p_items: stockItems });
    return bad("Could not save order — please try again", 500);
  }

  // ── Insert items ──
  // A matched bundle group's stored `price` is its proportional share of the
  // flat bundle price (so price*quantity sums back to bundle_price across
  // the group) — never the pre-discount unit price.
  const itemRows = body.items.map((it, i) => {
    const matched = !!it.bundleSlug && priced.matchedBundles.has(it.bundleSlug);
    const lineTotal = matched ? (priced.lineTotals.get(keyOf(it, i)) ?? 0) : unitPriceOf(it) * it.quantity;
    return {
      order_id: orderId,
      product_id: it.productId,
      product_name: byId.get(it.productId)!.name,
      price: Math.round((lineTotal / it.quantity) * 100) / 100,
      quantity: it.quantity,
      color: it.color || null,
      size: it.size || null,
      bundle_slug: matched ? it.bundleSlug : null,
      bundle_name: matched ? (bundleNameBySlug.get(it.bundleSlug!) ?? null) : null,
    };
  });
  let { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
  if (itemsErr && /bundle_/.test(itemsErr.message)) {
    console.warn("[orders] bundle columns missing on order_items — run supabase/discounts.sql. Saving without them.");
    const plainRows = itemRows.map((r) => ({
      order_id: r.order_id, product_id: r.product_id, product_name: r.product_name,
      price: r.price, quantity: r.quantity, color: r.color, size: r.size,
    }));
    ({ error: itemsErr } = await supabase.from("order_items").insert(plainRows));
  }
  if (itemsErr) {
    console.error("[orders] items insert failed:", itemsErr.message);
    // Compensating action: there's no cross-table transaction here, so delete
    // the just-inserted order to avoid an empty ("orphan") order row. Guests
    // have no DELETE policy, so this needs the service-role client.
    await (admin ?? supabase).from("orders").delete().eq("id", orderId);
    if (stockReserved && admin) await admin.rpc("release_stock", { p_items: stockItems });
    return bad("Could not save order items — please try again", 500);
  }

  // ── Count the promo redemption now that the order really exists ──
  if (resolvedPromo && admin) await recordPromoUse(admin, resolvedPromo.rowId);

  // ── Loov Rewards: write the ledger for signed-in users (server-side) ──
  let pointsEarned = 0;
  if (userId && admin && ledger === "db") {
    pointsEarned = pointsForAmountAt(
      total,
      settings.pointsPerGel,
      tierForAt(lifetimeEarned, tiersFromSettings(settings))
    );
    const rows = [
      ...(redeemPoints > 0
        ? [{ user_id: userId, order_id: orderId, delta: -redeemPoints, reason: "redeem" }]
        : []),
      ...(pointsEarned > 0
        ? [{ user_id: userId, order_id: orderId, delta: pointsEarned, reason: "order" }]
        : []),
    ];
    if (rows.length > 0) {
      const { error: ledgerErr } = await admin.from("loyalty_transactions").insert(rows);
      if (ledgerErr) {
        console.warn("[orders] loyalty ledger write failed:", ledgerErr.message);
        ledger = "local";
        pointsEarned = 0;
      }
    }
  }

  // ── Confirmation email (non-blocking for the order itself) ──
  await sendOrderEmail(body.email.trim(), body.locale || "en", body.firstName.trim(), orderNumber);

  return NextResponse.json({
    ok: true,
    orderNumber,
    subtotal,
    shipping: shippingCost,
    promoDiscount,
    pointsRedeemed: redeemPoints,
    pointsDiscount,
    pointsEarned,
    ledger,
    total,
  });
}
