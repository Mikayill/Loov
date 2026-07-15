import type { Product } from "@/types";

/**
 * Real remaining stock for one exact (size, color) combo.
 *  - If the admin has set a per-variant count for this size+color in
 *    `stockByVariant` (products.stock_by_variant), that number is authoritative.
 *  - Otherwise falls back to the product's flat `stock` — today's behavior,
 *    so nothing breaks until the admin fills in real per-variant numbers.
 *  - `null` means untracked/unlimited (never blocks).
 */
export function variantStock(product: Product, size: string, color: string): number | null {
  const perVariant = product.stockByVariant?.[size]?.[color];
  if (typeof perVariant === "number") return perVariant;
  return product.stock ?? null;
}

/**
 * Whether ANY (size, color) combo of this product still has stock — for
 * card-level "sold out" gates that haven't had a specific variant chosen yet.
 * Never gate on the flat `stock` column alone: with per-variant tracking in
 * use, flat `stock` can sit at 0 while every tracked variant still has units.
 */
export function hasAnyStock(product: Product): boolean {
  if (product.sizes.length === 0 || product.colors.length === 0) {
    return product.stock == null || product.stock > 0;
  }
  for (const size of product.sizes) {
    for (const color of product.colors) {
      const s = variantStock(product, size, color);
      if (s === null || s > 0) return true;
    }
  }
  return false;
}

/**
 * First (size, color) combo that actually has stock — for bulk "add all"
 * flows that need to pick something without asking (unlike a single
 * product's Add to Cart, which always prompts when there's more than one
 * variant). Returns null only when hasAnyStock() would also be false.
 */
export function firstAvailableVariant(product: Product): { size: string; color: string } | null {
  const sizes = product.sizes.length ? product.sizes : [""];
  const colors = product.colors.length ? product.colors : [""];
  for (const size of sizes) {
    for (const color of colors) {
      const s = variantStock(product, size, color);
      if (s === null || s > 0) return { size, color };
    }
  }
  return null;
}
