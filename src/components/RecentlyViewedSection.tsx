"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Product } from "@/types";
import { useLocale } from "@/context/LocaleContext";
import { categoryLabel } from "@/lib/i18n/labels";
import { useProducts } from "@/lib/db/useProducts";
import { formatPrice } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";

const STORAGE_KEY = "loov_recently_viewed";

export function trackProductView(productId: string) {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const updated = [productId, ...existing.filter((id) => id !== productId)].slice(0, 8);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export default function RecentlyViewedSection({ excludeId }: { excludeId?: string }) {
  const { t } = useLocale();
  const products = useProducts();
  const [viewed, setViewed] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      const result = ids
        .filter((id) => id !== excludeId)
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean) as Product[];
      setViewed(result.slice(0, 4));
    } catch {
      // ignore
    }
  }, [excludeId, products]);

  if (viewed.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-extrabold text-[#2A2320]">{t("widget.recentlyViewed")}</h2>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            setViewed([]);
          }}
          className="text-xs text-[#9A8E88] hover:text-red-400 transition-colors font-semibold"
        >
          {t("widget.clearHistory")}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {viewed.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div
              className="flex items-center justify-center h-28 text-5xl"
              style={{ backgroundColor: product.cardColor }}
            >
              <span className="group-hover:scale-110 transition-transform duration-200">
                {product.emoji}
              </span>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-0.5">
                {categoryLabel(product.category, t)}
              </p>
              <p className="text-xs font-bold text-[#2A2320] group-hover:text-[#5E9E8C] transition-colors leading-snug line-clamp-2 mb-1">
                {product.name}
              </p>
              <p className="text-sm font-extrabold text-[#2A2320]">{formatPrice(effectivePrice(product))}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
