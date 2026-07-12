/**
 * Attribute-label localization ("etiket mantığı", FAZ 8).
 *
 * The admin enters canonical ENGLISH values (colors, sizes, fabrics, …) and
 * the storefront displays them in the visitor's language via these helpers.
 *
 * ⚠️ DISPLAY ONLY. Canonical strings must keep flowing through state, filter
 * predicates, Map keys (`sizeColors[size]`, `sizePrices`), cart identity and
 * API payloads — never feed a localized label back into logic.
 *
 * Every helper takes `t`, so it works with both `getT()` (Server Components)
 * and `useLocale()` (client components). Unknown tokens fall back to the raw
 * string, so a new free-form admin value degrades to English, never breaks.
 */

import type { TranslationKey } from "./dictionaries";
import type { Product, Season } from "@/types";

type T = (key: TranslationKey) => string;

/* ── Colors ────────────────────────────────────────────────── */

/** Canonical (lowercase) color keys this store recognizes. Exported so
 *  src/lib/catalogTags.ts can validate admin-entered colors against the
 *  same set this label layer knows how to translate. */
export const COLOR_KEYS: Record<string, TranslationKey> = {
  "white": "label.color.white",
  "cream": "label.color.cream",
  "beige": "label.color.beige",
  "sand": "label.color.sand",
  "sage": "label.color.sage",
  "sky blue": "label.color.skyBlue",
  "blue": "label.color.blue",
  "lavender": "label.color.lavender",
  "blush": "label.color.blush",
  "grey": "label.color.grey",
  "gray": "label.color.grey",
  "golden": "label.color.golden",
  "mint": "label.color.mint",
  "pastel rainbow": "label.color.pastelRainbow",
  "neutral rainbow": "label.color.neutralRainbow",
};

/** "White" → localized; "White & Sage" → both parts localized; unknown → raw. */
export function colorLabel(color: string, t: T): string {
  return color
    .split(" & ")
    .map((part) => {
      const key = COLOR_KEYS[part.trim().toLowerCase()];
      return key ? t(key) : part;
    })
    .join(" & ");
}

/* ── Sizes ─────────────────────────────────────────────────── */

/**
 * "0-3 Months" → "{a}–{b} <localized months>", "1-2 Years" likewise;
 * "One Size"/"Newborn" mapped; cm / numeric (shoe) sizes pass through.
 */
export function sizeLabel(size: string, t: T): string {
  const months = size.match(/^(\d+)\s*[-–]\s*(\d+)\s*Months?$/i);
  if (months) {
    return t("label.size.monthsRange").replace("{a}", months[1]).replace("{b}", months[2]);
  }
  const years = size.match(/^(\d+)\s*[-–]\s*(\d+)\s*Years?$/i);
  if (years) {
    return t("label.size.yearsRange").replace("{a}", years[1]).replace("{b}", years[2]);
  }
  if (/^one size$/i.test(size.trim())) return t("label.size.oneSize");
  if (/^newborn$/i.test(size.trim())) return t("label.size.newborn");
  return size; // "90×90 cm", shoe numbers, "Standard", …
}

/* ── Categories ────────────────────────────────────────────── */

export function categoryLabel(cat: Product["category"], t: T): string {
  return t(`label.cat.${cat}` as TranslationKey);
}

export function categoryPlural(cat: Product["category"], t: T): string {
  return t(`label.catPl.${cat}` as TranslationKey);
}

/* ── Fabrics / seasons ─────────────────────────────────────── */

const FABRICS = new Set(["cotton", "muslin", "bamboo", "terry", "fleece", "wool", "other"]);

export function fabricLabel(slug: string, t: T): string {
  return FABRICS.has(slug) ? t(`label.fabric.${slug}` as TranslationKey) : slug;
}

export function seasonLabel(season: Season, t: T): string {
  return t(`label.season.${season}` as TranslationKey);
}

/* ── Order / return statuses (canonical codes stay in payloads) ── */

export function orderStatusLabel(
  status: "Delivered" | "Shipped" | "Processing" | "Cancelled" | string,
  t: T
): string {
  const key = `label.orderStatus.${status.toLowerCase()}` as TranslationKey;
  const out = t(key);
  return out === key ? status : out;
}

export function returnStatusLabel(status: string, t: T): string {
  const key = `label.returnStatus.${status}` as TranslationKey;
  const out = t(key);
  return out === key ? status : out;
}

export function returnReasonLabel(code: string, t: T): string {
  const key = `label.returnReason.${code}` as TranslationKey;
  const out = t(key);
  return out === key ? code : out;
}

/* ── Loyalty tiers ─────────────────────────────────────────── */

export function tierName(id: "bronze" | "silver" | "gold" | string, t: T): string {
  const key = `label.tier.${id}` as TranslationKey;
  const out = t(key);
  return out === key ? id : out;
}

/**
 * Loyalty tier perks (src/lib/loyalty.ts tiersFor()) are canonical English
 * strings GENERATED from admin settings, so we translate the two patterns
 * rather than exact strings. Unknown perk text falls back to the raw string.
 */
export function perkLabel(perk: string, t: T): string {
  // "{n} points per 1 ₾" — n follows the admin-set pointsPerGel.
  const rate = /^([\d.]+) points per 1 ₾$/.exec(perk);
  if (rate) return t("label.perk.pointsRateN").replace("{n}", rate[1]);
  // "+{n}% bonus points" — n follows the admin-set tier multiplier.
  const bonus = /^\+(\d+)% bonus points$/.exec(perk);
  if (bonus) return t("label.perk.bonusN").replace("{n}", bonus[1]);
  return perk;
}
