/**
 * Baby age ↔ clothing size matching (homepage "picked for your baby" section).
 *
 * Size labels in the catalog are free text ("0-3 Months", "1-2 Years",
 * "One Size", "90×90 cm", shoe numbers…). Only explicit age ranges take part
 * in matching — everything else returns null and is excluded by design, so
 * the section only ever recommends items that actually FIT the baby.
 */

import type { Product } from "@/types";

export interface MonthRange {
  /** Inclusive months. */
  min: number;
  max: number;
}

/** "0-3 Months" → {0,3} · "1-2 Years" → {12,24} · "Newborn" → {0,1} · else null. */
export function parseSizeMonths(size: string): MonthRange | null {
  const s = size.toLowerCase();
  const months = s.match(/(\d+)\s*[-–]\s*(\d+)\s*month/);
  if (months) return { min: Number(months[1]), max: Number(months[2]) };
  const years = s.match(/(\d+)\s*[-–]\s*(\d+)\s*year/);
  if (years) return { min: Number(years[1]) * 12, max: Number(years[2]) * 12 };
  if (/newborn|\bnb\b/.test(s)) return { min: 0, max: 1 };
  return null;
}

/** Whole calendar months since birth. null for invalid/future dates. */
export function monthsOld(birthdateISO: string, now: Date = new Date()): number | null {
  const birth = new Date(birthdateISO + "T00:00:00");
  if (Number.isNaN(birth.getTime()) || birth > now) return null;
  let m =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) m -= 1;
  return Math.max(0, m);
}

/**
 * Does any size of this product fit a baby of `months`?
 * Fits when a size range covers the current age, or starts within the next
 * 3 months (room to grow — parents buy one size ahead).
 */
export function productFitsAge(product: Product, months: number): boolean {
  return product.sizes.some((size) => {
    const range = parseSizeMonths(size);
    if (!range) return false;
    const fitsNow = range.min <= months && months <= range.max;
    const growsInto = months < range.min && range.min <= months + 3;
    return fitsNow || growsInto;
  });
}

/** "Newborn" · "7 months" · "1y 3m" — human age label for section headers. */
export function ageLabel(months: number): string {
  if (months <= 0) return "Newborn";
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} years` : `${y}y ${m}m`;
}
