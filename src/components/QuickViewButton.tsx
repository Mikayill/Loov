"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product } from "@/types";
import { formatAmount } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
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

export default function QuickViewButton({ product }: { product: Product }) {
  const { t } = useLocale();
  const router = useRouter();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();

  const [open, setOpen]           = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [selectedColor, setColor] = useState(product.colors[0]);
  const [selectedSize, setSize]   = useState(product.sizes[0]);
  const [qty, setQty]             = useState(1);
  const [status, setStatus]       = useState<"idle" | "added" | "blocked">("idle");
  const shouldRenderModal = useDelayedUnmount(open, 160);

  useEffect(() => { setMounted(true); }, []);

  const close = useCallback(() => { setOpen(false); setStatus("idle"); setQty(1); }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  const stock = variantStock(product, selectedSize, selectedColor);
  const soldOut = stock !== null && stock <= 0;
  const qtyMax = stock ?? Infinity;

  /* Switching color/size can lower the available stock below the current qty. */
  useEffect(() => {
    if (stock !== null) setQty((q) => Math.max(1, Math.min(q, stock)));
  }, [stock]);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    const result = addItem(product, selectedColor, selectedSize, Math.min(qty, qtyMax));
    // Stock may have already been maxed out by what's in the cart — flash
    // the button red instead of silently doing nothing (or claiming "Added").
    if (result.added <= 0) {
      setStatus("blocked");
      setTimeout(() => setStatus("idle"), 1800);
      return;
    }
    setStatus("added");
    setTimeout(() => { close(); }, 1400);
  }

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setColor(product.colors[0]);
    setSize(product.sizes[0]);
    setQty(1);
    setStatus("idle");
    setOpen(true);
  }

  return (
    <>
      {/* Trigger — bottom center of card image, appears on hover */}
      <button
        onClick={handleOpen}
        aria-label="Quick view"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-[#2A2320] text-[11px] font-bold shadow-md opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap border border-[#DDD5CC] hover:bg-[#5E9E8C] hover:text-white hover:border-[#5E9E8C]"
      >
        👁 {t("quick.view")}
      </button>

      {/* Modal via portal — mounted at document.body, NOT inside the Link wrapper */}
      {mounted && shouldRenderModal && createPortal(
        <div
          className={`fixed inset-0 z-[500] flex items-center justify-center p-4 ${open ? "animate-fade-in" : "animate-fade-out"}`}
          style={{ backgroundColor: "rgba(42,35,32,0.55)", backdropFilter: "blur(4px)" }}
          onClick={close}
        >
          <div
            className={`bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden ${open ? "animate-pop-in" : "animate-pop-out"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F5F0EB]">
              <span className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest">{t("quick.view")}</span>
              <button
                onClick={close}
                className="w-7 h-7 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#5E5450] hover:bg-[#EDE5D8] transition-all active:scale-90 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              {/* Product header */}
              <div className="flex gap-4 mb-4">
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: hex(selectedColor) === "#C8C8C8" ? product.cardColor : hex(selectedColor) + "55" }}
                >
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    product.emoji
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  {product.isNew && (
                    <span className="inline-block bg-[#5E9E8C] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide mb-1">
                      {t("product.new")}
                    </span>
                  )}
                  <h3 className="font-bold text-[#2A2320] text-sm leading-snug mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-lg font-extrabold text-[#2A2320]">
                    {formatAmount(effectivePrice(product, selectedSize) * qty)} <span className="text-sm font-bold">₾</span>
                  </p>
                </div>
              </div>

              {/* Color */}
              <div className="mb-3">
                <p className="text-[11px] font-bold text-[#2A2320] mb-1.5">
                  {t("product.color")}: <span className="text-[#5E9E8C] font-semibold">{colorLabel(selectedColor, t)}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={(e) => { e.stopPropagation(); setColor(c); }}
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

              {/* Size */}
              {product.sizes[0] !== "One Size" && (
                <div className="mb-3">
                  <p className="text-[11px] font-bold text-[#2A2320] mb-1.5">
                    {t("product.size")}: <span className="text-[#5E9E8C] font-semibold">{sizeLabel(selectedSize, t)}</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={(e) => { e.stopPropagation(); setSize(s); }}
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

              {/* Qty + Add to cart */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center border-2 border-[#DDD5CC] rounded-xl overflow-hidden flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setQty((q) => Math.max(1, q - 1)); }}
                    className="w-9 h-10 flex items-center justify-center font-bold text-[#2A2320] hover:bg-[#EDE5D8] transition-colors disabled:opacity-30 text-base"
                    disabled={qty <= 1}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-extrabold text-[#2A2320] text-sm select-none">{qty}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setQty((q) => Math.min(qtyMax, q + 1)); }}
                    disabled={qty >= qtyMax}
                    className="w-9 h-10 flex items-center justify-center font-bold text-[#2A2320] hover:bg-[#EDE5D8] transition-colors text-base disabled:opacity-30 disabled:cursor-not-allowed"
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

              {/* Wishlist + View details */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(product.id, product.price); }}
                  className={`flex-1 h-9 rounded-xl border-2 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    has(product.id)
                      ? "border-red-400 bg-red-50 text-red-500"
                      : "border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C]"
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill={has(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {has(product.id) ? t("quick.saved") : t("quick.wishlist")}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); close(); router.push(`/products/${product.slug}`); }}
                  className="flex-1 h-9 rounded-xl border-2 border-[#DDD5CC] font-semibold text-xs text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-colors flex items-center justify-center"
                >
                  {t("quick.viewDetails")} →
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
