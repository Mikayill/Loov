"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useProducts } from "@/lib/db/useProducts";
import { useAuth } from "@/context/AuthContext";

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

/** Guest wishlist lives under the original unscoped key (no data loss for
 *  shoppers already mid-session). Signed-in accounts get their own
 *  namespaced key so switching accounts on the same browser never leaks
 *  another account's saved items — see CartContext.tsx for the identical
 *  pattern (including the guest→account adopt-on-first-sign-in rule). */
const GUEST_KEY = "loov-wishlist";
function keyFor(userId: string | null): string {
  return userId ? `loov-wishlist:${userId}` : GUEST_KEY;
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const products = useProducts(); // live catalog (DB with static fallback)
  const [items, setItems]       = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const activeKeyRef = useRef(GUEST_KEY);
  const prevUserId = useRef<string | null | undefined>(undefined);

  const currentPrice = useCallback(
    (id: string): number | undefined => products.find((p) => p.id === id)?.price,
    [products]
  );

  /** Old entries were a plain string[]; normalize to the object format. */
  function parseItems(raw: string | null): WishlistItem[] {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
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
  }

  /* Reload whenever the active account changes (sign-in, sign-out, or
     switching accounts) — same rule as CartContext: a guest's first
     sign-in on this browser adopts their guest wishlist; switching between
     two different accounts never mixes their saved items. */
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserId.current === currentUserId) return;
    const wasGuest = prevUserId.current === null || prevUserId.current === undefined;
    prevUserId.current = currentUserId;

    const targetKey = keyFor(currentUserId);
    activeKeyRef.current = targetKey;
    let targetItems: WishlistItem[] = [];
    try {
      targetItems = parseItems(localStorage.getItem(targetKey));
      if (currentUserId && wasGuest && targetItems.length === 0) {
        const guestItems = parseItems(localStorage.getItem(GUEST_KEY));
        if (guestItems.length > 0) {
          targetItems = guestItems;
          localStorage.removeItem(GUEST_KEY);
        }
      }
    } catch {
      localStorage.removeItem(targetKey);
    }
    setItems(targetItems);
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- currentPrice/parseItems are stable enough for this one-time-per-account load
  }, [user?.id]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(activeKeyRef.current, JSON.stringify(items));
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
      const product = products.find((p) => p.id === id);
      if (!product) return null;
      // Wishlist items don't remember which size/color was saved, so a
      // per-variant-tracked product can't be read off a single number here —
      // showing a possibly-wrong "N left" would be worse than showing none.
      if (Object.keys(product.stockByVariant ?? {}).length > 0) return null;
      const stock = product.stock;
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
