"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { discountPercent, discountDaysLeft, effectivePrice, hasVariablePricing, minEffectivePrice } from "@/lib/pricing";
import { useLocale } from "@/context/LocaleContext";
import { categoryLabel } from "@/lib/i18n/labels";
import WishlistButton from "./WishlistButton";
import QuickAddButton from "./QuickAddButton";
import QuickViewButton from "./QuickViewButton";

/* Small star row — review average, or a full 5 stars until the first review. */
function Stars({ rating }: { rating?: { avg: number; count: number } }) {
  const filled = rating && rating.count > 0 ? Math.round(rating.avg) : 5;
  return (
    <span className="flex items-center gap-1" aria-label={rating ? `${rating.avg}/5` : "5/5"}>
      <span className="flex items-center gap-px">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} className={`w-3 h-3 ${s <= filled ? "fill-star" : "fill-line"}`} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </span>
      {rating && rating.count > 0 && (
        <span className="text-[10px] text-ink-muted font-medium tabular-nums">
          {rating.avg.toFixed(1)} ({rating.count})
        </span>
      )}
    </span>
  );
}

/* "{n} days left / Last day!" — rendered after mount so SSR and the client
   clock can't disagree mid-hydration. */
export function DealCountdown({ product, className = "" }: { product: Product; className?: string }) {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const days = discountDaysLeft(product);
  if (days === null) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-danger ${className}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {days <= 1 ? t("deal.lastDay") : t("deal.daysLeft").replace("{n}", String(days))}
    </span>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const { t } = useLocale();
  const off = discountPercent(product);
  /* Sizes can have their own prices → cards show the lowest ("from"). */
  const variable = hasVariablePricing(product);
  const price = variable ? minEffectivePrice(product) : effectivePrice(product);
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Nordic: frameless card — flat tinted image well + typographic info block */}
      <div className="bg-canvas transition-colors">
        {/* Image well */}
        <div
          className="relative flex items-center justify-center aspect-square text-6xl select-none overflow-hidden rounded-control"
          style={{ backgroundColor: product.cardColor }}
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <span className="group-hover:scale-105 transition-transform duration-300 inline-block">
              {product.emoji}
            </span>
          )}

          {product.isNew && (
            <span className="absolute top-3 left-3 bg-canvas/90 text-accent text-[10px] font-bold px-2 py-1 rounded-control uppercase tracking-[0.14em]">
              {t("product.new")}
            </span>
          )}
          {off > 0 && (
            <span className={`absolute ${product.isNew ? "top-11" : "top-3"} left-3 bg-canvas/90 text-danger text-[10px] font-extrabold px-2 py-1 rounded-control tracking-[0.08em]`}>
              −{off}%
            </span>
          )}

          <WishlistButton productId={product.id} price={product.price} />
          <QuickViewButton product={product} />
        </div>

        {/* Info — typographic, no chrome */}
        <div className="pt-3 pb-4 px-1">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-1">
            {categoryLabel(product.category, t)}
          </p>
          <h3 className="font-semibold text-ink text-[13.5px] mb-1.5 leading-snug line-clamp-2 group-hover:underline underline-offset-4 decoration-ink/70">
            {product.name}
          </h3>
          <div className="mb-2"><Stars rating={product.rating} /></div>
          <div className="flex items-center justify-between">
            <span className="flex items-baseline gap-1.5">
              {variable && (
                <span className="text-[10px] font-semibold text-ink-muted">{t("common.from")}</span>
              )}
              <span className={`text-[15px] font-bold tabular-nums ${off > 0 ? "text-danger" : "text-ink"}`}>
                {formatPrice(price)}
              </span>
              {off > 0 && (
                <span className="text-xs text-ink-muted line-through tabular-nums">{formatPrice(product.price)}</span>
              )}
            </span>
            <QuickAddButton product={product} />
          </div>
          {off > 0 && <DealCountdown product={product} className="mt-1" />}
        </div>
      </div>
    </Link>
  );
}
