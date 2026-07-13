"use client";

/**
 * Quick View for bundle cards — mirrors the product QuickViewButton.
 * Shows the bundle photo, what's inside (with product photos + prices),
 * the live "separately vs bundle" math and a one-click "Add to cart"
 * (default color/size per item — configurable on the detail page).
 */

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import type { Bundle, BundleProductConfig } from "@/lib/bundles";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
import { useLocale } from "@/context/LocaleContext";
import { useDelayedUnmount } from "@/hooks/useDelayedUnmount";
import { variantStock } from "@/lib/stock";

/** Stock for a bundle item's fixed default variant (colors[0]/sizes[0] — this
 *  component doesn't offer a picker, see quickAddNote). */
function isDefaultVariantOOS(product: Product): boolean {
  const s = variantStock(product, product.sizes[0], product.colors[0]);
  return s !== null && s <= 0;
}

export interface BundleQuickViewItem {
  config: BundleProductConfig;
  product: Product | null;
}

export default function BundleQuickView({
  bundle,
  itemProducts,
}: {
  bundle: Bundle;
  itemProducts: BundleQuickViewItem[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"idle" | "added" | "blocked">("idle");
  const shouldRenderModal = useDelayedUnmount(open, 160);

  useEffect(() => { setMounted(true); }, []);

  const close = useCallback(() => { setOpen(false); setStatus("idle"); }, []);

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

  const resolved = itemProducts.filter((x): x is { config: BundleProductConfig; product: Product } => !!x.product);

  /* Live money — same rules as the bundle detail page (default sizes). */
  const separately = resolved.reduce(
    (s, { product, config }) => s + effectivePrice(product, product.sizes[0]) * (config.quantity ?? 1),
    0
  );
  const savings = Math.max(0, separately - bundle.bundlePrice);
  const savingsPct = separately > 0 ? Math.round((savings / separately) * 100) : 0;
  const outOfStock = resolved.some(({ product }) => isDefaultVariantOOS(product));

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setStatus("idle");
    setOpen(true);
  }

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || resolved.length === 0) return;
    let anyAdded = false;
    resolved.forEach(({ product, config }) => {
      const result = addItem(product, product.colors[0], product.sizes[0], config.quantity ?? 1, bundle.slug);
      if (result.added > 0) anyAdded = true;
    });
    if (!anyAdded) {
      setStatus("blocked");
      setTimeout(() => setStatus("idle"), 1800);
      return;
    }
    setStatus("added");
    setTimeout(() => close(), 1400);
  }

  return (
    <>
      {/* Trigger — appears on card hover, same pattern as product cards */}
      <button
        onClick={handleOpen}
        aria-label="Quick view bundle"
        className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[#2A2320] text-[10px] font-bold shadow-md opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap border border-[#DDD5CC] hover:bg-[#5E9E8C] hover:text-white hover:border-[#5E9E8C] z-10"
      >
        👁 {t("quick.view")}
      </button>

      {mounted && shouldRenderModal && createPortal(
        <div
          className={`fixed inset-0 z-[500] flex items-center justify-center p-4 ${open ? "animate-fade-in" : "animate-fade-out"}`}
          style={{ backgroundColor: "rgba(42,35,32,0.55)", backdropFilter: "blur(4px)" }}
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bundle-quick-view-title"
            className={`bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${open ? "animate-pop-in" : "animate-pop-out"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F5F0EB] flex-shrink-0">
              <span className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest">{t("quick.view")}</span>
              <button
                onClick={close}
                aria-label="Close quick view"
                className="w-7 h-7 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#5E5450] hover:bg-[#EDE5D8] transition-all active:scale-90 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {/* Bundle header */}
              <div className="flex gap-4 mb-4">
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: bundle.cardColor }}
                >
                  {bundle.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-full object-cover" />
                  ) : (
                    bundle.emoji
                  )}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  {bundle.isNew && (
                    <span className="inline-block bg-[#5E9E8C] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide mb-1">
                      {t("product.new")}
                    </span>
                  )}
                  <h3 id="bundle-quick-view-title" className="font-extrabold text-[#2A2320] text-sm leading-snug mb-0.5 line-clamp-2">{bundle.name}</h3>
                  <p className="text-[11px] text-[#9A8E88] line-clamp-2">{bundle.tagline}</p>
                </div>
              </div>

              {/* What's inside */}
              <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-2">
                {t("bundleq.whatsInside").replace("{n}", String(resolved.reduce((s, x) => s + (x.config.quantity ?? 1), 0)))}
              </p>
              <div className="space-y-1.5 mb-4">
                {itemProducts.map(({ config, product }, i) => (
                  <div key={`${config.slug}-${i}`} className="flex items-center gap-2.5 bg-[#FAFAF8] rounded-xl border border-[#F0E8E0] p-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: product?.cardColor ?? "#F5F0EB" }}
                    >
                      {product?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={config.label} className="w-full h-full object-cover" />
                      ) : (product?.emoji ?? "🍼")}
                    </div>
                    <p className="flex-1 min-w-0 text-xs font-semibold text-[#2A2320] truncate">
                      {config.quantity && config.quantity > 1 && <span className="text-[#5E9E8C] font-extrabold">{config.quantity}× </span>}
                      {config.label}
                      {product && isDefaultVariantOOS(product) && (
                        <span className="ml-1.5 text-[9px] font-bold text-red-500 uppercase">{t("product.outOfStock")}</span>
                      )}
                    </p>
                    {product && (
                      <span className="text-xs font-bold text-[#9A8E88] flex-shrink-0">
                        {formatPrice(effectivePrice(product, product.sizes[0]) * (config.quantity ?? 1))}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Money */}
              <div className="bg-[#EAF2F0] border border-[#B9D9CF] rounded-xl p-3 mb-4 text-xs space-y-1">
                <div className="flex justify-between text-[#3A6B5E]">
                  <span>{t("bundleq.separately")}</span>
                  <span className="line-through">{formatPrice(separately)}</span>
                </div>
                <div className="flex justify-between items-baseline text-[#2A2320]">
                  <span className="font-bold">{t("bundleq.bundlePrice")}</span>
                  <span className="text-lg font-extrabold">{formatPrice(bundle.bundlePrice)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-[#3A6B5E] font-bold pt-1 border-t border-[#B9D9CF]">
                    <span>{t("bundleq.youSave")}</span>
                    <span>{formatPrice(savings)} ({savingsPct}%)</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <button
                onClick={handleAdd}
                disabled={outOfStock || resolved.length === 0}
                className={`w-full h-11 rounded-xl font-extrabold text-white text-sm transition-all duration-300 flex items-center justify-center gap-1.5 mb-2 ${
                  status === "added" ? "bg-green-500" :
                  status === "blocked" || outOfStock ? "bg-red-500" :
                  "hover:opacity-90 active:scale-95"
                } ${outOfStock ? "cursor-not-allowed" : ""}`}
                style={status === "idle" && !outOfStock ? { backgroundColor: "#5E9E8C" } : {}}
              >
                {status === "added" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t("bundleq.addedBundle")}
                  </>
                ) : status === "blocked" ? (
                  t("cart.cantAddMore")
                ) : outOfStock ? (
                  t("bundleq.itemOOS")
                ) : (
                  <>🛒 {t("bundleq.addBundle")} · {formatPrice(bundle.bundlePrice)}</>
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); close(); router.push(`/bundles/${bundle.slug}`); }}
                className="w-full h-10 rounded-xl border-2 border-[#DDD5CC] font-bold text-xs text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-colors"
              >
                {t("bundleq.configure")}
              </button>
              <p className="text-center text-[10px] text-[#9A8E88] mt-2">
                {t("bundleq.quickAddNote")}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
