"use client";

import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/lib/db/useProducts";
import { formatPrice } from "@/lib/format";
import { effectivePrice, discountPercent } from "@/lib/pricing";
import { Product } from "@/types";
import { useState, useCallback } from "react";
import { useLocale } from "@/context/LocaleContext";
import { categoryLabel } from "@/lib/i18n/labels";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

function AddToCartInline({ product, t }: { product: Product; t: (key: TranslationKey) => string }) {
  const { addItem } = useCart();
  const [done, setDone] = useState(false);
  const soldOut = product.stock !== undefined && product.stock <= 0;

  function handle() {
    if (soldOut) return;
    addItem(product, product.colors[0], product.sizes[0]);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  if (soldOut) {
    return (
      <button disabled className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#EDE5D8] text-[#9A8E88] cursor-not-allowed">
        {t("product.outOfStock")}
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
        done
          ? "bg-green-500 text-white"
          : "text-white hover:opacity-90 active:scale-95"
      }`}
      style={!done ? { backgroundColor: "#5E9E8C" } : {}}
    >
      {done ? `✓ ${t("quick.added")}` : t("common.addToCart")}
    </button>
  );
}

export default function WishlistClient() {
  const { t } = useLocale();
  const products = useProducts();
  const { ids, toggle, priceDrop } = useWishlist();
  const saved = products.filter((p) => ids.includes(p.id));
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }, []);

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-28 h-28 rounded-full bg-[#EDE5D8] flex items-center justify-center text-5xl mb-6">
          🤍
        </div>
        <h2 className="text-2xl font-extrabold text-[#2A2320] mb-3">
          {t("wl.emptyTitle")}
        </h2>
        <p className="text-[#5E5450] mb-8 max-w-sm text-sm leading-relaxed">
          {t("wl.emptySubtitle")}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-full text-white hover:opacity-90 shadow-sm transition-opacity"
          style={{ backgroundColor: "#5E9E8C" }}
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
          <h1 className="text-3xl font-extrabold text-[#2A2320]">{t("wl.title")}</h1>
          <p className="text-[#9A8E88] text-sm mt-1">
            {saved.length === 1 ? t("wl.saved1") : t("wl.saved").replace("{n}", String(saved.length))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm font-bold text-[#9A8E88] hover:text-[#5E9E8C] border border-[#DDD5CC] hover:border-[#5E9E8C] px-3 py-1.5 rounded-full transition-all"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-[#5E9E8C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[#5E9E8C]">{t("wl.copied")}</span>
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
            className="text-sm font-semibold text-[#5E9E8C] hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t("common.continueShopping")}
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
        {saved.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Image */}
            <Link href={`/products/${product.slug}`}>
              <div
                className="relative flex items-center justify-center h-40 text-5xl select-none overflow-hidden"
                style={{ backgroundColor: product.cardColor }}
              >
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  product.emoji
                )}
                <button
                  onClick={(e) => { e.preventDefault(); toggle(product.id); }}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-red-400 text-white flex items-center justify-center shadow-sm hover:bg-red-500 transition-colors"
                  aria-label="Remove from wishlist"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </Link>

            {/* Info */}
            <div className="p-3.5">
              <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1">
                {categoryLabel(product.category, t)}
              </p>
              <Link href={`/products/${product.slug}`}>
                <h3 className="font-bold text-[#2A2320] text-sm mb-2 hover:text-[#5E9E8C] transition-colors line-clamp-2 leading-snug">
                  {product.name}
                </h3>
              </Link>
              {(() => {
                const oldPrice = priceDrop(product.id);
                return (
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[#2A2320]">
                      {formatPrice(effectivePrice(product))}
                      {discountPercent(product) > 0 && (
                        <span className="ml-1.5 text-xs text-[#9A8E88] line-through">{formatPrice(product.price)}</span>
                      )}
                    </span>
                    {oldPrice !== null && (
                      <>
                        <span className="text-xs text-[#9A8E88] line-through">{formatPrice(oldPrice)}</span>
                        <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          {t("wl.priceDrop")}
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}
              <AddToCartInline product={product} t={t} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
