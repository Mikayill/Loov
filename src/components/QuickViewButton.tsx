"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product } from "@/types";
import { formatAmount, formatPrice } from "@/lib/format";
import { effectivePrice, basePriceForSize, discountPercent } from "@/lib/pricing";
import { useLocale } from "@/context/LocaleContext";
import { useSettings } from "@/lib/db/useSettings";
import { colorLabel, sizeLabel, categoryLabel } from "@/lib/i18n/labels";
import { useDelayedUnmount } from "@/hooks/useDelayedUnmount";
import { variantStock } from "@/lib/stock";
import { Stars, DealCountdown } from "./ProductCard";

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

  const { deliveryMinDays, deliveryMaxDays } = useSettings();
  const [open, setOpen]           = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [selectedColor, setColor] = useState(product.colors[0]);
  const [selectedSize, setSize]   = useState(product.sizes[0]);
  const [qty, setQty]             = useState(1);
  const [qvImg, setQvImg]         = useState(0);
  const [status, setStatus]       = useState<"idle" | "added" | "blocked">("idle");
  const shouldRenderModal = useDelayedUnmount(open, 200);
  const gallery = product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
  const off = discountPercent(product);
  const unitPrice = effectivePrice(product, selectedSize);
  const unitBase = basePriceForSize(product, selectedSize);

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
    setQvImg(0);
    setStatus("idle");
    setOpen(true);
  }

  return (
    <>
      {/* Trigger — bottom center of card image, appears on hover */}
      <button
        onClick={handleOpen}
        aria-label="Quick view"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-control bg-canvas/90 backdrop-blur-sm text-ink text-[10.5px] font-semibold uppercase tracking-[0.08em] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap border border-line hover:bg-ink hover:text-white hover:border-ink"
      >
        👁 {t("quick.view")}
      </button>

      {/* Modal via portal — mounted at document.body, NOT inside the Link wrapper */}
      {mounted && shouldRenderModal && createPortal(
        <div
          className={`fixed inset-0 z-[500] flex items-center justify-center p-4 ${open ? "animate-fade-in" : "animate-fade-out"}`}
          style={{ backgroundColor: "rgba(42,35,32,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); close(); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-view-title"
            className={`bg-canvas rounded-card w-full max-w-sm md:max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl ${open ? "animate-pop-in" : "animate-pop-out"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-canvas">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">{t("quick.view")}</span>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); close(); }}
                aria-label="Close quick view"
                className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-ink-soft hover:bg-panel transition-all active:scale-90 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 md:grid md:grid-cols-2 md:gap-6">
              {/* ── LEFT (md+): gallery — main photo + thumbs ── */}
              <div className="hidden md:flex flex-col gap-3">
                <div
                  className="relative aspect-square rounded-card overflow-hidden border border-line flex items-center justify-center text-8xl"
                  style={{ backgroundColor: product.cardColor }}
                >
                  {gallery.length > 0 ? (
                    gallery.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt={product.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${i === qvImg ? "opacity-100" : "opacity-0"}`}
                      />
                    ))
                  ) : (
                    <span>{product.emoji}</span>
                  )}
                  {product.isNew && (
                    <span className="absolute top-3 left-3 bg-canvas/90 text-accent text-[10px] font-bold px-2 py-1 rounded-control uppercase tracking-[0.14em]">
                      {t("product.new")}
                    </span>
                  )}
                  {gallery.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setQvImg((i) => (i - 1 + gallery.length) % gallery.length); }}
                        aria-label="Previous photo"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-canvas/90 border border-line flex items-center justify-center text-ink hover:bg-ink hover:text-white transition-colors active:scale-90"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setQvImg((i) => (i + 1) % gallery.length); }}
                        aria-label="Next photo"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-canvas/90 border border-line flex items-center justify-center text-ink hover:bg-ink hover:text-white transition-colors active:scale-90"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </>
                  )}
                </div>
                {gallery.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {gallery.slice(0, 5).map((src, i) => (
                      <button
                        key={src}
                        onClick={(e) => { e.stopPropagation(); setQvImg(i); }}
                        className={`aspect-square rounded-control border overflow-hidden transition-all ${i === qvImg ? "border-ink" : "border-line hover:border-ink-muted"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── RIGHT: info + selectors ── */}
              <div>
              {/* Product header (thumb only on mobile — desktop has the gallery) */}
              <div className="flex gap-4 mb-4">
                <div
                  className="md:hidden w-20 h-20 rounded-control flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden"
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-semibold text-ink-muted uppercase tracking-[0.14em]">{categoryLabel(product.category, t)}</span>
                    {product.isNew && (
                      <span className="text-accent text-[9px] font-bold uppercase tracking-[0.14em]">{t("product.new")}</span>
                    )}
                  </div>
                  <h3 id="quick-view-title" className="font-bold text-ink text-[15px] leading-snug mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="mb-1.5"><Stars rating={product.rating} /></div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-xl font-extrabold tabular-nums ${off > 0 ? "text-danger" : "text-ink"}`}>
                      {formatAmount(unitPrice)} <span className="text-sm font-bold">₾</span>
                    </span>
                    {off > 0 && (
                      <>
                        <span className="text-sm text-ink-muted line-through tabular-nums">{formatPrice(unitBase)}</span>
                        <span className="text-[10px] font-extrabold text-danger bg-danger-soft px-1.5 py-0.5 rounded-control">−{off}%</span>
                        <DealCountdown product={product} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Color */}
              <div className="mb-3">
                <p className="text-[11px] font-bold text-ink mb-1.5">
                  {t("product.color")}: <span className="text-accent font-semibold">{colorLabel(selectedColor, t)}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={(e) => { e.stopPropagation(); setColor(c); }}
                      title={colorLabel(c, t)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        selectedColor === c
                          ? "border-accent ring-2 ring-accent ring-offset-1 scale-110"
                          : "border-line hover:border-ink-muted hover:scale-105"
                      }`}
                      style={{ backgroundColor: hex(c) }}
                    />
                  ))}
                </div>
              </div>

              {/* Size */}
              {product.sizes[0] !== "One Size" && (
                <div className="mb-3">
                  <p className="text-[11px] font-bold text-ink mb-1.5">
                    {t("product.size")}: <span className="text-accent font-semibold">{sizeLabel(selectedSize, t)}</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={(e) => { e.stopPropagation(); setSize(s); }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border-2 transition-all ${
                          selectedSize === s
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-line text-ink-soft hover:border-accent"
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
                <div className="flex items-center border-2 border-line rounded-control overflow-hidden flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setQty((q) => Math.max(1, q - 1)); }}
                    className="w-9 h-10 flex items-center justify-center font-bold text-ink hover:bg-panel transition-colors disabled:opacity-30 text-base"
                    disabled={qty <= 1}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-extrabold text-ink text-sm select-none">{qty}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setQty((q) => Math.min(qtyMax, q + 1)); }}
                    disabled={qty >= qtyMax}
                    className="w-9 h-10 flex items-center justify-center font-bold text-ink hover:bg-panel transition-colors text-base disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={soldOut}
                  className={`flex-1 h-10 rounded-control font-bold text-white text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    status === "added" ? "bg-green-500" :
                    status === "blocked" || soldOut ? "bg-red-500" :
                    "hover:opacity-90 active:scale-95"
                  } ${soldOut ? "cursor-not-allowed" : ""}`}
                  style={status === "idle" && !soldOut ? { backgroundColor: "var(--color-accent)" } : {}}
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
                  className={`flex-1 h-9 rounded-control border-2 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    has(product.id)
                      ? "border-red-400 bg-red-50 text-red-500"
                      : "border-line text-ink-soft hover:border-accent hover:text-accent"
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill={has(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {has(product.id) ? t("quick.saved") : t("quick.wishlist")}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); close(); router.push(`/products/${product.slug}`); }}
                  className="flex-1 h-9 rounded-control border-2 border-line font-semibold text-xs text-ink-soft hover:border-accent hover:text-accent transition-colors flex items-center justify-center"
                >
                  {t("quick.viewDetails")} →
                </button>
              </div>

              {/* Delivery + low-stock facts */}
              <div className="mt-3 pt-3 border-t border-line space-y-1.5">
                <p className="text-[11px] text-ink-soft flex items-center gap-1.5">
                  <span aria-hidden>🚚</span>
                  {t("topbar.delivery").replace("{min}", String(deliveryMinDays)).replace("{max}", String(deliveryMaxDays))}
                </p>
                {!soldOut && stock !== null && stock <= 5 && (
                  <p className="text-[11px] font-bold text-orange-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" aria-hidden />
                    {t("pdp.onlyLeft").replace("{n}", String(stock))}
                  </p>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
