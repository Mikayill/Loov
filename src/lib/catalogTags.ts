/**
 * Canonical color/size tags + category starter templates.
 *
 * Colors and sizes are admin-picked from these closed(-ish) sets rather than
 * free-typed, so `colorLabel`/`sizeLabel` (src/lib/i18n/labels.ts) can always
 * translate them and per-variant stock (stock_by_variant) has a stable key
 * space. Existing product data that predates this isn't rewritten — only
 * NEW admin edits are validated against these sets (see isValidColorTag /
 * isValidSizeTag, used by api/admin/products/route.ts).
 *
 * Sizes are too category-dependent for one flat enum (age ranges vs. shoe
 * numbers vs. towel dimensions), so they're grouped, plus a "dimension"
 * pattern for things like "70×140cm" that can't be enumerated — sizeLabel()
 * already passes pure numbers/units through untranslated, so no i18n gap.
 */

/** Proper-cased canonical colors — keys mirror COLOR_KEYS in i18n/labels.ts
 *  (lowercase there for lookup; here for admin display). "Gray" is dropped
 *  as a display option since "Grey" is the same label-mapped color. */
export const CANONICAL_COLORS = [
  "White", "Cream", "Beige", "Sand", "Sage", "Sky Blue", "Blue",
  "Lavender", "Blush", "Grey", "Golden", "Mint", "Pastel Rainbow", "Neutral Rainbow",
] as const;

export const SIZE_GROUPS: Record<string, string[]> = {
  babyMonths: [
    "0-1 Month", "0-3 Months", "0-6 Months", "1-3 Months", "3-6 Months",
    "6-9 Months", "6-12 Months", "9-12 Months", "12-18 Months", "18-24 Months",
  ],
  babyYears: ["0-1 Year", "1-2 Years", "2-3 Years", "2-4 Years"],
  ageless: ["One Size", "Newborn"],
  shoes: ["16", "17", "18", "19", "20"],
};

const ALL_GROUP_SIZES = new Set(Object.values(SIZE_GROUPS).flat());

/** "70×140cm", "70x70 cm", "90×90" … — dimension sizes for towels/blankets,
 *  which can't be enumerated. Pure numbers need no translation. */
const DIMENSION_RE = /^[\d.,]+\s*(cm|mm)?\s*[x×]\s*[\d.,]+\s*(cm|mm)?$/i;

export function isCanonicalColor(color: string): boolean {
  return (CANONICAL_COLORS as readonly string[]).some((c) => c.toLowerCase() === color.trim().toLowerCase());
}

/** "White" or a two-part combo like "White & Sage" — each part must be canonical. */
export function isValidColorTag(color: string): boolean {
  const parts = color.split(" & ");
  return parts.length <= 2 && parts.every((p) => p.trim() && isCanonicalColor(p));
}

export function isValidSizeTag(size: string): boolean {
  const s = size.trim();
  return ALL_GROUP_SIZES.has(s) || DIMENSION_RE.test(s);
}

export interface CategoryTemplate {
  sizes: string[];
  colors: string[];
  fabric: string;
}

/** Category → sensible starter sizes/colors/fabric for the add-product form.
 *  Single source of truth (previously duplicated between ProductsClient.tsx
 *  and api/admin/products/route.ts). */
export const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = {
  body:      { sizes: ["0-3 Months", "3-6 Months", "6-9 Months", "9-12 Months"],                 colors: ["White", "Beige", "Sage"],       fabric: "cotton" },
  romper:    { sizes: ["0-3 Months", "3-6 Months", "6-9 Months", "9-12 Months", "12-18 Months"], colors: ["Beige", "Sage", "Blue"],        fabric: "cotton" },
  towel:     { sizes: ["70×70 cm", "90×90 cm"],                                                  colors: ["White", "Cream", "Sand"],       fabric: "terry" },
  blanket:   { sizes: ["120×120 cm"],                                                            colors: ["White & Sage", "White & Sand"], fabric: "muslin" },
  set:       { sizes: ["0-1 Month", "1-3 Months"],                                               colors: ["White", "Sage", "Sand"],        fabric: "cotton" },
  bag:       { sizes: ["One Size"],                                                              colors: ["Sand", "Cream"],                fabric: "other" },
  bathrobe:  { sizes: ["0-1 Year", "1-2 Years", "2-3 Years"],                                    colors: ["White", "Cream", "Sage"],       fabric: "terry" },
  pajama:    { sizes: ["6-12 Months", "12-18 Months", "18-24 Months"],                           colors: ["Sage", "Cream", "Lavender"],    fabric: "cotton" },
  dress:     { sizes: ["3-6 Months", "6-12 Months", "12-18 Months"],                             colors: ["White", "Lavender", "Sand"],    fabric: "cotton" },
  pants:     { sizes: ["0-3 Months", "3-6 Months", "6-12 Months", "12-18 Months"],               colors: ["Beige", "Sage", "Blue"],        fabric: "cotton" },
  outerwear: { sizes: ["6-12 Months", "12-18 Months", "18-24 Months"],                           colors: ["Sand", "Sage", "Blue"],         fabric: "fleece" },
  shoes:     { sizes: ["16", "17", "18", "19", "20"],                                            colors: ["White", "Sand", "Blue"],        fabric: "other" },
  socks:     { sizes: ["0-6 Months", "6-12 Months", "1-2 Years"],                                colors: ["White", "Sage", "Beige"],       fabric: "cotton" },
  hat:       { sizes: ["0-6 Months", "6-12 Months", "1-2 Years"],                                colors: ["White", "Sage", "Sand"],        fabric: "cotton" },
  bib:       { sizes: ["One Size"],                                                              colors: ["White", "Cream", "Mint"],       fabric: "muslin" },
  toy:       { sizes: ["One Size"],                                                              colors: ["Cream", "Sage", "Sand"],        fabric: "other" },
  accessory: { sizes: ["One Size"],                                                              colors: ["White", "Sand"],                fabric: "other" },
};
