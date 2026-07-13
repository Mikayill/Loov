"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { CartItem, CartContextType, CartAddResult, MaxReachedNotice, Product } from "@/types";
import { effectivePrice } from "@/lib/pricing";
import { variantStock } from "@/lib/stock";
import { useAuth } from "@/context/AuthContext";
import { loadRemote, saveRemoteMerged } from "@/lib/db/cartSync";
import { mergeLines, parseEnvelopeJson, pruneTombstones, type MergeEnvelope, type Tombstone } from "@/lib/cartMerge";

/** Unique key for one cart line (product + variant + bundle). */
function lineKey(i: CartItem): string {
  return `${i.product.id}::${i.selectedColor}::${i.selectedSize}::${i.bundleSlug ?? ""}`;
}

const CartContext = createContext<CartContextType | null>(null);

/** Guest cart lives under the original unscoped key (no data loss for
 *  shoppers already mid-cart). Signed-in accounts get their own namespaced
 *  key so switching accounts on the same browser never leaks another
 *  account's cart — see WishlistContext.tsx for the identical pattern. */
const GUEST_KEY = "loov-cart";
function keyFor(userId: string | null): string {
  return userId ? `loov-cart:${userId}` : GUEST_KEY;
}

/** Hard cap per cart line — the order API rejects quantities above this, so
 *  clamp here too instead of letting the shopper build a cart that fails at
 *  checkout (happens on untracked-stock products where `available` is null). */
