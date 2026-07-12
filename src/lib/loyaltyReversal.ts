/**
 * SERVER-ONLY loyalty bookkeeping for order cancellations — shared by the
 * customer cancel flow (/api/orders PATCH) and the admin status change
 * (/api/admin/orders PATCH) so the two can never drift apart:
 *
 *   cancel:    claw back the points EARNED on the order and refund the points
 *              REDEEMED on it, both as reason "return" rows (the lifetime /
 *              tier math already excludes that reason — same as refunds).
 *   un-cancel: delete this order's "return" rows, restoring the balance to
 *              exactly what it was before the cancel.
 *
 * Idempotent: a second cancel finds the existing "return" rows and skips.
 * Best-effort: a ledger hiccup never blocks the status change itself.
 */

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

/** Reverse the ledger when an order is cancelled. Safe on guest orders (no rows). */
export async function reverseOrderLoyalty(admin: AdminClient, orderId: string): Promise<void> {
  try {
    const { data: txs } = await admin
      .from("loyalty_transactions")
      .select("user_id, delta, reason")
      .eq("order_id", orderId);
    if (!txs || txs.length === 0) return;
    if (txs.some((t) => t.reason === "return")) return; // already adjusted (cancel or refund)
    const userId = txs[0].user_id as string;
    const earned = txs.filter((t) => t.reason === "order" && Number(t.delta) > 0).reduce((s, t) => s + Number(t.delta), 0);
    const redeemed = -txs.filter((t) => t.reason === "redeem" && Number(t.delta) < 0).reduce((s, t) => s + Number(t.delta), 0);
    const rows = [
      ...(earned > 0 ? [{ user_id: userId, order_id: orderId, delta: -earned, reason: "return" }] : []),
      ...(redeemed > 0 ? [{ user_id: userId, order_id: orderId, delta: redeemed, reason: "return" }] : []),
    ];
    if (rows.length > 0) await admin.from("loyalty_transactions").insert(rows);
  } catch (e) {
    console.warn("[loyalty] cancel reversal failed:", (e as Error).message);
  }
}

/**
 * Undo the cancel bookkeeping when an admin reactivates a cancelled order.
 * Deleting the "return" strokes (rather than inserting new ones) restores the
 * balance exactly and leaves lifetime/tier math untouched.
 */
export async function restoreOrderLoyalty(admin: AdminClient, orderId: string): Promise<void> {
  try {
    await admin
      .from("loyalty_transactions")
      .delete()
      .eq("order_id", orderId)
      .eq("reason", "return");
  } catch (e) {
    console.warn("[loyalty] cancel restore failed:", (e as Error).message);
  }
}
