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
