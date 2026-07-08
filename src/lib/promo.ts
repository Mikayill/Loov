/**
 * Promo codes — types + pure discount math shared by the cart/checkout UI
 * AND the server (`/api/orders`).
 *
 * The codes themselves live in the `promo_codes` table (admin-managed via
 * /admin/promos; run supabase/promos.sql). Validation ALWAYS happens
 * server-side (`/api/promo` for the UI, inline in `/api/orders` for the real
 * charge) — the client never gets to assert a discount amount, same rule as
 * loyalty points (`src/lib/loyalty.ts`).
 */

export type PromoType = "percent" | "shipping";

export interface PromoDef {
  /** Canonical UPPERCASE code, echoed back by the server. */
  code: string;
  type: PromoType;
  /** Percent off (for "percent") — unused for "shipping". */
  value: number;
}

/** Why a code was refused — the UI maps these to localized messages. */
export type PromoError = "invalid" | "expired" | "limit" | "used" | "signin" | "network";

/** Gel amount a percent-off promo takes off the given subtotal (0 for a shipping promo — that's a shipping-cost change, not a subtotal one). */
export function promoDiscountAmount(promo: PromoDef | null, subtotal: number): number {
  if (!promo || promo.type !== "percent") return 0;
  return Math.round(subtotal * (promo.value / 100));
}
