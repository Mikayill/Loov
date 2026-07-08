"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useProducts } from "@/lib/db/useProducts";

/** Each saved item remembers the price at the moment it was added, so we can
 *  surface a price-drop later (old price struck-through + a notification dot). */
interface WishlistItem {
  id: string;
  priceWhenAdded: number;
}

interface WishlistContextType {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  count: number;
  /** Old (higher) price if this item is now cheaper than when saved, else null. */
  priceDrop: (id: string) => number | null;
  /** True if ANY saved item is currently cheaper than when it was added. */
  hasPriceDrop: boolean;
  /** Remaining stock if this saved item is running low (1–5 left), else null. */
  lowStock: (id: string) => number | null;
  /** How many saved items are running low right now. */
  lowStockCount: number;
  /** True when anything saved deserves attention (price drop OR low stock). */
  hasUrgency: boolean;
}

const WishlistContext = createContext<WishlistContextType | null>(null);
const STORAGE_KEY = "loov-wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const products = useProducts(); // live catalog (DB with static fallback)
  const [items, setItems]       = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const currentPrice = useCallback(
    (id: string): number | undefined => products.find((p) => p.id === id)?.price,
    [products]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Migrate the old string[] format to the new object format.
          const migrated: WishlistItem[] = parsed
            .map((entry: unknown) => {
              if (typeof entry === "string") {
                return { id: entry, priceWhenAdded: currentPrice(entry) ?? 0 };
              }
              if (entry && typeof entry === "object" && "id" in entry) {
                const e = entry as WishlistItem;
                return { id: e.id, priceWhenAdded: e.priceWhenAdded ?? currentPrice(e.id) ?? 0 };
              }
              return null;
            })
            .filter((x): x is WishlistItem => x !== null);
          setItems(migrated);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time migration on mount
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const toggle = useCallback((id: string) => {
    setItems((prev) =>
      prev.some((i) => i.id === id)
        ? prev.filter((i) => i.id !== id)
        : [...prev, { id, priceWhenAdded: currentPrice(id) ?? 0 }]
    );
  }, [currentPrice]);

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const priceDrop = useCallback(
    (id: string): number | null => {
      const item = items.find((i) => i.id === id);
      if (!item) return null;
      const now = currentPrice(id);
      if (now === undefined) return null;
      return now < item.priceWhenAdded ? item.priceWhenAdded : null;
    },
    [items, currentPrice]
  );

  const hasPriceDrop = items.some((i) => {
    const now = currentPrice(i.id);
    return now !== undefined && now < i.priceWhenAdded;
  });

  const lowStock = useCallback(
    (id: string): number | null => {
      if (!items.some((i) => i.id === id)) return null;
      const stock = products.find((p) => p.id === id)?.stock;
      return stock !== undefined && stock > 0 && stock <= 5 ? stock : null;
    },
    [items, products]
  );

  const lowStockCount = items.filter((i) => lowStock(i.id) !== null).length;
  const hasUrgency = hasPriceDrop || lowStockCount > 0;

  return (
    <WishlistContext.Provider
      value={{
        ids: items.map((i) => i.id),
        toggle,
        has,
        count: items.length,
        priceDrop,
        hasPriceDrop,
        lowStock,
        lowStockCount,
        hasUrgency,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextType {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
