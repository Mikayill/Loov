"use client";

import Link from "next/link";
import { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { discountPercent, effectivePrice, hasVariablePricing, minEffectivePrice } from "@/lib/pricing";
import { useLocale } from "@/context/LocaleContext";
import { categoryLabel } from "@/lib/i18n/labels";
import WishlistButton from "./WishlistButton";
import QuickAddButton from "./QuickAddButton";
import QuickViewButton from "./QuickViewButton";

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
          <h3 className="font-semibold text-ink text-[13.5px] mb-2 leading-snug line-clamp-2 group-hover:underline underline-offset-4 decoration-ink/70">
            {product.name}
          </h3>
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
        </div>
      </div>
    </Link>
  );
}
