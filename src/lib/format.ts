/**
 * Central currency & number formatting for the Georgian market.
 *
 * Currency: Georgian Lari (GEL, symbol ₾). Prices in the catalog are whole
 * numbers, but formatPrice tolerates fractional amounts (e.g. discounts).
 *
 * Keep ALL price rendering going through these helpers so a future switch to
 * Intl / locale-aware grouping happens in exactly one place.
 */

export const CURRENCY_CODE = "GEL";
export const CURRENCY_SYMBOL = "₾";

/**
 * Format a price for display, e.g. 24 → "24 ₾", 24.5 → "24.50 ₾".
 * Uses ka-GE grouping so large numbers read naturally in-market.
 */
export function formatPrice(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(safe * 100) / 100;
  const hasFraction = rounded % 1 !== 0;
  const formatted = new Intl.NumberFormat("ka-GE", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded);
  return `${formatted} ${CURRENCY_SYMBOL}`;
}

/** Bare number without the symbol, e.g. for "× quantity" breakdowns. */
export function formatAmount(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(safe * 100) / 100;
  const hasFraction = rounded % 1 !== 0;
  return new Intl.NumberFormat("ka-GE", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded);
}
