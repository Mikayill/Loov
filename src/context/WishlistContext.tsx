"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useProductsByIds } from "@/lib/db/useProductsByIds";
import { useAuth } from "@/context/AuthContext";
import { loadRemote, saveRemoteMerged } from "@/lib/db/cartSync";
import { mergeLines, parseEnvelopeJson, pruneTombstones, type MergeEnvelope, type Tombstone } from "@/lib/cartMerge";

/** Each saved item remembers the price at the moment it was added, so we can
 *  surface a price-drop later (old price struck-through + a notification dot). */
interface WishlistItem {
  id: string;
  priceWhenAdded: number;
  /** epoch ms of the last add/re-save — drives the tombstone-aware
   *  cross-device merge (src/lib/cartMerge.ts). Missing on legacy saved
   *  items; treated as 0 (always loses to a freshly-stamped edit). */
  updatedAt?: number;
}

interface WishlistContextType {
  ids: string[];
  /** `price` = the product's current price, so adding never needs a lookup —
   *  every caller already has the full product in hand (ProductCard/PDP/quick view). */
  toggle: (id: string, price: number) => void;
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
  const [items, setItems]       = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const activeKeyRef = useRef(GUEST_KEY);
  const prevUserId = useRef<string | null | undefined>(undefined);
  const dbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tombstonesRef = useRef<Tombstone[]>([]);
  const itemsRef = useRef<WishlistItem[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Only ever needs prices for items ALREADY saved (priceDrop/lowStock below)
  // — adding a new item gets its price passed directly by the caller (see
  // `toggle`), so this never has to look up the whole catalog.
  const savedProducts = useProductsByIds(items.map((i) => i.id));
  const currentPrice = useCallback(
    (id: string): number | undefined => savedProducts.find((p) => p.id === id)?.price,
    [savedProducts]
  );

  /** Old entries were a plain string[], or an object without `updatedAt` —
   *  normalize to the current shape. */
  const normalizeLine = useCallback(
    (entry: unknown): WishlistItem | null => {
      if (typeof entry === "string") {
        return { id: entry, priceWhenAdded: currentPrice(entry) ?? 0, updatedAt: 0 };
      }
      if (entry && typeof entry === "object" && "id" in entry) {
        const e = entry as WishlistItem;
        return { id: e.id, priceWhenAdded: e.priceWhenAdded ?? currentPrice(e.id) ?? 0, updatedAt: e.updatedAt ?? 0 };
      }
      return null;
    },
    [currentPrice]
  );

  /* Reload whenever the active account changes (sign-in, sign-out, or
     switching accounts) — same rule as CartContext: a guest's first
     sign-in on this browser adopts their guest wishlist; switching between
     two different accounts never mixes their saved items. Cross-device
     reconcile uses the tombstone-aware merge (src/lib/cartMerge.ts) so a
     deletion on one device isn't resurrected by a stale copy on another. */
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserId.current === currentUserId) return;
    const wasGuest = prevUserId.current === null || prevUserId.current === undefined;
    prevUserId.current = currentUserId;

    const targetKey = keyFor(currentUserId);
    activeKeyRef.current = targetKey;
    let targetEnvelope: MergeEnvelope<WishlistItem> = { lines: [], tombstones: [] };
    try {
      targetEnvelope = parseEnvelopeJson<WishlistItem>(localStorage.getItem(targetKey), normalizeLine);
      if (currentUserId && wasGuest && targetEnvelope.lines.length === 0) {
        const guestEnvelope = parseEnvelopeJson<WishlistItem>(localStorage.getItem(GUEST_KEY), normalizeLine);
        if (guestEnvelope.lines.length > 0) {
          targetEnvelope = guestEnvelope;
          localStorage.removeItem(GUEST_KEY);
        }
      }
    } catch {
      localStorage.removeItem(targetKey);
    }
    tombstonesRef.current = targetEnvelope.tombstones;
    setItems(targetEnvelope.lines);
    setHydrated(true);

    /* Cross-device reconcile (signed-in only, best-effort) — runs on sign-in
       AND whenever the tab regains focus. */
    if (currentUserId) {
      let cancelled = false;
      const reconcile = async () => {
        const remote = await loadRemote<WishlistItem>("user_wishlists");
        if (cancelled || !remote) return;
        const localNow: MergeEnvelope<WishlistItem> = { lines: itemsRef.current, tombstones: tombstonesRef.current };
        const merged = mergeLines(localNow, remote.envelope, (i) => i.id);
        tombstonesRef.current = pruneTombstones(merged.tombstones);
        setItems(merged.lines);
      };
      reconcile();
      const onVisible = () => { if (document.visibilityState === "visible") reconcile(); };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onVisible);
      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onVisible);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- normalizeLine is stable enough for this one-time-per-account load
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    const envelope: MergeEnvelope<WishlistItem> = { lines: items, tombstones: pruneTombstones(tombstonesRef.current) };
    tombstonesRef.current = envelope.tombstones;
    localStorage.setItem(activeKeyRef.current, JSON.stringify(envelope));
    const uid = user?.id;
    if (uid) {
      if (dbTimer.current) clearTimeout(dbTimer.current);
      dbTimer.current = setTimeout(() => {
        const localSnapshot: MergeEnvelope<WishlistItem> = { lines: itemsRef.current, tombstones: tombstonesRef.current };
        saveRemoteMerged<WishlistItem>("user_wishlists", uid, (remote) =>
          remote ? mergeLines(localSnapshot, remote, (i) => i.id) : localSnapshot
        );
      }, 700);
    }
  }, [items, hydrated, user?.id]);

  const toggle = useCallback((id: string, price: number) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === id)) {
        tombstonesRef.current = [...tombstonesRef.current, { key: id, removedAt: Date.now() }];
        return prev.filter((i) => i.id !== id);
      }
      // Alive again — drop any stale tombstone so a re-add isn't re-deleted
      // by a merge against an old remote tombstone.
      tombstonesRef.current = tombstonesRef.current.filter((t) => t.key !== id);
      return [...prev, { id, priceWhenAdded: price, updatedAt: Date.now() }];
    });
  }, []);

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
      const product = savedProducts.find((p) => p.id === id);
      if (!product) return null;
      // Wishlist items don't remember which size/color was saved, so a
      // per-variant-tracked product can't be read off a single number here —
      // showing a possibly-wrong "N left" would be worse than showing none.
      if (Object.keys(product.stockByVariant ?? {}).length > 0) return null;
      const stock = product.stock;
      return stock !== undefined && stock > 0 && stock <= 5 ? stock : null;
    },
    [items, savedProducts]
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
