/**
 * Seasonal logic — which season we're in, and how products sort by season.
 * Georgia (northern hemisphere): warm months ≈ Apr–Sep, cold months ≈ Oct–Mar.
 */

import type { Product, Season } from "@/types";

export const SEASON_META: Record<Season, { label: string; emoji: string }> = {
  all: { label: "All season", emoji: "🗓️" },
  spring: { label: "Spring", emoji: "🌸" },
  summer: { label: "Summer", emoji: "☀️" },
  autumn: { label: "Autumn", emoji: "🍂" },
  winter: { label: "Winter", emoji: "❄️" },
};

/** The current shopping season based on the month (meteorological seasons). */
export function currentSeason(date = new Date()): Exclude<Season, "all"> {
  const m = date.getMonth(); // 0 = Jan
  if (m >= 2 && m <= 4) return "spring"; // Mar–May
  if (m >= 5 && m <= 7) return "summer"; // Jun–Aug
  if (m >= 8 && m <= 10) return "autumn"; // Sep–Nov
  return "winter"; // Dec–Feb
}

/** True when the product suits the given (or current) season. "all" always fits. */
export function matchesSeason(product: Pick<Product, "season">, season = currentSeason()): boolean {
  const s = product.season ?? "all";
  return s === "all" || s === season;
}

/**
 * Sort a copy of the list so in-season items surface first, then all-season,
 * then off-season — preserving the original order within each group.
 */
export function sortBySeason<T extends Pick<Product, "season">>(
  products: T[],
  season = currentSeason()
): T[] {
  const rank = (p: T) => {
    const s = p.season ?? "all";
    if (s === season) return 0;
    if (s === "all") return 1;
    return 2;
  };
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map(({ p }) => p);
}
