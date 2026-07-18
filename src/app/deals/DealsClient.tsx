"use client";

/**
 * /deals — the "İndirimde" campaign page (design A1). A red limited-time
 * hero with an HONEST countdown (ticks to the soonest real discountEndsAt —
 * no fabricated urgency), a spotlight for the single biggest discount, a
 * discount-range chip filter, and a grid of ProductCards (already discount-
 * aware). Products arrive pre-filtered to discounted + sorted by % desc.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Product } from "@/types";
import ProductCard from "@/components/ProductCard";
import { useLocale } from "@/context/LocaleContext";
import { formatAmount, formatPrice } from "@/lib/format";
import { discountPercent, effectivePrice, basePriceForSize, savingsAmount } from "@/lib/pricing";

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) { setRemaining(null); return; }
    const end = new Date(endsAt).getTime();
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}

export default function DealsClient({
  products,
  soonestEnd,
  maxPct,
}: {
  products: Product[];
  soonestEnd: string | null;
  maxPct: number;
}) {
  const { t } = useLocale();
  const [minPct, setMinPct] = useState(0);
  const remaining = useCountdown(soonestEnd);

  const spotlight = products[0] ?? null;
  const rest = spotlight ? products.slice(1) : products;
  const grid = rest.filter((p) => discountPercent(p) >= minPct);

  const ranges = [0, 10, 20, 30];

  /* Countdown parts (only rendered once mounted → remaining !== null). */
  const cd = remaining !== null && remaining > 0
    ? {
        d: Math.floor(remaining / 86400000),
        h: Math.floor((remaining % 86400000) / 3600000),
        m: Math.floor((remaining % 3600000) / 60000),
        s: Math.floor((remaining % 60000) / 1000),
      }
    : null;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-ink-muted">
        <Link href="/" className="hover:text-accent transition-colors font-medium">{t("nav.home")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("nav.deals")}</span>
      </nav>

      {/* ── Campaign hero (red, limited-time) ── */}
      <div
        className="relative overflow-hidden rounded-card p-5 sm:p-7 text-white mb-6 sm:mb-8 sm:flex sm:items-center sm:justify-between sm:gap-6"
        style={{ background: "radial-gradient(130% 130% at 0 0, #C0473F 0%, #9A2F2F 55%, #7A2323 100%)" }}
      >
        <div className="relative">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] opacity-90">🔥 {t("deals.eyebrow")}</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-1.5 leading-none">{t("nav.deals")}</h1>
          {maxPct > 0 && (
            <p className="text-[12px] sm:text-sm opacity-90 mt-2">{t("deals.subtitle").replace("{n}", String(maxPct))}</p>
          )}
        </div>
        {cd && (
          <div className="relative mt-4 sm:mt-0 flex-shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-80 mb-1.5">{t("deals.ends")}</p>
            <div className="flex gap-1.5">
              {[
                ...(cd.d > 0 ? [{ n: cd.d, l: t("deals.dd") }] : []),
                { n: cd.h, l: t("deals.hh") },
                { n: cd.m, l: t("deals.mm") },
                { n: cd.s, l: t("deals.ss") },
              ].map((u, i) => (
                <div key={i} className="bg-white/15 rounded-control px-2.5 py-1.5 text-center min-w-[42px]">
                  <div className="text-lg sm:text-xl font-extrabold tabular-nums leading-none">{pad(u.n)}</div>
                  <div className="text-[7.5px] uppercase tracking-[0.05em] opacity-80 mt-1">{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">🏷️</div>
          <p className="font-bold text-ink mb-2">{t("deals.empty")}</p>
          <Link href="/products" className="inline-block mt-2 u-btn font-semibold px-6 py-3 rounded-control bg-ink text-white text-[12px] uppercase tracking-[0.1em] hover:bg-ink/85">
            {t("filter.allProducts")}
          </Link>
        </div>
      ) : (
        <>
          {/* ── Spotlight — the single biggest discount ── */}
          {spotlight && (
            <Link
              href={`/products/${spotlight.slug}`}
              className="group flex items-stretch mb-6 sm:mb-8 rounded-card border border-danger/40 bg-danger-soft overflow-hidden hover:border-danger transition-colors"
            >
              <div
                className="w-28 sm:w-48 flex-shrink-0 flex items-center justify-center text-5xl sm:text-7xl relative"
                style={{ backgroundColor: spotlight.cardColor }}
              >
                {spotlight.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={spotlight.imageUrl} alt={spotlight.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : spotlight.emoji}
                <span className="absolute top-2 left-2 bg-danger text-white text-[11px] sm:text-sm font-extrabold px-2 py-0.5 rounded-control">
                  {t("pdp.save").replace("{n}", String(discountPercent(spotlight)))}
                </span>
              </div>
              <div className="flex-1 min-w-0 p-4 sm:p-6 flex flex-col justify-center">
                <p className="text-[9px] sm:text-[10px] font-bold text-danger uppercase tracking-[0.12em]">⚡ {t("deals.spotlight")}</p>
                <p className="text-base sm:text-2xl font-extrabold text-ink mt-1.5 mb-2.5 truncate group-hover:underline underline-offset-4">{spotlight.name}</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl sm:text-3xl font-extrabold text-danger tabular-nums">{formatAmount(effectivePrice(spotlight))} ₾</span>
                  <span className="text-sm sm:text-lg text-ink-muted line-through">{formatAmount(basePriceForSize(spotlight))} ₾</span>
                </div>
                <p className="text-[12px] sm:text-sm font-bold text-accent-deep mt-1.5">{t("pdp.youSave").replace("{n}", formatAmount(savingsAmount(spotlight)))}</p>
              </div>
            </Link>
          )}

          {/* ── Discount-range chips ── */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 mb-5">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setMinPct(r)}
                className={`flex-shrink-0 h-9 px-4 rounded-full border text-[12px] font-bold transition-colors ${
                  minPct === r
                    ? "border-danger bg-danger-soft text-danger"
                    : "border-line bg-canvas text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {r === 0 ? t("deals.all") : `%${r}+`}
              </button>
            ))}
            <span className="ml-auto text-xs text-ink-muted font-semibold flex-shrink-0 pl-2">
              {grid.length === 1 ? t("filter.product1") : t("filter.products").replace("{n}", String(grid.length))}
            </span>
          </div>

          {/* ── Grid — ProductCard already shows strikethrough + −% badge ── */}
          {grid.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {grid.map((p) => (
                <div key={p.id} className="bg-canvas border border-line rounded-card p-2.5 sm:p-3">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-ink-muted font-semibold">{t("deals.empty")}</p>
          )}
        </>
      )}
    </div>
  );
}
