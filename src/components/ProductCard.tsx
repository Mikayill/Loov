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
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-[#DDD5CC]">
        {/* Image area */}
        <div
          className="relative flex items-center justify-center h-44 text-6xl select-none overflow-hidden"
          style={{ backgroundColor: product.cardColor }}
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <span className="group-hover:scale-110 transition-transform duration-300 inline-block">
              {product.emoji}
            </span>
          )}

          {product.isNew && (
            <span className="absolute top-3 left-3 bg-[#5E9E8C] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm">
              {t("product.new")}
            </span>
          )}
          {off > 0 && (
            <span className={`absolute ${product.isNew ? "top-11" : "top-3"} left-3 bg-[#D9534F] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm`}>
              −{off}%
            </span>
          )}

          <WishlistButton productId={product.id} />
          <QuickViewButton product={product} />
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1">
            {categoryLabel(product.category, t)}
          </p>
          <h3 className="font-bold text-[#2A2320] text-sm mb-3 group-hover:text-[#5E9E8C] transition-colors leading-snug line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="flex items-baseline gap-1.5">
              {variable && (
                <span className="text-[10px] font-semibold text-[#9A8E88]">{t("common.from")}</span>
              )}
              <span className={`text-lg font-extrabold ${off > 0 ? "text-[#D9534F]" : "text-[#2A2320]"}`}>
                {formatPrice(price)}
              </span>
              {off > 0 && (
                <span className="text-xs text-[#9A8E88] line-through">{formatPrice(product.price)}</span>
              )}
            </span>
            <QuickAddButton product={product} />
          </div>
        </div>
      </div>
    </Link>
  );
}
