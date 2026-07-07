/**
 * Shared products-table row shape + mapper (snake_case DB → camelCase app).
 * Used by both the server data layer (db/products.ts) and the client
 * catalog hook (db/useProducts.ts).
 */

import type { Product, Season } from "@/types";

/** Shape of a row in the Supabase `products` table (snake_case). */
export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
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
  season?: string | null;
  size_colors?: Record<string, string[]> | null;
  size_prices?: Record<string, number> | null;
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

/** Convert a DB row (snake_case) into the app's Product type (camelCase). */
export function mapProductRow(row: ProductRow): Product {
  // Prefer the gallery's first photo; fall back to the legacy single image_url.
  const gallery = (row.image_urls ?? []).filter(Boolean);
  const primary = gallery[0] ?? row.image_url ?? undefined;
  const season = SEASONS.includes(row.season as Season) ? (row.season as Season) : "all";

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
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
    season,
    sizeColors: row.size_colors ?? {},
    sizePrices: row.size_prices ?? undefined,
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