const MAX_PER_LINE = 99;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [maxReachedNotice, setMaxReachedNotice] = useState<MaxReachedNotice | null>(null);
  const activeKeyRef = useRef(GUEST_KEY);
  const prevUserId = useRef<string | null | undefined>(undefined);
  const dbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tombstones (recent removals) don't need their own render — kept in a ref,
  // mirrored to localStorage/DB alongside `items` in the effects below.
  const tombstonesRef = useRef<Tombstone[]>([]);
  // Mirrors `items` for handlers (visibilitychange reconcile) that are set up
  // once per account and would otherwise see a stale closure.
  const itemsRef = useRef<CartItem[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  /* Reload whenever the active account changes (sign-in, sign-out, or
     switching accounts). Local storage gives an instant render; for signed-in
     users we then reconcile with the account's DB cart so it follows them
     across devices (supabase/cart-wishlist.sql) via a tombstone-aware merge
     (src/lib/cartMerge.ts) — never a blind overwrite. Guest cart is adopted
     on the first sign-in; two different accounts never see each other's items. */
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserId.current === currentUserId) return;
    const wasGuest = prevUserId.current === null || prevUserId.current === undefined;
    prevUserId.current = currentUserId;

    const targetKey = keyFor(currentUserId);
    activeKeyRef.current = targetKey;
    let targetEnvelope: MergeEnvelope<CartItem> = { lines: [], tombstones: [] };
    try {
      targetEnvelope = parseEnvelopeJson<CartItem>(localStorage.getItem(targetKey));
      // First sign-in on this browser adopts the guest cart wholesale — the
      // general merge below (against remote) folds it in correctly either way.
      if (currentUserId && wasGuest && targetEnvelope.lines.length === 0) {
        const guestEnvelope = parseEnvelopeJson<CartItem>(localStorage.getItem(GUEST_KEY));
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
       AND whenever the tab regains focus, so two open devices actually
       converge without requiring a fresh sign-in each time. */
    if (currentUserId) {
      let cancelled = false;
      const reconcile = async () => {
        const remote = await loadRemote<CartItem>("user_carts");
        if (cancelled || !remote) return;
        const localNow: MergeEnvelope<CartItem> = { lines: itemsRef.current, tombstones: tombstonesRef.current };
        const merged = mergeLines(localNow, remote.envelope, lineKey);
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
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    const envelope: MergeEnvelope<CartItem> = { lines: items, tombstones: pruneTombstones(tombstonesRef.current) };
    tombstonesRef.current = envelope.tombstones;
    localStorage.setItem(activeKeyRef.current, JSON.stringify(envelope));
    const uid = user?.id;
    if (uid) {
      // Debounced push to the account's DB cart (rapid +/- clicks coalesce).
      // saveRemoteMerged re-reads the current remote row and merges against
      // it (CAS-lite) rather than blindly overwriting it.
      if (dbTimer.current) clearTimeout(dbTimer.current);
      dbTimer.current = setTimeout(() => {
        const localSnapshot: MergeEnvelope<CartItem> = { lines: itemsRef.current, tombstones: tombstonesRef.current };
        saveRemoteMerged<CartItem>("user_carts", uid, (remote) =>
          remote ? mergeLines(localSnapshot, remote, lineKey) : localSnapshot
        );
      }, 700);
    }
  }, [items, hydrated, user?.id]);

  const addItem = useCallback(
    (product: Product, color: string, size: string, qty: number = 1, bundleSlug?: string): CartAddResult => {
      const available = variantStock(product, size, color);
      let result: CartAddResult = { added: 0, maxReached: false, available };
      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            i.product.id === product.id &&
            i.selectedColor === color &&
            i.selectedSize === size &&
            (i.bundleSlug ?? "") === (bundleSlug ?? "")
        );
        const alreadyInCart = existing?.quantity ?? 0;
        const cap = available === null ? MAX_PER_LINE : Math.min(available, MAX_PER_LINE);
        const room = Math.max(0, cap - alreadyInCart);
        const actualAdd = Math.max(0, Math.min(qty, room));
        result = { added: actualAdd, maxReached: actualAdd < qty, available };
        if (actualAdd <= 0) return prev;
        // Alive again — drop any stale tombstone for this key so a re-add
        // isn't accidentally re-deleted by a merge against an old remote tombstone.
        const key = `${product.id}::${color}::${size}::${bundleSlug ?? ""}`;
        tombstonesRef.current = tombstonesRef.current.filter((t) => t.key !== key);
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id &&
            i.selectedColor === color &&
            i.selectedSize === size &&
            (i.bundleSlug ?? "") === (bundleSlug ?? "")
              ? { ...i, quantity: i.quantity + actualAdd, updatedAt: Date.now() }
              : i
          );
        }
        return [
          ...prev,
          { product, quantity: actualAdd, selectedColor: color, selectedSize: size, bundleSlug, updatedAt: Date.now() },
        ];
      });
      if (typeof window !== "undefined" && result.added > 0) {
        /* Notify CartDrawer without coupling contexts */
        window.dispatchEvent(new CustomEvent("loov:cart:added"));
      }
      if (result.maxReached) {
        setMaxReachedNotice({ name: product.name, available: available ?? 0, ts: Date.now() });
      }
      return result;
    },
    []
  );

  const removeItem = useCallback(
    (productId: string, color: string, size: string, bundleSlug?: string) => {
      setItems((prev) => {
        const target = prev.find(
          (i) =>
            i.product.id === productId &&
            i.selectedColor === color &&
            i.selectedSize === size &&
            (i.bundleSlug ?? "") === (bundleSlug ?? "")
        );
        if (target) {
          tombstonesRef.current = [...tombstonesRef.current, { key: lineKey(target), removedAt: Date.now() }];
        }
        return prev.filter((i) => i !== target);
      });
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, color: string, size: string, quantity: number, bundleSlug?: string): CartAddResult => {
      let result: CartAddResult = { added: 0, maxReached: false, available: null };
      if (quantity < 1) return result;
      setItems((prev) =>
        prev.map((i) => {
          if (
            i.product.id === productId &&
            i.selectedColor === color &&
            i.selectedSize === size &&
            (i.bundleSlug ?? "") === (bundleSlug ?? "")
          ) {
            const available = variantStock(i.product, size, color);
            const cap = available === null ? MAX_PER_LINE : Math.min(available, MAX_PER_LINE);
            const clamped = Math.max(1, Math.min(quantity, cap));
            result = { added: clamped, maxReached: clamped < quantity, available };
            return { ...i, quantity: clamped, updatedAt: Date.now() };
          }
          return i;
        })
      );
      if (result.maxReached) {
        const item = items.find(
          (i) => i.product.id === productId && i.selectedColor === color && i.selectedSize === size && (i.bundleSlug ?? "") === (bundleSlug ?? "")
        );
        setMaxReachedNotice({ name: item?.product.name ?? "", available: result.available ?? 0, ts: Date.now() });
      }
      return result;
    },
    [items]
  );

  const clearCart = useCallback(() => {
    setItems((prev) => {
      const now = Date.now();
      tombstonesRef.current = [...tombstonesRef.current, ...prev.map((i) => ({ key: lineKey(i), removedAt: now }))];
      return [];
    });
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + effectivePrice(i.product, i.selectedSize) * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        maxReachedNotice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
