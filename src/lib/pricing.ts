/**
 * Discount + size-price + "New badge" helpers — the single source of truth
 * for how a product's price is derived. Keep every price calculation and
 * NEW badge going through here.
 *
 * Price model:
 *   base price  = size_prices[size] when set, otherwise product.price
 *   final price = base price minus discount_percent
 */

import type { Product } from "@/types";

/** The minimal shape every pricing helper needs. */
type Priceable = Pick<Product, "price" | "discountPercent"> & {
  sizePrices?: Record<string, number> | null;
};

/** The active discount percentage for a product (0 when none / invalid). */
export function discountPercent(product: Pick<Product, "discountPercent">): number {
  const pct = product.discountPercent ?? 0;
  return Number.isFinite(pct) && pct > 0 ? Math.min(90, Math.round(pct)) : 0;
}

/** Whether the product is currently discounted. */
export function isDiscounted(product: Pick<Product, "discountPercent">): boolean {
  return discountPercent(product) > 0;
}

/** Pre-discount base price for a given size (falls back to the base price). */
export function basePriceForSize(product: Priceable, size?: string): number {
  if (size && product.sizePrices) {
    const v = Number(product.sizePrices[size]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return product.price;
}

/**
 * The price the customer actually pays (after any discount), rounded to a
 * cent. Pass the selected `size` so per-size pricing applies — without it
 * the product's base price is used.
 */
export function effectivePrice(product: Priceable, size?: string): number {
  const pct = discountPercent(product);
  const base = basePriceForSize(product, size);
  if (!pct) return base;
  return Math.round(base * (1 - pct / 100) * 100) / 100;
}

/** Absolute amount saved by the discount (0 when none). */
export function savingsAmount(product: Priceable, size?: string): number {
  return Math.round((basePriceForSize(product, size) - effectivePrice(product, size)) * 100) / 100;
}

/** All distinct base prices a product can have (base + every size price). */
function allBasePrices(product: Priceable): number[] {
  const prices = [product.price];
  for (const v of Object.values(product.sizePrices ?? {})) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) prices.push(n);
  }
  return prices;
}

/** True when at least one size costs differently than the base price. */
export function hasVariablePricing(product: Priceable): boolean {
  return allBasePrices(product).some((p) => p !== product.price);
}

/** Lowest effective (discounted) price across all sizes — for "from X ₾" cards. */
export function minEffectivePrice(product: Priceable): number {
  const pct = discountPercent(product);
  const min = Math.min(...allBasePrices(product));
  if (!pct) return min;
  return Math.round(min * (1 - pct / 100) * 100) / 100;
}

/**
 * Whether to show the "New" badge.
 *  - a manual `isNew` flag always wins (a pinned new arrival), OR
 *  - the product was created within `newBadgeDays` days.
 * The day-based rule lets the badge fall off on its own as the catalog grows.
 */
export function isNewArrival(
  product: Pick<Product, "isNew" | "createdAt">,
  newBadgeDays: number
): boolean {
  if (product.isNew) return true;
  if (!product.createdAt || !Number.isFinite(newBadgeDays) || newBadgeDays <= 0) return false;
  const created = new Date(product.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const ageDays = (Date.now() - created) / 86_400_000;
  return ageDays <= newBadgeDays;
}
