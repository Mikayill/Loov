"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { CartItem, CartContextType, Product } from "@/types";
import { effectivePrice } from "@/lib/pricing";

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("loov-cart");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      localStorage.removeItem("loov-cart");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("loov-cart", JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = useCallback(
    (product: Product, color: string, size: string, qty: number = 1, bundleSlug?: string) => {
      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            i.product.id === product.id &&
            i.selectedColor === color &&
            i.selectedSize === size &&
            (i.bundleSlug ?? "") === (bundleSlug ?? "")
        );
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id &&
            i.selectedColor === color &&
            i.selectedSize === size &&
            (i.bundleSlug ?? "") === (bundleSlug ?? "")
              ? { ...i, quantity: i.quantity + qty }
              : i
          );
        }
        return [
          ...prev,
          { product, quantity: qty, selectedColor: color, selectedSize: size, bundleSlug },
        ];
      });
      /* Notify CartDrawer without coupling contexts */
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("loov:cart:added"));
      }
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
    (productId: string, color: string, size: string, quantity: number, bundleSlug?: string) => {
      if (quantity < 1) return;
      setItems((prev) =>
        prev.map((i) =>
          i.product.id === productId &&
          i.selectedColor === color &&
          i.selectedSize === size &&
          (i.bundleSlug ?? "") === (bundleSlug ?? "")
            ? { ...i, quantity }
            : i
        )
      );
    },
    []
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
