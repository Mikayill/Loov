"use client";

/**
 * Client-side catalog hook — the browser twin of `db/products.ts`.
 *
 * Renders instantly with the static list (no flash of empty UI), then swaps
 * in the fresh DB catalog. The fetch happens ONCE per page load and is shared
 * by every component via a module-level cache, so ten components using this
 * hook still cost a single request.
 */

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapProductRow, type ProductRow } from "@/lib/db/productMap";
import { products as staticProducts } from "@/lib/products";
import { isNewArrival } from "@/lib/pricing";
import { settingsFromRows, DEFAULT_SETTINGS } from "@/lib/settings";

let cache: Product[] | null = null;
let inflight: Promise<Product[]> | null = null;

async function loadCatalog(): Promise<Product[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        // Fetch catalog + settings together so the "New" badge honours the
        // admin-set window (same rule as the server data layer).
        const [{ data, error }, settingsRes] = await Promise.all([
          supabase.from("products").select("*"),
          supabase.from("settings").select("key, value"),
        ]);
        if (error) throw error;
        if (!data || data.length === 0) return staticProducts;
        const newBadgeDays = settingsRes.error
          ? DEFAULT_SETTINGS.newBadgeDays
          : settingsFromRows(settingsRes.data ?? []).newBadgeDays;
        cache = (data as ProductRow[])
          .map(mapProductRow)
          .map((p) => ({ ...p, isNew: isNewArrival(p, newBadgeDays) }))
          .sort((a, b) => Number(a.id) - Number(b.id));
        return cache;
      } catch (e) {
        console.warn("[useProducts] DB fetch failed — static fallback:", (e as Error).message);
        return staticProducts;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/** Live catalog: static list immediately, DB data as soon as it arrives. */
export function useProducts(): Product[] {
  const [list, setList] = useState<Product[]>(cache ?? staticProducts);

  useEffect(() => {
    if (cache) return; // already fresh
    let cancelled = false;
    loadCatalog().then((data) => {
      if (!cancelled) setList(data);
    });
    return () => { cancelled = true; };
  }, []);

  return list;
}
