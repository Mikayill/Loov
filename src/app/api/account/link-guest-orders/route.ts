/**
 * POST /api/account/link-guest-orders — attach a signed-in user's earlier
 * GUEST orders (placed with the same, now email-confirmed, address) to their
 * account and credit the loyalty points those orders earned.
 *
 * Why this and NOT a localStorage migration: guest points in the browser are
 * client-controlled and could be fabricated, so copying them into a spendable
 * DB balance would be an exploit. Here every credited point is recomputed
 * server-side from the REAL order total, and orders are matched by an email
 * the user has proven they control (signup confirmation), so nothing can be
 * gamed. Idempotent: an order already linked or already credited is skipped.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/db/settings";
import { pointsForAmountAt } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function POST() {
  const server = await createSupabaseServerClient();
  const { data: userData } = await server.auth.getUser();
  const user = userData?.user;
  const email = user?.email;
  // Only proceed for a confirmed email — that's the proof of ownership.
  if (!user || !email || !user.email_confirmed_at) {
    return NextResponse.json({ linked: 0, pointsCredited: 0 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ linked: 0, pointsCredited: 0 });

  // Guest orders on this email (not already owned by an account, not cancelled).
  const { data: orders, error } = await admin
    .from("orders")
    .select("id, total, status")
    .is("user_id", null)
    .ilike("email", email)
    .neq("status", "cancelled");
  if (error || !orders || orders.length === 0) {
    return NextResponse.json({ linked: 0, pointsCredited: 0 });
  }

  const settings = await getSettings();
  const orderIds = orders.map((o) => o.id as string);

  // Claim them for the account.
  await admin.from("orders").update({ user_id: user.id }).in("id", orderIds);

  // Credit points only for orders that don't already have a ledger row.
  const { data: existingTx } = await admin
    .from("loyalty_transactions")
    .select("order_id")
    .in("order_id", orderIds);
  const alreadyCredited = new Set((existingTx ?? []).map((t) => t.order_id as string));

  let pointsCredited = 0;
  const rows: { user_id: string; order_id: string; delta: number; reason: string }[] = [];
  for (const o of orders) {
    if (alreadyCredited.has(o.id as string)) continue;
    // Base-tier rate (no multiplier) — conservative, can't over-credit.
    const pts = pointsForAmountAt(Number(o.total) || 0, settings.pointsPerGel);
    if (pts > 0) {
      rows.push({ user_id: user.id, order_id: o.id as string, delta: pts, reason: "order" });
      pointsCredited += pts;
    }
  }
  if (rows.length > 0) {
    const { error: insErr } = await admin.from("loyalty_transactions").insert(rows);
    if (insErr) {
      // Table missing / write issue — orders are still linked, points can be re-run later.
      console.warn("[link-guest-orders] point credit failed:", insErr.message);
      return NextResponse.json({ linked: orderIds.length, pointsCredited: 0 });
    }
  }

  return NextResponse.json({ linked: orderIds.length, pointsCredited });
}
