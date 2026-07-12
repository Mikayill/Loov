/**
 * Review stats data-access (server-only).
 *
 * Reads published review ratings for a product so pages can show REAL
 * numbers (no fake "4.9 · 24 reviews"). If the reviews table doesn't exist
 * yet (features.sql not run) this quietly returns zero stats — the UI then
 * simply hides the rating row.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ReviewStats {
  avg: number;
  count: number;
}

export async function getReviewStats(productId: string): Promise<ReviewStats> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("rating")
      .eq("product_id", productId)
      .eq("status", "published");
    if (error || !data || data.length === 0) return { avg: 0, count: 0 };
    const count = data.length;
    const avg = Math.round((data.reduce((s, r) => s + Number(r.rating), 0) / count) * 10) / 10;
    return { avg, count };
  } catch {
    return { avg: 0, count: 0 };
  }
}

/**
 * Homepage "What Parents Say" feed — REAL published reviews instead of the
 * fabricated testimonials that used to be hardcoded in page.tsx (removed
 * 12 Jul 2026: a real review system exists, so invented "Nino from Tbilisi"
 * cards contradicted it). Empty result ⇒ the homepage hides the section.
 */
export interface HomeReview {
  rating: number;
  body: string;
  /** null when the reviewer chose to stay anonymous — never leak a hidden name. */
  authorName: string | null;
  createdAt: string;
}

export interface HomeReviewsData {
  featured: HomeReview[];
  count: number;
  average: number; // 0 when there are no reviews
}

const EMPTY_HOME: HomeReviewsData = { featured: [], count: 0, average: 0 };

export async function getHomeReviews(): Promise<HomeReviewsData> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error, count } = await supabase
      .from("reviews")
      .select("rating, body, show_name, author_name, created_at", { count: "exact" })
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data || data.length === 0) return EMPTY_HOME;

    const average =
      Math.round((data.reduce((s, r) => s + Number(r.rating), 0) / data.length) * 10) / 10;

    // Best cards first: highest rating, then substantial text, then recency.
    const featured = [...data]
      .sort(
        (a, b) =>
          Number(b.rating) - Number(a.rating) ||
          Math.min(String(b.body).length, 160) - Math.min(String(a.body).length, 160) ||
          String(b.created_at).localeCompare(String(a.created_at))
      )
      .slice(0, 3)
      .map((r) => ({
        rating: Number(r.rating),
        body: String(r.body),
        authorName: r.show_name ? String(r.author_name ?? "") || null : null,
        createdAt: String(r.created_at),
      }));

    return { featured, count: count ?? data.length, average };
  } catch {
    return EMPTY_HOME;
  }
}
