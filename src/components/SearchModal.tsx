"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { categoryLabels } from "@/lib/products";
import { useProducts } from "@/lib/db/useProducts";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import { categoryPlural, categoryLabel, colorLabel } from "@/lib/i18n/labels";
import type { Product } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const RECENT_KEY = "loov_recent_searches";

type CatKey = "all" | Product["category"];

/* Labels come from the label layer at render time (canonical keys stay). */
const CATEGORY_FILTERS: { key: CatKey; emoji: string }[] = [
  { key: "all",     emoji: "✨" },
  { key: "body",    emoji: "👶" },
  { key: "romper",  emoji: "🐻" },
  { key: "set",     emoji: "🎀" },
  { key: "blanket", emoji: "☁️" },
  { key: "towel",   emoji: "🛁" },
  { key: "bag",     emoji: "🐰" },
];

const TRENDING = ["Bodysuit", "Swaddle", "Gift set", "Hooded towel", "Romper"];

const MAX_RESULTS = 8;

export default function SearchModal({ open, onClose }: Props) {
  const { t } = useLocale();
  const products = useProducts();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<CatKey>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    onClose();
    setQuery("");
    setActiveCat("all");
  }, [onClose]);

  /* Load recent searches */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* */ }
  }, []);

  function saveSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 5);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* */ }
      return updated;
    });
  }

  function clearRecent() {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* */ }
  }

  /* Auto-focus + keyboard close */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, close]);

  /* Prevent body scroll */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* Text + category filter combined */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = activeCat === "all" || p.category === activeCat;
      if (!matchCat) return false;
      if (!q) return true;
      /* Matches both canonical EN values and their localized labels, so a
         Georgian shopper can type either. Product NAMES stay EN (content
         translation is a later phase). */
      return (
        p.name.toLowerCase().includes(q) ||
        categoryLabels[p.category].toLowerCase().includes(q) ||
        categoryPlural(p.category, t).toLowerCase().includes(q) ||
        p.colors.some(
          (c) => c.toLowerCase().includes(q) || colorLabel(c, t).toLowerCase().includes(q)
        )
      );
    });
  }, [products, query, activeCat, t]);

  const shown = results.slice(0, MAX_RESULTS);
  const hasQuery = query.trim().length > 0;
  const viewAllHref =
    activeCat === "all" ? "/products" : `/products?cat=${activeCat}`;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] animate-search-overlay"
      style={{ backgroundColor: "rgba(42,35,32,0.45)", backdropFilter: "blur(4px)" }}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Product search"
    >
      {/* Full-width panel that drops down from the top */}
      <div
        className="absolute inset-x-0 top-0 bg-white shadow-2xl border-b border-[#DDD5CC] animate-search-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          {/* ── Search input row ── */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 flex-1 h-12 px-4 rounded-2xl border-2 border-[#DDD5CC] bg-[#FAFAF8]">
              <svg className="w-5 h-5 text-[#9A8E88] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder")}
                aria-label="Search products"
                className="flex-1 min-w-0 text-base sm:text-lg font-medium text-[#2A2320] placeholder-[#C8B8B0] focus:outline-none focus-visible:outline-none bg-transparent"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  aria-label="Clear search"
                  className="text-[#9A8E88] hover:text-[#2A2320] w-6 h-6 rounded-full bg-[#EDE5D8] flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close search"
              className="flex-shrink-0 h-12 px-4 rounded-2xl border-2 border-[#DDD5CC] text-sm font-bold text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-colors flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">{t("search.close")}</span>
              <span className="sm:hidden text-base leading-none">✕</span>
            </button>
          </div>

          {/* ── Category filter pills (live filtering) ── */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {CATEGORY_FILTERS.map((c) => {
              const active = activeCat === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveCat(c.key)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border-2 transition-colors ${
                    active
                      ? "border-[#5E9E8C] bg-[#5E9E8C] text-white"
                      : "border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C]"
                  }`}
                >
                  <span className="leading-none">{c.emoji}</span>
                  <span>{c.key === "all" ? t("search.all") : categoryPlural(c.key, t)}</span>
                </button>
              );
            })}
          </div>

          {/* ── Trending / recent (only when nothing typed) ── */}
          {!hasQuery && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mr-1">{t("search.trending")}</span>
                {TRENDING.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuery(t)}
                    className="px-3 py-1.5 bg-[#F5F0EB] hover:bg-[#EDE5D8] rounded-full text-xs font-semibold text-[#5E5450] hover:text-[#2A2320] transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
              {recentSearches.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mr-1">{t("search.recent")}</span>
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQuery(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F0EB] hover:bg-[#EDE5D8] rounded-full text-xs font-semibold text-[#5E5450] hover:text-[#2A2320] transition-colors"
                    >
                      <svg className="w-3 h-3 text-[#9A8E88]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {s}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="text-[10px] font-bold text-[#9A8E88] hover:text-[#5E9E8C] transition-colors ml-1"
                  >
                    {t("search.clear")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Results grid ── */}
          <div className="mt-4 max-h-[calc(100vh-260px)] sm:max-h-[62vh] overflow-y-auto -mx-1 px-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest">
                {hasQuery
                  ? results.length === 1
                    ? t("search.result1")
                    : t("search.results").replace("{n}", String(results.length))
                  : t("search.popular")}
              </p>
              {results.length > MAX_RESULTS && (
                <Link
                  href={viewAllHref}
                  onClick={() => { saveSearch(query); close(); }}
                  className="text-xs font-bold text-[#5E9E8C] hover:underline"
                >
                  {t("search.viewAll").replace("{n}", String(results.length))} →
                </Link>
              )}
            </div>

            {shown.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-2">
                {shown.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    onClick={() => { saveSearch(query); close(); }}
                    className="group flex items-center gap-3 p-2.5 rounded-2xl border border-[#DDD5CC] hover:border-[#5E9E8C] hover:shadow-sm transition-all"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: p.cardColor }}
                    >
                      {p.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-[#2A2320] group-hover:text-[#5E9E8C] transition-colors leading-tight truncate">
                          {p.name}
                        </p>
                        {p.isNew && (
                          <span className="flex-shrink-0 text-[9px] font-bold bg-[#5E9E8C] text-white px-1.5 py-0.5 rounded-full uppercase">{t("product.new")}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#9A8E88] mt-0.5 truncate">
                        {categoryLabel(p.category, t)} · {formatPrice(p.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="text-5xl mb-3">🔍</div>
                <p className="font-bold text-[#2A2320] mb-1">{t("search.noResults")}</p>
                <p className="text-sm text-[#9A8E88]">{t("search.noResultsHint")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
