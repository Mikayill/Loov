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
import { loadRemote, saveRemote } from "@/lib/db/cartSync";

/** Unique key for one cart line (product + variant + bundle). */
function lineKey(i: CartItem): string {
  return `${i.product.id}::${i.selectedColor}::${i.selectedSize}::${i.bundleSlug ?? ""}`;
}

/** Merge two carts (used when a guest with an active cart signs into an
 *  account that already has one on another device): keep the account's lines,
 *  append the guest's lines that aren't already there. Avoids losing the cart
 *  the shopper is actively building without double-counting. */
function mergeCarts(remote: CartItem[], local: CartItem[]): CartItem[] {
  const seen = new Set(remote.map(lineKey));
  return [...remote, ...local.filter((i) => !seen.has(lineKey(i)))];
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

  /* Reload whenever the active account changes (sign-in, sign-out, or
     switching accounts). Local storage gives an instant render; for signed-in
     users we then reconcile with the account's DB cart so it follows them
     across devices (supabase/cart-wishlist.sql). Guest cart is adopted on the
     first sign-in; two different accounts never see each other's items. */
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserId.current === currentUserId) return;
    const wasGuest = prevUserId.current === null || prevUserId.current === undefined;
    prevUserId.current = currentUserId;

    const targetKey = keyFor(currentUserId);
    activeKeyRef.current = targetKey;
    let targetItems: CartItem[] = [];
    let adoptedGuest = false;
    try {
      const targetRaw = localStorage.getItem(targetKey);
      if (targetRaw) {
        const parsed = JSON.parse(targetRaw);
        if (Array.isArray(parsed)) targetItems = parsed;
      }
      if (currentUserId && wasGuest && targetItems.length === 0) {
        const guestRaw = localStorage.getItem(GUEST_KEY);
        if (guestRaw) {
          const guestParsed = JSON.parse(guestRaw);
          if (Array.isArray(guestParsed) && guestParsed.length > 0) {
            targetItems = guestParsed;
            adoptedGuest = true;
            localStorage.removeItem(GUEST_KEY);
          }
        }
      }
    } catch {
      localStorage.removeItem(targetKey);
    }
    setItems(targetItems);
    setHydrated(true);

    /* Cross-device reconcile (signed-in only, best-effort). */
    if (currentUserId) {
      let cancelled = false;
      (async () => {
        const remote = await loadRemote<CartItem>("user_carts");
        if (cancelled) return;
        if (remote && remote.length > 0) {
          // Merge the just-adopted guest cart in; otherwise trust the account's.
          setItems(adoptedGuest ? mergeCarts(remote, targetItems) : remote);
        } else if (targetItems.length > 0) {
          saveRemote("user_carts", currentUserId, targetItems);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(activeKeyRef.current, JSON.stringify(items));
    const uid = user?.id;
    if (uid) {
      // Debounced push to the account's DB cart (rapid +/- clicks coalesce).
      if (dbTimer.current) clearTimeout(dbTimer.current);
      dbTimer.current = setTimeout(() => saveRemote("user_carts", uid, items), 700);
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
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id &&
            i.selectedColor === color &&
            i.selectedSize === size &&
            (i.bundleSlug ?? "") === (bundleSlug ?? "")
              ? { ...i, quantity: i.quantity + actualAdd }
              : i
          );
        }
        return [
          ...prev,
          { product, quantity: actualAdd, selectedColor: color, selectedSize: size, bundleSlug },
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
      setItems((prev) =>
        prev.filter(
          (i) =>
            !(
              i.product.id === productId &&
              i.selectedColor === color &&
              i.selectedSize === size &&
              (i.bundleSlug ?? "") === (bundleSlug ?? "")
            )
        )
      );
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
            return { ...i, quantity: clamped };
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

  const clearCart = useCallback(() => setItems([]), []);

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
