/**
 * Product data-access layer (Phase 2 backend).
 *
 * Reads products from Supabase. If the DB is unreachable or empty, it falls
 * back to the static list in `@/lib/products` so the site NEVER breaks.
 *
 * Server-only: these functions use the Supabase server client (cookies).
 * Call them from Server Components / Route Handlers, then pass the result
 * down to client components as props.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types";
import { mapProductRow as mapRow, type ProductRow } from "@/lib/db/productMap";
import {
  products as fallbackProducts,
  getProductBySlug as getFallbackBySlug,
} from "@/lib/products";
import { getSettings } from "@/lib/db/settings";
import { isNewArrival } from "@/lib/pricing";

/** Re-derive each product's "New" badge from the admin-set new-badge window. */
function withNewBadge(list: Product[], newBadgeDays: number): Product[] {
  return list.map((p) => ({ ...p, isNew: isNewArrival(p, newBadgeDays) }));
}

/**
 * Cookie-free variant for STATIC contexts (sitemap generation at build time).
 * The cookie-based server client would force those routes dynamic.
 */
export async function getAllProductsStatic(): Promise<Product[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return fallbackProducts;
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from("products").select("*");
    if (error) throw error;
    if (!data || data.length === 0) return fallbackProducts;
    return (data as ProductRow[])
      .map(mapRow)
      .sort((a, b) => Number(a.id) - Number(b.id));
  } catch (e) {
    console.warn(
      "[products] static fetch failed — using fallback:",
      (e as Error).message
    );
    return fallbackProducts;
  }
}

/** All products, sorted by numeric id. Falls back to the static list on error. */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("products").select("*");
    if (error) throw error;
    if (!data || data.length === 0) return fallbackProducts;
    const list = (data as ProductRow[])
      .map(mapRow)
      .sort((a, b) => Number(a.id) - Number(b.id));
    const { newBadgeDays } = await getSettings();
    return withNewBadge(list, newBadgeDays);
  } catch (e) {
    console.warn(
      "[products] Supabase fetch failed — using static fallback:",
      (e as Error).message
    );
    return fallbackProducts;
  }
}

/** A single product by slug. Falls back to the static list on error / miss. */
export async function getProductBySlug(
  slug: string
): Promise<Product | undefined> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return getFallbackBySlug(slug);
    const product = mapRow(data as ProductRow);
    const { newBadgeDays } = await getSettings();
    return { ...product, isNew: isNewArrival(product, newBadgeDays) };
  } catch (e) {
    console.warn(
      "[products] Supabase fetch failed — using static fallback:",
      (e as Error).message
    );
    return getFallbackBySlug(slug);
  }
}
