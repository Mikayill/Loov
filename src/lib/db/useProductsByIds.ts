"use client";

/**
 * Client-side lookup for a small, KNOWN set of product ids — the targeted
 * twin of `useProducts()` (which pulls the entire catalog). Cart suggestions,
 * wishlist, recently-viewed and "my reviews" all only ever need a handful of
 * specific rows; pulling the whole `products` table to resolve a few ids was
 * wasted work regardless of catalog size, and gets worse as it grows.
 *
 * Renders instantly from the static list (filtered to the requested ids),
 * then swaps in live DB data. Fetched rows are cached per-locale by id so
 * repeat calls across components/re-renders never re-fetch a known row.
 */

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import type { Locale } from "@/lib/i18n/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapProductRow, type ProductRow } from "@/lib/db/productMap";
import { products as staticProducts } from "@/lib/products";
import { isNewArrival } from "@/lib/pricing";
import { settingsFromRows, DEFAULT_SETTINGS } from "@/lib/settings";
import { useLocale } from "@/context/LocaleContext";

const cache: Partial<Record<Locale, Map<string, Product>>> = {};
function cacheFor(locale: Locale): Map<string, Product> {
  if (!cache[locale]) cache[locale] = new Map();
  return cache[locale]!;
}

export function useProductsByIds(ids: string[]): Product[] {
  const { locale } = useLocale();
  // Sorted only to make a STABLE effect dependency (so a new array with the
  // same ids in the same order doesn't re-run this every render) — the
  // caller's original order is preserved for the returned list via `idsRef`
  // below, since some consumers (recently-viewed) rely on it for recency.
  const key = [...new Set(ids)].sort().join(",");
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const [list, setList] = useState<Product[]>(() => staticProducts.filter((p) => ids.includes(p.id)));

  useEffect(() => {
    const wantedIds = [...new Set(idsRef.current)];
    if (wantedIds.length === 0) { setList([]); return; }

    const known = cacheFor(locale);
    const missing = wantedIds.filter((id) => !known.has(id));
    let cancelled = false;

    (async () => {
      if (missing.length > 0) {
        try {
          const supabase = createSupabaseBrowserClient();
          const [{ data, error }, settingsRes] = await Promise.all([
            supabase.from("products").select("*").in("id", missing),
            supabase.from("settings").select("key, value"),
          ]);
          if (error) throw error;
          const newBadgeDays = settingsRes.error
            ? DEFAULT_SETTINGS.newBadgeDays
            : settingsFromRows(settingsRes.data ?? []).newBadgeDays;
          for (const row of (data as ProductRow[] | null) ?? []) {
            const p = mapProductRow(row, locale);
            known.set(p.id, { ...p, isNew: isNewArrival(p, newBadgeDays) });
          }
        } catch (e) {
          console.warn("[useProductsByIds] DB fetch failed — using static fallback for missing ids:", (e as Error).message);
        }
      }
      if (cancelled) return;
      const resolved = wantedIds
        .map((id) => known.get(id) ?? staticProducts.find((p) => p.id === id))
        .filter((p): p is Product => !!p);
      setList(resolved);
    })();

    return () => { cancelled = true; };
  // `key` (stable, sorted) is the real dependency — `ids` gets a new array
  // identity every render, which would refetch on every render otherwise.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, locale]);

  return list;
}

/**
 * A small "other products" suggestion set (e.g. cart's "You might also
 * like") — needs a handful of products NOT in a given id set, not specific
 * known ids. Fetches a small bounded superset (limit + excluded count, not
 * the whole catalog) and drops excluded ids client-side — avoids PostgREST's
 * `not.in` list-syntax fragility for what's always a tiny id list here.
 */
export function useSuggestedProducts(excludeIds: string[], limit: number = 3): Product[] {
  const { locale } = useLocale();
  const excludeKey = [...new Set(excludeIds)].sort().join(",");
  const [list, setList] = useState<Product[]>(() =>
    staticProducts.filter((p) => !excludeIds.includes(p.id)).slice(0, limit)
  );

  useEffect(() => {
    const exclude = new Set(excludeKey ? excludeKey.split(",") : []);
    let cancelled = false;

    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const [{ data, error }, settingsRes] = await Promise.all([
          supabase.from("products").select("*").limit(limit + exclude.size + 5),
          supabase.from("settings").select("key, value"),
        ]);
        if (error) throw error;
        if (cancelled) return;
        if (!data || data.length === 0) {
          setList(staticProducts.filter((p) => !exclude.has(p.id)).slice(0, limit));
          return;
        }
        const newBadgeDays = settingsRes.error
          ? DEFAULT_SETTINGS.newBadgeDays
          : settingsFromRows(settingsRes.data ?? []).newBadgeDays;
        const resolved = (data as ProductRow[])
          .map((row) => mapProductRow(row, locale))
          .filter((p) => !exclude.has(p.id))
          .map((p) => ({ ...p, isNew: isNewArrival(p, newBadgeDays) }))
          .slice(0, limit);
        setList(resolved);
      } catch (e) {
        console.warn("[useSuggestedProducts] DB fetch failed — using static fallback:", (e as Error).message);
        if (!cancelled) setList(staticProducts.filter((p) => !exclude.has(p.id)).slice(0, limit));
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeKey, limit, locale]);

  return list;
}
