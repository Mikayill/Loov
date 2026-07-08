"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { CartItem } from "@/types";
import { formatPrice } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
import { useSettings } from "@/lib/db/useSettings";
import { useLocale } from "@/context/LocaleContext";
import { colorLabel, sizeLabel } from "@/lib/i18n/labels";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

function DrawerItem({
  item,
  onRemove,
  onQty,
  t,
}: {
  item: CartItem;
  onRemove: () => void;
  onQty: (n: number) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="flex items-start gap-3 py-4 border-b border-[#F0E8E0] last:border-0">
      {/* Thumb */}
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden"
        style={{ backgroundColor: item.product.cardColor }}
      >
        {item.product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
        ) : (
          item.product.emoji
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#2A2320] text-sm leading-snug line-clamp-2 mb-0.5">
          {item.product.name}
        </p>
        <p className="text-[11px] text-[#9A8E88] mb-2">
          {colorLabel(item.selectedColor, t)}
          {item.selectedSize !== "One Size" && ` · ${sizeLabel(item.selectedSize, t)}`}
        </p>

        <div className="flex items-center justify-between">
          {/* Qty */}
          <div className="flex items-center border border-[#DDD5CC] rounded-lg overflow-hidden">
            <button
              onClick={() => onQty(item.quantity - 1)}
              className="w-7 h-7 flex items-center justify-center text-[#2A2320] font-bold hover:bg-[#F5F0EB] transition-colors disabled:opacity-30 text-sm"
              disabled={item.quantity <= 1}
            >
              −
            </button>
            <span className="w-7 text-center text-xs font-extrabold text-[#2A2320] select-none">
              {item.quantity}
            </span>
            <button
              onClick={() => onQty(item.quantity + 1)}
              className="w-7 h-7 flex items-center justify-center text-[#2A2320] font-bold hover:bg-[#F5F0EB] transition-colors text-sm"
            >
              +
            </button>
          </div>

          {/* Price + remove */}
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-[#2A2320] text-sm">
              {formatPrice(effectivePrice(item.product, item.selectedSize) * item.quantity)}
            </span>
            <button
              onClick={onRemove}
              aria-label="Remove"
              className="w-6 h-6 rounded-full bg-[#F5F0EB] text-[#9A8E88] hover:bg-red-50 hover:text-red-400 flex items-center justify-center text-xs font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const { t } = useLocale();
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const { freeShippingThreshold: FREE_THRESHOLD, standardShippingPrice: SHIPPING_COST } = useSettings();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  /* Open on addItem event */
  useEffect(() => {
    function onAdded() { setOpen(true); }
    window.addEventListener("loov:cart:added", onAdded);
    return () => window.removeEventListener("loov:cart:added", onAdded);
  }, []);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const shipping     = totalPrice >= FREE_THRESHOLD ? 0 : SHIPPING_COST;
  const total        = totalPrice + shipping;
  const toFree       = Math.max(0, FREE_THRESHOLD - totalPrice);
  const progressPct  = Math.min(100, (totalPrice / FREE_THRESHOLD) * 100);

  function handleQty(productId: string, color: string, size: string, next: number, bundleSlug?: string) {
    if (next < 1) removeItem(productId, color, size, bundleSlug);
    else updateQuantity(productId, color, size, next, bundleSlug);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[400] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: "rgba(42,35,32,0.5)", backdropFilter: "blur(3px)" }}
        onClick={close}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-[401] w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDD5CC] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h2 className="font-extrabold text-[#2A2320] text-base">{t("cart.title")}</h2>
            {totalItems > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#5E9E8C", color: "white" }}>
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={close}
            aria-label="Close cart"
            className="w-9 h-9 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#5E5450] hover:bg-[#EDE5D8] transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        {/* Free shipping bar */}
        {items.length > 0 && (
          <div className="px-5 py-3 border-b border-[#F0E8E0] flex-shrink-0" style={{ backgroundColor: "#EAF2F0" }}>
            {toFree > 0 ? (
              <>
                <p className="text-xs font-semibold text-[#5E5450] mb-1.5">
                  {t("drawer.addMore").split("{amount}")[0]}
                  <span className="font-extrabold text-[#5E9E8C]">{formatPrice(toFree)}</span>
                  {t("drawer.addMore").split("{amount}")[1]}
                </p>
                <div className="h-2 bg-[#C8DDD8] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%`, backgroundColor: "#5E9E8C" }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 font-bold text-[#5E9E8C] text-sm">
                <span>🎉</span>
                <span>{t("drawer.freeUnlocked")}</span>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-5xl mb-4">🛒</div>
              <p className="font-bold text-[#2A2320] mb-2">{t("cart.empty.title")}</p>
              <p className="text-sm text-[#9A8E88] mb-6">{t("drawer.emptySubtitle")}</p>
              <Link
                href="/products"
                onClick={close}
                className="font-bold px-6 py-2.5 rounded-full text-white text-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#5E9E8C" }}
              >
                {t("drawer.shopNow")} →
              </Link>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <DrawerItem
                  key={`${item.product.id}::${item.selectedColor}::${item.selectedSize}::${item.bundleSlug ?? ""}`}
                  item={item}
                  onRemove={() => removeItem(item.product.id, item.selectedColor, item.selectedSize, item.bundleSlug)}
                  onQty={(n) => handleQty(item.product.id, item.selectedColor, item.selectedSize, n, item.bundleSlug)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-5 border-t border-[#DDD5CC] flex-shrink-0 space-y-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#5E5450] font-medium">{t("cart.subtotal")}</span>
              <span className="font-bold text-[#2A2320]">{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#5E5450] font-medium">{t("cart.shipping")}</span>
              {shipping === 0 ? (
                <span className="font-bold text-[#5E9E8C]">{t("cart.free")} 🎉</span>
              ) : (
                <span className="font-bold text-[#2A2320]">{formatPrice(shipping)}</span>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#F0E8E0]">
              <span className="font-extrabold text-[#2A2320] text-lg">{t("cart.total")}</span>
              <span className="font-extrabold text-[#2A2320] text-2xl">{formatPrice(total)}</span>
            </div>

            {/* CTA buttons */}
            <Link
              href="/checkout"
              onClick={close}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
              style={{ backgroundColor: "#5E9E8C" }}
            >
              {t("drawer.checkout")} →
            </Link>
            <Link
              href="/cart"
              onClick={close}
              className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-[#DDD5CC] text-[#5E5450] flex items-center justify-center hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-colors"
            >
              {t("drawer.viewCart")}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
