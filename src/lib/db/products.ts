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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
 * Attach the published-review average to each product (drives the card star
 * row). Best-effort: any failure just returns the list without ratings —
 * cards then show the 5-star default.
 */
async function withRatings(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  list: Product[]
): Promise<Product[]> {
  if (list.length === 0) return list;
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("product_id, rating")
      .eq("status", "published")
      .in("product_id", list.map((p) => p.id));
    if (error || !data) return list;
    const agg = new Map<string, { sum: number; count: number }>();
    for (const r of data as { product_id: string; rating: number }[]) {
      const key = String(r.product_id);
      const cur = agg.get(key) ?? { sum: 0, count: 0 };
      cur.sum += Number(r.rating) || 0;
      cur.count += 1;
      agg.set(key, cur);
    }
    return list.map((p) => {
      const a = agg.get(String(p.id));
      return a && a.count > 0
        ? { ...p, rating: { avg: Math.round((a.sum / a.count) * 10) / 10, count: a.count } }
        : p;
    });
  } catch {
    return list;
  }
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
    return withRatings(supabase, withNewBadge(list, newBadgeDays));
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
    return withRatings(supabase, withNewBadge((data as ProductRow[]).map((row) => mapRow(row, locale)), newBadgeDays));
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
    return withRatings(supabase, withNewBadge((data as ProductRow[]).map((row) => mapRow(row, locale)), newBadgeDays));
  } catch (e) {
    console.warn("[products] getProductsBySlugs failed — using static fallback:", (e as Error).message);
    return fallbackProducts.filter((p) => slugs.includes(p.slug));
  }
}

/**
 * Real "frequently bought together" — ranks OTHER products by how often
 * they appear in the same order as `product` (aggregate order_items counts,
 * no customer-identifying data). Needs the service role: order_items' RLS
 * only exposes a shopper their OWN orders, but this is a statistical signal
 * across every order, same category of aggregate info Amazon-style "bought
 * together" widgets show. Pads with same-category-then-any products when
 * there isn't enough order history yet (new product, low sales) — never
 * fabricated, just less-targeted while real signal is thin.
 */
export async function getFrequentlyBoughtWith(
  product: Product,
  allProducts: Product[],
  limit = 3
): Promise<Product[]> {
  const byId = new Map(allProducts.map((p) => [p.id, p]));
  const fallbackFill = (exclude: Set<string>) => {
    const sameCategory = allProducts.filter((p) => !exclude.has(p.id) && p.category === product.category);
    const rest = allProducts.filter((p) => !exclude.has(p.id) && p.category !== product.category);
    return [...sameCategory, ...rest];
  };

  const admin = createSupabaseAdminClient();
  if (!admin) return fallbackFill(new Set([product.id])).slice(0, limit);

  try {
    const { data: orderRows, error: e1 } = await admin
      .from("order_items")
      .select("order_id")
      .eq("product_id", product.id)
      .limit(500);
    if (e1) throw e1;
    const orderIds = [...new Set((orderRows ?? []).map((r) => r.order_id as string))];

    let ranked: Product[] = [];
    if (orderIds.length > 0) {
      const { data: coRows, error: e2 } = await admin
        .from("order_items")
        .select("product_id")
        .in("order_id", orderIds)
        .neq("product_id", product.id)
        .limit(3000);
      if (e2) throw e2;
      const freq = new Map<string, number>();
      for (const r of (coRows ?? []) as { product_id: string | null }[]) {
        if (!r.product_id) continue;
        freq.set(r.product_id, (freq.get(r.product_id) ?? 0) + 1);
      }
      ranked = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => byId.get(id))
        .filter((p): p is Product => !!p);
    }

    if (ranked.length >= limit) return ranked.slice(0, limit);
    const used = new Set([product.id, ...ranked.map((p) => p.id)]);
    return [...ranked, ...fallbackFill(used)].slice(0, limit);
  } catch (e) {
    console.warn("[products] getFrequentlyBoughtWith failed — using category fallback:", (e as Error).message);
    return fallbackFill(new Set([product.id])).slice(0, limit);
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
    const [withR] = await withRatings(supabase, [{ ...product, isNew: isNewArrival(product, newBadgeDays) }]);
    return withR;
  } catch (e) {
    console.warn(
      "[products] Supabase fetch failed — using static fallback:",
      (e as Error).message
    );
    return getFallbackBySlug(slug);
  }
}
