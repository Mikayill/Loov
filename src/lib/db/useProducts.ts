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
import type { Locale } from "@/lib/i18n/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapProductRow, type ProductRow } from "@/lib/db/productMap";
import { products as staticProducts } from "@/lib/products";
import { isNewArrival } from "@/lib/pricing";
import { settingsFromRows, DEFAULT_SETTINGS } from "@/lib/settings";
import { useLocale } from "@/context/LocaleContext";

// Cached per locale — product name/description resolve differently per
// language, so switching locale must not serve another language's cache.
const cache: Partial<Record<Locale, Product[]>> = {};
const inflight: Partial<Record<Locale, Promise<Product[]>>> = {};

async function loadCatalog(locale: Locale): Promise<Product[]> {
  if (cache[locale]) return cache[locale]!;
  if (!inflight[locale]) {
    inflight[locale] = (async () => {
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
        const list = (data as ProductRow[])
          .map((row) => mapProductRow(row, locale))
          .map((p) => ({ ...p, isNew: isNewArrival(p, newBadgeDays) }))
          .sort((a, b) => Number(a.id) - Number(b.id));
        cache[locale] = list;
        return list;
      } catch (e) {
        console.warn("[useProducts] DB fetch failed — static fallback:", (e as Error).message);
        return staticProducts;
      } finally {
        delete inflight[locale];
      }
    })();
  }
  return inflight[locale]!;
}

/** Live catalog: static list immediately, DB data as soon as it arrives.
 *  Refetches (from cache, or the network the first time) when locale changes. */
export function useProducts(): Product[] {
  const { locale } = useLocale();
  const [list, setList] = useState<Product[]>(cache[locale] ?? staticProducts);

  useEffect(() => {
    if (cache[locale]) { setList(cache[locale]!); return; }
    let cancelled = false;
    loadCatalog(locale).then((data) => {
      if (!cancelled) setList(data);
    });
    return () => { cancelled = true; };
  }, [locale]);

  return list;
}
