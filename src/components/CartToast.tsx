"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useLocale } from "@/context/LocaleContext";

export default function CartToast() {
  const { t } = useLocale();
  const { items, totalItems } = useCart();
  const prevItems = useRef<typeof items>([]);
  const prevTotal = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [lastAdded, setLastAdded] = useState<{ name: string; emoji: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (addedItem) {
        setLastAdded({ name: addedItem.product.name, emoji: addedItem.product.emoji });
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(false), 3500);
      }
    }
    prevTotal.current = totalItems;
    prevItems.current = items;
  }, [totalItems, items]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-2rem)] max-w-sm transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-[#2A2320] text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-center gap-3">
        {lastAdded && (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            {lastAdded.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#C8B8B0] font-semibold">{t("toast.added")}</p>
          <p className="text-sm font-bold truncate">{lastAdded?.name}</p>
        </div>
        <Link
          href="/cart"
          onClick={() => setVisible(false)}
          className="flex-shrink-0 bg-[#5E9E8C] text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          {t("toast.viewCart")} →
        </Link>
        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
