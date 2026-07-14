/**
 * Shared products-table row shape + mapper (snake_case DB → camelCase app).
 * Used by both the server data layer (db/products.ts) and the client
 * catalog hook (db/useProducts.ts).
 */

import type { Product, Season } from "@/types";
import type { Locale } from "@/lib/i18n/config";

/** Shape of a row in the Supabase `products` table (snake_case). */
export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  name_ka?: string | null;
  name_ru?: string | null;
  name_tr?: string | null;
  description_ka?: string | null;
  description_ru?: string | null;
  description_tr?: string | null;
  price: number;
  category: Product["category"];
  colors: string[] | null;
  sizes: string[] | null;
  emoji: string | null;
  card_color: string | null;
  is_new: boolean | null;
  stock: number | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  discount_percent?: number | null;
  discount_ends_at?: string | null;
  season?: string | null;
  size_colors?: Record<string, string[]> | null;
  size_prices?: Record<string, number> | null;
  stock_by_variant?: Record<string, Record<string, number>> | null;
  fabric?: string | null;
  features?: string[] | null;
  material?: string | null;
  weight?: string | null;
  certification?: string | null;
  origin?: string | null;
  care_instructions?: string[] | null;
  created_at?: string | null;
}

const SEASONS: Season[] = ["all", "spring", "summer", "autumn", "winter"];

/** DISPLAY ONLY — a blank locale-specific field falls back to the canonical
 *  (English) column, same rule as size_prices' base-price fallback. Never
 *  feed the resolved value back into cart/order/search logic; those always
 *  use `row.name`/`row.description` (the canonical columns). */
function resolveLocaleField(canonical: string, ka: string | null | undefined, ru: string | null | undefined, tr: string | null | undefined, locale: Locale): string {
  const localized = locale === "ka" ? ka : locale === "ru" ? ru : locale === "tr" ? tr : undefined;
  return localized && localized.trim() ? localized : canonical;
}

/** Convert a DB row (snake_case) into the app's Product type (camelCase). */
export function mapProductRow(row: ProductRow, locale: Locale = "en"): Product {
  // Prefer the gallery's first photo; fall back to the legacy single image_url.
  const gallery = (row.image_urls ?? []).filter(Boolean);
  const primary = gallery[0] ?? row.image_url ?? undefined;
  const season = SEASONS.includes(row.season as Season) ? (row.season as Season) : "all";

  return {
    id: row.id,
    slug: row.slug,
    name: resolveLocaleField(row.name, row.name_ka, row.name_ru, row.name_tr, locale),
    description: resolveLocaleField(row.description ?? "", row.description_ka, row.description_ru, row.description_tr, locale),
    price: Number(row.price),
    category: row.category,
    // Safety net: a product must ALWAYS be sellable. Admin-created products
    // that never got colors/sizes fall back to a generic option instead of
    // rendering an un-buyable detail page.
    colors: row.colors?.length ? row.colors : ["Standard"],
    sizes: row.sizes?.length ? row.sizes : ["One Size"],
    emoji: row.emoji ?? "🍼",
    cardColor: row.card_color ?? "#EAE4DC",
    isNew: row.is_new ?? false,
    stock: row.stock ?? undefined,
    imageUrl: primary,
    imageUrls: gallery.length ? gallery : primary ? [primary] : [],
    discountPercent: row.discount_percent ?? 0,
    discountEndsAt: row.discount_ends_at ?? null,
    season,
    sizeColors: row.size_colors ?? {},
    sizePrices: row.size_prices ?? undefined,
    stockByVariant: row.stock_by_variant ?? undefined,
    fabric: row.fabric ?? undefined,
    features: row.features ?? [],
    material: row.material ?? undefined,
    weight: row.weight ?? undefined,
    certification: row.certification ?? undefined,
    origin: row.origin ?? undefined,
    careInstructions: row.care_instructions ?? [],
    createdAt: row.created_at ?? undefined,
  };
}
