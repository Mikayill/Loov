"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import { useLocale } from "@/context/LocaleContext";
import { colorLabel, sizeLabel } from "@/lib/i18n/labels";
import { useDelayedUnmount } from "@/hooks/useDelayedUnmount";
import { variantStock } from "@/lib/stock";

const colorHexMap: Record<string, string> = {
  White: "#F5F2ED", Sage: "#9BBFB8", Sand: "#D4B896", "Sky Blue": "#87BEDC",
  Beige: "#D4C5A9", Cream: "#F0E8D4", Lavender: "#C4B4D4", Blue: "#8AAEC8",
  Golden: "#E8C870", Grey: "#C8C8D8", Blush: "#E8C0C0",
  "White & Blue": "#8AAEC8", "White & Sage": "#9BBFB8", "White & Sand": "#D4B896",
  "White & Mint": "#8FD4C0", "Pastel Rainbow": "#E8D0E8", "Neutral Rainbow": "#D8D0C8",
};
function hex(name: string) { return colorHexMap[name] ?? "#C8C8C8"; }

/**
 * Lightweight color/size/qty picker for the homepage "quick add to cart"
 * corner button (QuickAddButton) — used only for multi-variant products,
 * since that button used to silently add colors[0]/sizes[0] without asking.
 * Deliberately smaller than QuickViewButton's modal (no image/description) —
 * the point of "quick add" is staying quick, not becoming a second quick view.
 */
export default function VariantPickerPopover({ product, open, onClose }: { product: Product; open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const { addItem } = useCart();
  const [mounted, setMounted] = useState(false);
  const [selectedColor, setColor] = useState(product.colors[0]);
  const [selectedSize, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<"idle" | "added" | "blocked">("idle");
  const shouldRender = useDelayedUnmount(open, 160);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      setColor(product.colors[0]);
      setSize(product.sizes[0]);
      setQty(1);
      setStatus("idle");
    }
  }, [open, product]);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const stock = variantStock(product, selectedSize, selectedColor);
  const soldOut = stock !== null && stock <= 0;
  const qtyMax = stock ?? Infinity;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    const result = addItem(product, selectedColor, selectedSize, Math.min(qty, qtyMax));
    if (result.added <= 0) {
      setStatus("blocked");
      setTimeout(() => setStatus("idle"), 1800);
      return;
    }
    setStatus("added");
    setTimeout(close, 1100);
  }

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[500] flex items-center justify-center p-4 ${open ? "animate-fade-in" : "animate-fade-out"}`}
      style={{ backgroundColor: "rgba(42,35,32,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); close(); }}
    >
      <div
        className={`bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden p-5 ${open ? "animate-pop-in" : "animate-pop-out"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <h3 className="font-bold text-sm text-[#2A2320] line-clamp-1">{product.name}</h3>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); close(); }}
            className="w-7 h-7 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#5E5450] hover:bg-[#EDE5D8] active:scale-90 transition-all text-xs font-bold flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {product.colors.length > 1 && (
          <div className="mb-3">
            <p className="text-[11px] font-bold text-[#2A2320] mb-1.5">
              {t("product.color")}: <span className="text-[#5E9E8C] font-semibold">{colorLabel(selectedColor, t)}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {product.colors.map((c) => (
                <button
                  key={c}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setColor(c); }}
                  title={colorLabel(c, t)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    selectedColor === c
                      ? "border-[#5E9E8C] ring-2 ring-[#5E9E8C] ring-offset-1 scale-110"
                      : "border-[#DDD5CC] hover:border-[#9A8E88] hover:scale-105"
                  }`}
                  style={{ backgroundColor: hex(c) }}
                />
              ))}
            </div>
          </div>
        )}

        {product.sizes.length > 1 && product.sizes[0] !== "One Size" && (
          <div className="mb-3">
            <p className="text-[11px] font-bold text-[#2A2320] mb-1.5">
              {t("product.size")}: <span className="text-[#5E9E8C] font-semibold">{sizeLabel(selectedSize, t)}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSize(s); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border-2 transition-all ${
                    selectedSize === s
                      ? "border-[#5E9E8C] bg-[#EAF2F0] text-[#5E9E8C]"
                      : "border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C]"
                  }`}
                >
                  {sizeLabel(s, t)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center border-2 border-[#DDD5CC] rounded-xl overflow-hidden flex-shrink-0">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty((q) => Math.max(1, q - 1)); }}
              disabled={qty <= 1}
              className="w-9 h-10 flex items-center justify-center font-bold text-[#2A2320] hover:bg-[#EDE5D8] active:scale-90 transition-all disabled:opacity-30 text-base"
            >
              −
            </button>
            <span className="w-8 text-center font-extrabold text-[#2A2320] text-sm select-none">{qty}</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty((q) => Math.min(qtyMax, q + 1)); }}
              disabled={qty >= qtyMax}
              className="w-9 h-10 flex items-center justify-center font-bold text-[#2A2320] hover:bg-[#EDE5D8] active:scale-90 transition-all text-base disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={soldOut}
            className={`flex-1 h-10 rounded-xl font-bold text-white text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${
              status === "added" ? "bg-green-500" :
              status === "blocked" || soldOut ? "bg-red-500" :
              "hover:opacity-90 active:scale-95"
            } ${soldOut ? "cursor-not-allowed" : ""}`}
            style={status === "idle" && !soldOut ? { backgroundColor: "#5E9E8C" } : {}}
          >
            {status === "added" ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t("quick.added")}
              </>
            ) : status === "blocked" ? t("cart.cantAddMore") : soldOut ? t("pdp.outOfStockBtn") : `🛒 ${t("common.addToCart")}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
