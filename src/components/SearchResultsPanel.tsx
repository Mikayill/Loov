"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import { categoryLabel, categoryPlural } from "@/lib/i18n/labels";
import { CATEGORY_FILTERS, TRENDING, MAX_RESULTS, type CatKey } from "@/lib/search";
import type { Product } from "@/types";

/** Shared dropdown content — used by the desktop inline search bar and the
 *  mobile expanding search row (Navbar.tsx). Pure presentation; all matching
 *  logic lives in src/lib/search.ts. */
export default function SearchResultsPanel({
  query, setQuery, activeCat, setActiveCat, results, recentSearches, onClearRecent, onNavigate,
  searching = false,
}: {
  query: string;
  setQuery: (q: string) => void;
  activeCat: CatKey;
  setActiveCat: (c: CatKey) => void;
  results: Product[];
  recentSearches: string[];
  onClearRecent: () => void;
  onNavigate: () => void;
  /** True while the server round-trip is in flight — shows "Searching…" and
   *  keeps "no results" from flashing before the answer arrives. */
  searching?: boolean;
}) {
  const { t } = useLocale();
  const hasQuery = query.trim().length > 0;
  const shown = results.slice(0, MAX_RESULTS);
  const viewAllHref = activeCat === "all" ? "/products" : `/products?cat=${activeCat}`;

  return (
    <div>
      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {CATEGORY_FILTERS.map((c) => {
          const active = activeCat === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setActiveCat(c.key)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold whitespace-nowrap border transition-colors flex-shrink-0 ${
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              <span className="leading-none">{c.emoji}</span>
              <span>{c.key === "all" ? t("search.all") : categoryPlural(c.key, t)}</span>
            </button>
          );
        })}
      </div>

      {/* Trending / recent — only when nothing typed */}
      {!hasQuery && (
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mr-1">{t("search.trending")}</span>
            {TRENDING.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="px-2.5 py-1 bg-canvas hover:bg-panel rounded-full text-[11px] font-semibold text-ink-soft hover:text-ink transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mr-1">{t("search.recent")}</span>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-canvas hover:bg-panel rounded-full text-[11px] font-semibold text-ink-soft hover:text-ink transition-colors"
                >
                  <svg className="w-3 h-3 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {s}
                </button>
              ))}
              <button type="button" onClick={onClearRecent} className="text-[9px] font-bold text-ink-muted hover:text-accent transition-colors ml-1">
                {t("search.clear")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="mt-3 max-h-[60vh] overflow-y-auto -mx-1 px-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-bold text-ink-muted uppercase tracking-widest">
            {hasQuery
              ? results.length === 1 ? t("search.result1") : t("search.results").replace("{n}", String(results.length))
              : t("search.popular")}
          </p>
          {results.length > MAX_RESULTS && (
            <Link href={viewAllHref} onClick={onNavigate} className="text-xs font-bold text-accent hover:underline">
              {t("search.viewAll").replace("{n}", String(results.length))} →
            </Link>
          )}
        </div>

        {/* In-flight indicator — old results stay visible underneath */}
        {hasQuery && searching && (
          <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold text-ink-muted">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-line border-t-ink animate-spin" aria-hidden />
            {t("search.searching")}
          </div>
        )}

        {shown.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {shown.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 p-2 rounded-control border border-line hover:border-ink hover:bg-panel/60 transition-all"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: p.cardColor }}>
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : p.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-ink group-hover:underline underline-offset-2 transition-colors leading-tight truncate">{p.name}</p>
                    {p.isNew && <span className="flex-shrink-0 text-[8px] font-bold text-accent px-1 py-0.5 uppercase tracking-[0.1em]">{t("product.new")}</span>}
                  </div>
                  <p className="text-[10px] text-ink-muted mt-0.5 truncate">{categoryLabel(p.category, t)} · {formatPrice(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : hasQuery && searching ? null : (
          <div className="py-8 text-center">
            <div className="text-4xl mb-2">🔍</div>
            <p className="font-bold text-ink text-sm mb-1">{t("search.noResults")}</p>
            <p className="text-xs text-ink-muted">{t("search.noResultsHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
