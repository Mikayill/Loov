"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useLocale } from "@/context/LocaleContext";

type ToastState =
  | { kind: "added"; name: string; emoji: string }
  | { kind: "warn"; name: string; available: number };

export default function CartToast() {
  const { t } = useLocale();
  const { items, totalItems, maxReachedNotice } = useCart();
  const prevItems = useRef<typeof items>([]);
  const prevTotal = useRef<number | null>(null);
  const prevWarnTs = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(next: ToastState, ms: number) {
    setToast(next);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), ms);
  }

  useEffect(() => {
    if (prevTotal.current === null) {
      prevTotal.current = totalItems;
      prevItems.current = items;
      return;
    }
    if (totalItems > prevTotal.current) {
      /* Find which item changed — compare quantities to detect the added product */
      let addedItem = items[items.length - 1];
      for (const item of items) {
        const prev = prevItems.current.find(
          (p) => p.product.id === item.product.id &&
                 p.selectedColor === item.selectedColor &&
                 p.selectedSize === item.selectedSize
        );
        if (!prev || item.quantity > prev.quantity) {
          addedItem = item;
          break;
        }
      }
      if (addedItem) show({ kind: "added", name: addedItem.product.name, emoji: addedItem.product.emoji }, 3500);
    }
    prevTotal.current = totalItems;
    prevItems.current = items;
  }, [totalItems, items]);

  /* Stock-clamp warning — fires whenever the cart couldn't add/set the full
     requested quantity for a variant (see CartContext.tsx). */
  useEffect(() => {
    if (maxReachedNotice && maxReachedNotice.ts !== prevWarnTs.current) {
      prevWarnTs.current = maxReachedNotice.ts;
      show({ kind: "warn", name: maxReachedNotice.name, available: maxReachedNotice.available }, 3200);
    }
  }, [maxReachedNotice]);

  const isWarn = toast?.kind === "warn";

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[700] w-[calc(100%-2rem)] max-w-sm transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className={`rounded-card shadow-2xl px-4 py-3.5 flex items-center gap-3 ${isWarn ? "bg-danger text-white" : "bg-ink text-white"}`}>
        {toast?.kind === "added" && (
          <>
            <div
              className="w-11 h-11 rounded-control flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {toast.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#C8B8B0] font-semibold">{t("toast.added")}</p>
              <p className="text-sm font-bold truncate">{toast.name}</p>
            </div>
            <Link
              href="/cart"
              onClick={() => setVisible(false)}
              className="flex-shrink-0 bg-accent text-white text-xs font-bold px-3 py-2 rounded-control hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {t("toast.viewCart")} →
            </Link>
          </>
        )}
        {toast?.kind === "warn" && (
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/80 font-semibold">{t("toast.maxReached")}</p>
            <p className="text-sm font-bold leading-snug">
              {toast.available > 0
                ? t("toast.maxReachedBody").replace("{n}", String(toast.available)).replace("{name}", toast.name)
                : t("toast.soldOutBody").replace("{name}", toast.name)}
            </p>
          </div>
        )}
        <button
          onClick={() => setVisible(false)}
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${isWarn ? "bg-canvas/15 hover:bg-canvas/25" : "bg-canvas/10 hover:bg-canvas/20"}`}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
