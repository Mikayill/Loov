"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { categoryLabel } from "@/lib/i18n/labels";
import { useProductsByIds } from "@/lib/db/useProductsByIds";
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
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      setIds(stored.filter((id) => id !== excludeId).slice(0, 4));
    } catch {
      // ignore
    }
  }, [excludeId]);

  const viewed = useProductsByIds(ids);

  if (viewed.length === 0) return null;

  return (
    <section id="recently-viewed" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-extrabold text-ink">{t("widget.recentlyViewed")}</h2>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            setIds([]);
          }}
          className="text-xs text-ink-muted hover:text-red-400 transition-colors font-semibold"
        >
          {t("widget.clearHistory")}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {viewed.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group block"
          >
            <div
              className="flex items-center justify-center h-28 text-5xl rounded-control overflow-hidden"
              style={{ backgroundColor: product.cardColor }}
            >
              <span className="group-hover:scale-105 transition-transform duration-200">
                {product.emoji}
              </span>
            </div>
            <div className="pt-2.5 px-0.5">
              <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-0.5">
                {categoryLabel(product.category, t)}
              </p>
              <p className="text-xs font-semibold text-ink group-hover:underline underline-offset-4 transition-colors leading-snug line-clamp-2 mb-1">
                {product.name}
              </p>
              <p className="text-sm font-bold text-ink tabular-nums">{formatPrice(effectivePrice(product))}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
