/**
 * GET /api/products/search?q=&limit=
 *
 * Server-side replacement for the pattern where Navbar/404 search pulled the
 * ENTIRE catalog into the browser (via useProducts()) just to filter a few
 * matches client-side. `products` has no full-text-search setup (see
 * supabase/product-search.sql), so this uses a two-stage approach that keeps
 * EXACT behavioral parity with the existing multi-token/localized matching
 * in src/lib/search.ts (matchesQuery — same function, now also run here):
 *
 *   1. A broad `ilike` OR-prefilter across name (+ localized name columns)
 *      narrows the full table down to a bounded candidate set (indexed via
 *      the trigram index once product-search.sql is run; a plain sequential
 *      scan otherwise — still bounded by CANDIDATE_CAP either way).
 *   2. matchesQuery() runs on that candidate set for the real multi-token,
 *      localized (name/category/color/size) match — identical rules to what
 *      the client used to do, just over a pre-narrowed set instead of the
 *      whole table.
 *
 * With no `q`, this is just a bounded, capped fetch (used by BabyPicksSection
 * instead of useProducts()'s full-catalog pull) — no matching, no full scan.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapProductRow, type ProductRow } from "@/lib/db/productMap";
import { products as fallbackProducts } from "@/lib/products";
import { getSettings } from "@/lib/db/settings";
import { isNewArrival } from "@/lib/pricing";
import { getT } from "@/lib/i18n/server";
import { tokenize, matchesQuery } from "@/lib/search";

export const dynamic = "force-dynamic";

/** Upper bound on rows pulled from the DB for the ilike prefilter — keeps
 *  this endpoint's DB cost bounded even on a large catalog with a very
 *  common token (e.g. "0-3 months" would otherwise match half the table). */
const CANDIDATE_CAP = 300;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 8));

  const { t, locale } = await getT();

  try {
    const supabase = await createSupabaseServerClient();

    if (!q) {
      // No query: bounded plain fetch (BabyPicksSection etc.) — no full scan.
      const { data, error } = await supabase.from("products").select("*").limit(CANDIDATE_CAP);
      if (error) throw error;
      const { newBadgeDays } = await getSettings();
      const products = ((data as ProductRow[] | null) ?? [])
        .map((row) => mapProductRow(row, locale))
        .map((p) => ({ ...p, isNew: isNewArrival(p, newBadgeDays) }));
      return NextResponse.json({ products: products.slice(0, limit), total: products.length, ready: true });
    }

    const tokens = tokenize(q);
    // Broad net: any token appearing in any name column. This intentionally
    // over-matches (matchesQuery below applies the real per-token-AND rule,
    // across name/category/color/size) — it only needs to not UNDER-match.
    const orClauses = tokens
      .flatMap((tok) => [`name.ilike.%${tok}%`, `name_ka.ilike.%${tok}%`, `name_ru.ilike.%${tok}%`, `name_tr.ilike.%${tok}%`])
      .join(",");
    let { data, error } = await supabase.from("products").select("*").or(orClauses).limit(CANDIDATE_CAP);
    // Locale name columns missing (product-i18n.sql not run) — retry name-only.
    if (error && /name_(ka|ru|tr)/i.test(error.message)) {
      const retry = await supabase
        .from("products")
        .select("*")
        .or(tokens.map((tok) => `name.ilike.%${tok}%`).join(","))
        .limit(CANDIDATE_CAP);
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;

    const { newBadgeDays } = await getSettings();
    const candidates = ((data as ProductRow[] | null) ?? [])
      .map((row) => mapProductRow(row, locale))
      .map((p) => ({ ...p, isNew: isNewArrival(p, newBadgeDays) }));

    // Real matching rule (multi-token AND, across name/category/color/size,
    // localized) — identical to the client's previous in-browser filter.
    const matched = candidates.filter((p) => matchesQuery(p, tokens, t));

    return NextResponse.json({ products: matched.slice(0, limit), total: matched.length, ready: true });
  } catch (e) {
    console.warn("[products/search] DB search failed — using static fallback:", (e as Error).message);
    const tokens = q ? tokenize(q) : [];
    const matched = tokens.length > 0 ? fallbackProducts.filter((p) => matchesQuery(p, tokens, t)) : fallbackProducts;
    return NextResponse.json({ products: matched.slice(0, limit), total: matched.length, ready: false });
  }
}
