"use client";

/**
 * Debounced client hook for GET /api/products/search — replaces the pattern
 * where Navbar/404 search pulled the ENTIRE catalog client-side (useProducts())
 * and re-filtered it on every keystroke. The server now does the matching
 * (src/lib/search.ts's exact matchesQuery rules, just server-side) over a
 * DB-narrowed candidate set instead of the browser scanning everything.
 */

import { useEffect, useState } from "react";
import type { Product } from "@/types";

export interface ProductSearchResult {
  /** Matched products (capped at `limit`). */
  results: Product[];
  /** Total matches before the `limit` cap — for "N results" / "View all N". */
  total: number;
  loading: boolean;
}

const DEBOUNCE_MS = 250;

export function useProductSearch(query: string, limit: number = 50): ProductSearchResult {
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(() => {
      fetch(`/api/products/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setResults(d.products ?? []);
          setTotal(typeof d.total === "number" ? d.total : (d.products?.length ?? 0));
        })
        .catch(() => {
          if (!cancelled) { setResults([]); setTotal(0); }
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(id); };
  }, [query, limit]);

  return { results, total, loading };
}

/**
 * A bounded candidate pool with no text query — for consumers that need to
 * scan a reasonably-sized set for a JS-side predicate the server doesn't
 * implement (e.g. BabyPicksSection's age-fit check), instead of pulling the
 * entire catalog via useProducts(). Not instant (no static-list fallback —
 * callers using this already gate on other async state, e.g. a profile fetch).
 */
export function useProductPool(limit: number = 200): { products: Product[]; loading: boolean } {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/search?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setProducts(d.products ?? []); })
      .catch(() => { /* keep whatever we had */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [limit]);

  return { products, loading };
}
