/**
 * Bundle data-access layer (FAZ 4).
 *
 * Reads bundles from Supabase so the admin panel can edit them. Falls back
 * to the static list in `@/lib/bundles` if the table doesn't exist yet
 * (supabase/bundles.sql not run) — the site never breaks.
 *
 * Server-only (cookie server client). Call from Server Components / routes.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bundles as fallbackBundles, type Bundle, type BundleProductConfig } from "@/lib/bundles";

export interface BundleRow {
  slug: string;
  name: string;
  subtitle: string | null;
  tagline: string | null;
  emoji: string | null;
  card_color: string | null;
  description: string | null;
  features: string[] | null;
  items: BundleProductConfig[] | null;
  original_price: number;
  bundle_price: number;
  is_new: boolean | null;
  image_url?: string | null;
  active: boolean | null;
  sort: number | null;
}

export function mapBundleRow(row: BundleRow): Bundle {
  return {
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle ?? "",
    tagline: row.tagline ?? "",
    emoji: row.emoji ?? "🎁",
    cardColor: row.card_color ?? "#EDE5D8",
    description: row.description ?? "",
    features: row.features ?? [],
    items: Array.isArray(row.items) ? row.items : [],
    originalPrice: Number(row.original_price),
    bundlePrice: Number(row.bundle_price),
    isNew: row.is_new ?? false,
    imageUrl: row.image_url ?? undefined,
    active: row.active ?? true,
  };
}

/** Storefront list: active bundles, admin-defined order. Static fallback. */
export async function getAllBundles(): Promise<Bundle[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("bundles")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return fallbackBundles;
    return (data as BundleRow[]).map(mapBundleRow);
  } catch (e) {
    console.warn("[bundles] DB fetch failed — using static fallback:", (e as Error).message);
    return fallbackBundles;
  }
}

/** One bundle by slug (active only — storefront). Static fallback. */
export async function getBundleBySlug(slug: string): Promise<Bundle | undefined> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("bundles")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallbackBundles.find((b) => b.slug === slug);
    return mapBundleRow(data as BundleRow);
  } catch (e) {
    console.warn("[bundles] DB fetch failed — using static fallback:", (e as Error).message);
    return fallbackBundles.find((b) => b.slug === slug);
  }
}
