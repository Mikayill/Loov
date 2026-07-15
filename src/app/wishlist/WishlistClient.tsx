"use client";

import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { useProductsByIds } from "@/lib/db/useProductsByIds";
import { formatPrice } from "@/lib/format";
import { useState, useCallback } from "react";
import { useLocale } from "@/context/LocaleContext";
import ProductCard from "@/components/ProductCard";
import { hasAnyStock, firstAvailableVariant } from "@/lib/stock";

export default function WishlistClient() {
  const { t } = useLocale();
  const { ids, priceDrop, lowStock, lowStockCount } = useWishlist();
  const saved = useProductsByIds(ids);
  const { addItem } = useCart();
  const [shared, setShared] = useState(false);
  const [addAllStatus, setAddAllStatus] = useState<"idle" | "added" | "blocked">("idle");

  /* Share = a real text summary of the saved products (native share sheet,
     or copy the same text) — the old button just shared the /wishlist URL
     itself, which opens to whoever clicks it's OWN wishlist (or an empty
     one), not the sender's saved items. There's no shared/public wishlist
     page to link to, so a text list is the honest thing that actually works. */
  const handleShare = useCallback(() => {
    const lines = saved.map((p) => `• ${p.name} — ${formatPrice(p.price)}`);
    const text = `${t("wl.shareIntro")}\n\n${lines.join("\n")}`;
    if (typeof navigator.share === "function") {
      navigator.share({ title: "Loov", text }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(text).then(() => {
      setShared(true);
      setTimeout(() => setShared(false), 2200);
    });
  }, [saved, t]);

  const inStockSaved = saved.filter(hasAnyStock);
  function handleAddAll() {
    if (inStockSaved.length === 0) return;
    let anyAdded = false;
    for (const p of inStockSaved) {
      const variant = firstAvailableVariant(p);
      if (!variant) continue;
      const result = addItem(p, variant.color, variant.size, 1);
      if (result.added > 0) anyAdded = true;
    }
    if (!anyAdded) {
      setAddAllStatus("blocked");
      setTimeout(() => setAddAllStatus("idle"), 1800);
      return;
    }
    setAddAllStatus("added");
    setTimeout(() => setAddAllStatus("idle"), 2500);
  }

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-28 h-28 rounded-full bg-panel flex items-center justify-center text-5xl mb-6">
          🤍
        </div>
        <h2 className="text-2xl font-extrabold text-ink mb-3">
          {t("wl.emptyTitle")}
        </h2>
        <p className="text-ink-soft mb-8 max-w-sm text-sm leading-relaxed">
          {t("wl.emptySubtitle")}
        </p>
        <Link
          href="/"
          className="u-btn inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-control text-white active:scale-95 shadow-sm transition-all bg-ink hover:bg-ink/85"
        >
          {t("wl.browseProducts")} →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">{t("wl.title")}</h1>
          <p className="text-ink-muted text-sm mt-1">
            {saved.length === 1 ? t("wl.saved1") : t("wl.saved").replace("{n}", String(saved.length))}
          </p>
          {lowStockCount > 0 && (
            <p className="text-xs font-bold text-warning mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warning u-skeleton inline-block" />
              {t("wl.lowStockNote").replace("{n}", String(lowStockCount))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {inStockSaved.length > 1 && (
            <button
              onClick={handleAddAll}
              className={`u-btn text-[12px] uppercase tracking-[0.06em] font-semibold px-4 py-2 rounded-control transition-all active:scale-95 ${
                addAllStatus === "added"
                  ? "bg-accent text-white"
                  : addAllStatus === "blocked"
                  ? "bg-danger text-white"
                  : "bg-ink text-white hover:bg-ink/85"
              }`}
            >
              {addAllStatus === "added" ? `✓ ${t("quick.added")}` : addAllStatus === "blocked" ? t("cart.cantAddMore") : t("wl.addAll")}
            </button>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink border border-line hover:border-ink px-3 py-1.5 rounded-control transition-all active:scale-95"
          >
            {shared ? (
              <>
                <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-accent">{t("wl.copied")}</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t("wl.share")}
              </>
            )}
          </button>
          <Link
            href="/"
            className="text-sm font-semibold text-accent hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t("common.continueShopping")}
          </Link>
        </div>
      </div>

      {/* Grid — the same ProductCard used everywhere else on the site, so a
          saved item's badges/QuickAdd/QuickView all behave identically here.
          Removing from the wishlist is the heart icon itself (already red),
          matching how it works on every other product card. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-8">
        {saved.map((product) => {
          const left = lowStock(product.id);
          const oldPrice = priceDrop(product.id);
          return (
            <div key={product.id}>
              <ProductCard product={product} />
              {(left !== null || oldPrice !== null) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {left !== null && (
                    <span className="text-[10px] font-bold text-warning bg-warning-soft border border-warning-border rounded-full px-2 py-0.5">
                      🔥 {t("pdp.onlyLeft").replace("{n}", String(left))}
                    </span>
                  )}
                  {oldPrice !== null && (
                    <span className="text-[10px] font-bold text-white bg-danger px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {t("wl.priceDrop")}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
