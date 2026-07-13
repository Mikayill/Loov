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
import { getServerLocale } from "@/lib/i18n/server";

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
      .map((row) => mapRow(row))
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
    const locale = await getServerLocale();
    const list = (data as ProductRow[])
      .map((row) => mapRow(row, locale))
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

/**
 * A small, known set of products by id — for callers that only need a
 * handful of specific rows (e.g. resolving a bundle's item slugs) rather
 * than the whole catalog (see getAllProducts for that). Falls back to
 * filtering the static list on error.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("products").select("*").in("id", ids);
    if (error) throw error;
    if (!data || data.length === 0) return fallbackProducts.filter((p) => ids.includes(p.id));
    const locale = await getServerLocale();
    const { newBadgeDays } = await getSettings();
    return withNewBadge((data as ProductRow[]).map((row) => mapRow(row, locale)), newBadgeDays);
  } catch (e) {
    console.warn("[products] getProductsByIds failed — using static fallback:", (e as Error).message);
    return fallbackProducts.filter((p) => ids.includes(p.id));
  }
}

/** Same as getProductsByIds, keyed by slug (bundle items reference slugs). */
export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("products").select("*").in("slug", slugs);
    if (error) throw error;
    if (!data || data.length === 0) return fallbackProducts.filter((p) => slugs.includes(p.slug));
    const locale = await getServerLocale();
    const { newBadgeDays } = await getSettings();
    return withNewBadge((data as ProductRow[]).map((row) => mapRow(row, locale)), newBadgeDays);
  } catch (e) {
    console.warn("[products] getProductsBySlugs failed — using static fallback:", (e as Error).message);
    return fallbackProducts.filter((p) => slugs.includes(p.slug));
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
    const locale = await getServerLocale();
    const product = mapRow(data as ProductRow, locale);
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
