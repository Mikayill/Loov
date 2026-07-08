/**
 * SERVER-ONLY promo validation against the `promo_codes` table.
 * Shared by `/api/promo` (UI validation) and `/api/orders` (the real charge)
 * so the rules can never drift apart:
 *   - code must exist AND be active
 *   - not expired (expires_at)
 *   - total usage limit not reached (times_used < usage_limit)
 *   - members only: a signed-in user is required
 *   - one use per customer (counted from their non-cancelled orders)
 * Graceful when the table is missing (supabase/promos.sql not run yet):
 * every code is simply "invalid" and a warning is logged.
 */

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PromoDef, PromoError } from "@/lib/promo";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

interface PromoRow {
  id: string;
  code: string;
  type: string;
  value: number;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  active: boolean;
}

function missingTable(msg: string): boolean {
  return /relation .*promo_codes.* does not exist|promo_codes.*schema cache/i.test(msg);
}

/** Availability only (for the sign-up popup): active, not expired, limit not reached. */
export async function promoAvailable(admin: AdminClient, code: string): Promise<boolean> {
  const { data, error } = await admin
    .from("promo_codes")
    .select("expires_at, usage_limit, times_used, active")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) {
    if (missingTable(error.message)) console.warn("[promo] run supabase/promos.sql in the SQL editor");
    return false;
  }
  if (!data || !data.active) return false;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return false;
  if (data.usage_limit !== null && data.times_used >= data.usage_limit) return false;
  return true;
}

/**
 * Full check for applying a code. `userId` null/undefined = guest → "signin".
 * On success returns the PromoDef plus the row id (for the usage counter).
 */
export async function validatePromoServer(
  admin: AdminClient,
  code: string,
  userId: string | null | undefined
): Promise<{ promo?: PromoDef & { rowId: string }; error?: Exclude<PromoError, "network"> }> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "invalid" };
  if (!userId) return { error: "signin" }; // members only

  const { data, error } = await admin
    .from("promo_codes")
    .select("id, code, type, value, expires_at, usage_limit, times_used, active")
    .eq("code", normalized)
    .maybeSingle();
  if (error) {
    if (missingTable(error.message)) {
      console.warn("[promo] run supabase/promos.sql in the SQL editor");
      return { error: "invalid" };
    }
    console.warn("[promo] lookup failed:", error.message);
    return { error: "invalid" };
  }
  const row = data as PromoRow | null;
  if (!row || !row.active) return { error: "invalid" };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return { error: "expired" };
  if (row.usage_limit !== null && row.times_used >= row.usage_limit) return { error: "limit" };
  if (row.type !== "percent" && row.type !== "shipping") return { error: "invalid" };

  // One use per customer — counted from their orders (cancelled ones don't count).
  const { count, error: usedErr } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("promo_code", row.code)
    .neq("status", "cancelled");
  if (usedErr) {
    // Column missing (discounts.sql not run) → can't verify; be safe, refuse.
    console.warn("[promo] usage check failed:", usedErr.message);
    return { error: "invalid" };
  }
  if ((count ?? 0) > 0) return { error: "used" };

  return { promo: { code: row.code, type: row.type, value: Number(row.value), rowId: row.id } };
}

/**
 * Count one redemption after a successful order. Conditional so the counter
 * can never exceed the limit; best-effort (a failure is logged, never blocks
 * the order — the tiny concurrent-last-use race is accepted at this scale,
 * consistent with the loyalty-race decision).
 */
export async function recordPromoUse(admin: AdminClient, rowId: string): Promise<void> {
  try {
    const { data: row } = await admin
      .from("promo_codes")
      .select("times_used, usage_limit")
      .eq("id", rowId)
      .maybeSingle();
    if (!row) return;
    if (row.usage_limit !== null && row.times_used >= row.usage_limit) return;
    const { error } = await admin
      .from("promo_codes")
      .update({ times_used: row.times_used + 1 })
      .eq("id", rowId)
      .eq("times_used", row.times_used); // optimistic guard against double-count
    if (error) console.warn("[promo] usage counter failed:", error.message);
  } catch (e) {
    console.warn("[promo] usage counter failed:", (e as Error).message);
  }
}
