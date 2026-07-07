/**
 * Cart promo codes — single source of truth shared by the cart/checkout UI
 * AND the server (`/api/orders`). The server re-resolves the code itself
 * from here and recomputes the discount — it never trusts a client-sent
 * amount, same rule as loyalty points (`src/lib/loyalty.ts`).
 */
import type { TranslationKey } from "./i18n/dictionaries";

export type PromoType = "percent" | "shipping";

export interface PromoDef {
  type: PromoType;
  /** Percent off (for "percent") — unused for "shipping". */
  value: number;
  labelKey: TranslationKey;
}

export const PROMO_CODES: Record<string, PromoDef> = {
  LOOV10:    { type: "percent",  value: 10, labelKey: "cart.promo10" },
  YENIDOGAN: { type: "percent",  value: 15, labelKey: "cart.promo15" },
  HEDIYE:    { type: "shipping", value: 0,  labelKey: "cart.promoFreeShip" },
};

/** Case/whitespace-insensitive lookup. Returns null for an unknown code. */
export function resolvePromo(code: string): PromoDef | null {
  return PROMO_CODES[code.trim().toUpperCase()] ?? null;
}

/** Gel amount a percent-off promo takes off the given subtotal (0 for a shipping promo — that's a shipping-cost change, not a subtotal one). */
export function promoDiscountAmount(promo: PromoDef | null, subtotal: number): number {
  if (!promo || promo.type !== "percent") return 0;
  return Math.round(subtotal * (promo.value / 100));
}
