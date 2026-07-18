"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import ProductCard from "./ProductCard";
import { Product, Season } from "@/types";
import { formatPrice } from "@/lib/format";
import { discountPercent, hasVariablePricing, minEffectivePrice } from "@/lib/pricing";
import { useLocale } from "@/context/LocaleContext";
import { categoryLabel, categoryPlural, colorLabel, fabricLabel, seasonLabel } from "@/lib/i18n/labels";
import { SEASON_META, matchesSeason } from "@/lib/season";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type ViewMode = "grid" | "list";

type Cat = "All" | Product["category"];
type SortKey = "default" | "price-asc" | "price-desc" | "new";
type PriceRange = "all" | "under40" | "40to70" | "over70";
type AgeFilter = "all" | "0-3m" | "3-6m" | "6-12m" | "1-2y" | "2y+";

const catIcons: Record<string, string> = {
  All: "🌿", body: "👶", blanket: "☁️",
  set: "🎀", towel: "🛁", romper: "🐻", bag: "🐰",
  bathrobe: "🧖", pajama: "🌙", dress: "👗", pants: "👖",
  outerwear: "🧥", shoes: "👟", socks: "🧦", hat: "🧢",
  bib: "🍼", toy: "🧸", accessory: "✨",
};

/* Labels/descriptions come from the dictionary at render time (t below);
   these arrays just map each canonical value to its translation keys. */
const sortOptions: { value: SortKey; labelKey: TranslationKey }[] = [
  { value: "default",    labelKey: "filter.sortFeatured" },
  { value: "new",        labelKey: "filter.sortNew" },
  { value: "price-asc",  labelKey: "filter.sortPriceAsc" },
  { value: "price-desc", labelKey: "filter.sortPriceDesc" },
];

const priceRanges: { value: PriceRange; labelKey: TranslationKey }[] = [
  { value: "all",      labelKey: "filter.priceAll" },
  { value: "under40",  labelKey: "filter.priceUnder40" },
  { value: "40to70",   labelKey: "filter.price40to70" },
  { value: "over70",   labelKey: "filter.priceOver70" },
];

const AGE_FILTERS: { value: AgeFilter; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { value: "all",   labelKey: "filter.ageAll",     descKey: "filter.ageAllDesc" },
  { value: "0-3m",  labelKey: "filter.age0to3",    descKey: "filter.age0to3Desc" },
  { value: "3-6m",  labelKey: "filter.age3to6",    descKey: "filter.age3to6Desc" },
  { value: "6-12m", labelKey: "filter.age6to12",   descKey: "filter.age6to12Desc" },
  { value: "1-2y",  labelKey: "filter.age1to2y",   descKey: "filter.age1to2yDesc" },
  { value: "2y+",   labelKey: "filter.age2yPlus",  descKey: "filter.age2yPlusDesc" },
];

function matchesAge(product: Product, age: AgeFilter): boolean {
  if (age === "all") return true;
  const hasAgeSizes = product.sizes.some((s) => /month|year/i.test(s));
  if (!hasAgeSizes) return true;
  const joined = product.sizes.join("|").toLowerCase();
  switch (age) {
    case "0-3m":  return /0-1 month|0-3 month|1-3 month|newborn|0-6 month/.test(joined);
    case "3-6m":  return /3-6 month|0-6 month/.test(joined);
    case "6-12m": return /6-9 month|9-12 month|6-18 month|6-12 month/.test(joined);
    case "1-2y":  return /12-18 month|18-24 month|1-2 year|6-18 month/.test(joined);
    case "2y+":   return /2-4 year|2 year/.test(joined);
    default:      return true;
  }
}

const COLOR_FILTERS = [
  { name: "White",    hex: "#F5F2ED", border: "#DDD5CC" },
  { name: "Sage",     hex: "#9BBFB8" },
  { name: "Sand",     hex: "#D4B896" },
  { name: "Sky Blue", hex: "#87BEDC" },
  { name: "Cream",    hex: "#F0E8D4", border: "#DDD5CC" },
  { name: "Lavender", hex: "#C4B4D4" },
];

/* Canonical fabric slugs (also used to gate which pills appear at all). */
const FABRIC_EMOJI: Record<string, string> = {
  cotton: "🌿", muslin: "🍃", bamboo: "🎋", terry: "🛁", fleece: "☁️", wool: "🐑", other: "📦",
};

export default function CategoryFilter({
  products,
  initialCategory,
  initialDealOnly = false,
  initialRecentOnly = false,
  advanced = false,
}: {
  products: Product[];
  initialCategory?: string;
  /** Set from navbar's "On Sale" link (`/products?deal=1`) — restricts to discounted products. */
  initialDealOnly?: boolean;
  /** Set from navbar's "Recently Viewed" link (`/products?recent=1`) — restricts
   *  to products in the shopper's `loov_recently_viewed` localStorage history.
   *  Replaces the old separate `<RecentlyViewedSection>` anchor-scroll section,
   *  which lived on this same page and made "Products" vs. "Recently Viewed"
   *  feel like the same screen with two confusing entry points. */
  initialRecentOnly?: boolean;
  advanced?: boolean;
}) {
  const { t } = useLocale();
  const pageSize = advanced ? 16 : 8;
  const [active,         setActive]         = useState<Cat>((initialCategory as Cat) || "All");
  /* Sticky category chips do client-side nav to /products?cat=X, but this
     component stays mounted across those navigations — so re-sync the active
     category whenever the incoming prop changes (otherwise the first pick
     "sticks" and later chips do nothing). */
  useEffect(() => { setActive((initialCategory as Cat) || "All"); }, [initialCategory]);
  const [dealOnly, setDealOnly] = useState(initialDealOnly);
  useEffect(() => { setDealOnly(initialDealOnly); }, [initialDealOnly]);
  const [recentOnly, setRecentOnly] = useState(initialRecentOnly);
  useEffect(() => { setRecentOnly(initialRecentOnly); }, [initialRecentOnly]);
  const [sort,           setSort]           = useState<SortKey>("default");
  const [priceRange,     setPriceRange]     = useState<PriceRange>("all");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [ageFilter,      setAgeFilter]      = useState<AgeFilter>("all");
  const [seasonFilter,   setSeasonFilter]   = useState<Season>("all");
  /* Grid only now (Temu-style) — the list-view toggle was removed from the
     bar; the list render below stays as a harmless dead branch. */
  const [viewMode] = useState<ViewMode>("grid");
  const [visibleCount,   setVisibleCount]   = useState(pageSize);
  /* Temu-style top: a search box, a left "Filters" drawer, and two dropdown
     buttons (Category + Sort). */
  const [query,          setQuery]          = useState("");
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [catMenuOpen,    setCatMenuOpen]    = useState(false);
  const [sortMenuOpen,   setSortMenuOpen]   = useState(false);
  const [mounted,        setMounted]        = useState(false);
  useEffect(() => setMounted(true), []);
  /* Lock body scroll while the filter drawer is open. */
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [drawerOpen]);
  /* Categories the shopper browsed recently — boosts the default sort after
     mount only (server render stays plain, so no hydration mismatch). */
  const [preferredCats,  setPreferredCats]  = useState<string[]>([]);
  /* Raw recently-viewed product ids — powers the "Recently Viewed" filter
     chip below. Empty on the server/first paint (localStorage-only), so the
     chip simply doesn't render until mount if there's no history — same
     hydration-safe gating pattern as fabricsPresent/seasonsPresent. */
  const [recentIds,      setRecentIds]      = useState<string[]>([]);

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem("loov_recently_viewed") ?? "[]");
      if (!Array.isArray(ids) || ids.length === 0) return;
      setRecentIds(ids.map(String));
      const byId = new Map(products.map((p) => [String(p.id), p.category]));
      const cats: string[] = [];
      for (const id of ids) {
        const cat = byId.get(String(id));
        if (cat && !cats.includes(cat)) cats.push(cat);
      }
      if (cats.length > 0) setPreferredCats(cats);
    } catch { /* ignore malformed history */ }
  }, [products]);

  const categories = useMemo<Cat[]>(() => {
    const found = Array.from(new Set(products.map((p) => p.category)));
    return ["All", ...found] as Cat[];
  }, [products]);

  /* Fabric pills only appear once at least one product declares a fabric. */
  const fabricsPresent = useMemo(
    () => Array.from(new Set(products.map((p) => p.fabric).filter((f): f is string => !!f && !!FABRIC_EMOJI[f]))),
    [products]
  );

  /* Season pills only appear once at least one product has a real season set
     (an all-"all" catalog has nothing meaningful to filter by). */
  const seasonsPresent = useMemo(
    () => products.some((p) => p.season && p.season !== "all"),
    [products]
  );

  const filtered = useMemo(() => {
    let list = active === "All" ? products : products.filter((p) => p.category === active);

    /* Search box (name / category / colour, raw + translated). */
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        categoryLabel(p.category, t).toLowerCase().includes(q) ||
        p.colors.some((c) => c.toLowerCase().includes(q) || colorLabel(c, t).toLowerCase().includes(q))
      );
    }

    if (priceRange === "under40")  list = list.filter((p) => p.price < 40);
    if (priceRange === "40to70")   list = list.filter((p) => p.price >= 40 && p.price <= 70);
    if (priceRange === "over70")   list = list.filter((p) => p.price > 70);

    if (selectedColors.length > 0) {
      list = list.filter((p) =>
        p.colors.some((c) =>
          selectedColors.some((sc) => c.toLowerCase().includes(sc.toLowerCase()))
        )
      );
    }

    if (selectedFabrics.length > 0) {
      list = list.filter((p) => p.fabric && selectedFabrics.includes(p.fabric));
    }

    if (ageFilter !== "all") {
      list = list.filter((p) => matchesAge(p, ageFilter));
    }

    if (seasonFilter !== "all") {
      list = list.filter((p) => matchesSeason(p, seasonFilter));
    }

    if (dealOnly) {
      list = list.filter((p) => discountPercent(p) > 0);
    }

    if (recentOnly) {
      const idSet = new Set(recentIds);
      list = list.filter((p) => idSet.has(String(p.id)));
    }

    if (sort === "new")        list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    if (sort === "price-asc")  list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);

    /* Default sort: gently surface the categories the shopper viewed recently
       (stable within groups, so the incoming season/new order is preserved). */
    if (sort === "default" && active === "All" && preferredCats.length > 0) {
      const rank = (c: string) => {
        const i = preferredCats.indexOf(c);
        return i === -1 ? preferredCats.length : i;
      };
      list = list
        .map((p, i) => ({ p, i }))
        .sort((a, b) => rank(a.p.category) - rank(b.p.category) || a.i - b.i)
        .map(({ p }) => p);
    }

    return list;
  }, [active, sort, priceRange, selectedColors, selectedFabrics, ageFilter, seasonFilter, dealOnly, recentOnly, recentIds, products, preferredCats, query, t]);

  /* Reset pagination when filters change */
  useEffect(() => { setVisibleCount(pageSize); }, [active, sort, priceRange, selectedColors, selectedFabrics, ageFilter, seasonFilter, dealOnly, recentOnly, pageSize, query]);

  const activeFilterCount =
    (priceRange !== "all" ? 1 : 0) +
    selectedColors.length +
    selectedFabrics.length +
    (active !== "All" ? 1 : 0) +
    (ageFilter !== "all" ? 1 : 0) +
    (seasonFilter !== "all" ? 1 : 0) +
    (dealOnly ? 1 : 0) +
    (recentOnly ? 1 : 0);

  function toggleColor(name: string) {
    setSelectedColors((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  function toggleFabric(slug: string) {
    setSelectedFabrics((prev) =>
      prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]
    );
  }

  function clearAll() {
    setActive("All");
    setSort("default");
    setPriceRange("all");
    setSelectedColors([]);
    setSelectedFabrics([]);
    setAgeFilter("all");
    setSeasonFilter("all");
    setDealOnly(false);
    setRecentOnly(false);
    setQuery("");
    setVisibleCount(pageSize);
  }

  const visibleProducts = filtered.slice(0, visibleCount);

  return (
    <div>
      {/* Deals banner — makes "deal=1" visually its own view instead of
          blending invisibly into the plain products grid (previously the
          only difference was a small "(1)" on the Filters button). */}
      {dealOnly && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-card border border-danger/30 bg-danger-soft">
          <span className="text-lg" aria-hidden>🔥</span>
          <p className="text-sm font-bold text-danger">{t("filter.dealsHeading")}</p>
        </div>
      )}

      {/* ── Search box (top) ── */}
      <div className="relative mb-3">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="w-full h-11 pl-10 pr-10 rounded-full border border-line bg-canvas text-sm text-ink font-medium outline-none focus:border-ink transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label={t("filter.clear")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:bg-panel transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Filter bar: Filtreler drawer + Kategori + Sırala ── */}
      <div className="flex items-center gap-2 mb-4">
        {/* Filters — opens the left drawer with every filter */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="u-btn flex-shrink-0 flex items-center gap-1.5 h-10 px-3.5 rounded-control border border-ink bg-canvas text-ink text-[12px] font-bold active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" />
          </svg>
          {t("filter.filters")}
          {activeFilterCount > 0 && (
            <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-extrabold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Category dropdown */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => { setCatMenuOpen((v) => !v); setSortMenuOpen(false); }}
            aria-expanded={catMenuOpen}
            className="w-full h-10 pl-3 pr-2.5 rounded-control border border-line bg-canvas text-ink text-[12px] font-semibold flex items-center justify-between gap-1.5"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="flex-shrink-0">{catIcons[active] ?? "🌿"}</span>
              <span className="truncate">{active === "All" ? t("filter.category") : categoryPlural(active as Product["category"], t)}</span>
            </span>
            <svg className={`w-3.5 h-3.5 text-ink-muted flex-shrink-0 transition-transform ${catMenuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {catMenuOpen && (
            <>
              <div className="fixed inset-0 z-[45]" onClick={() => setCatMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1.5 z-[50] w-60 max-h-[60vh] overflow-y-auto rounded-card border border-line bg-canvas shadow-2xl p-1.5">
                {categories.map((cat) => {
                  const label = cat === "All" ? t("filter.allProducts") : categoryPlural(cat as Product["category"], t);
                  return (
                    <button
                      key={cat}
                      onClick={() => { setActive(cat); setCatMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-control text-[13px] font-semibold text-left transition-colors ${
                        active === cat ? "bg-accent-soft text-accent-deep" : "text-ink hover:bg-panel"
                      }`}
                    >
                      <span className="w-6 text-center flex-shrink-0">{catIcons[cat]}</span>
                      <span className="flex-1 truncate">{label}</span>
                      {active === cat && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => { setSortMenuOpen((v) => !v); setCatMenuOpen(false); }}
            aria-expanded={sortMenuOpen}
            className="w-full h-10 pl-3 pr-2.5 rounded-control border border-line bg-canvas text-ink text-[12px] font-semibold flex items-center justify-between gap-1.5"
          >
            <span className="truncate">{t(sortOptions.find((o) => o.value === sort)!.labelKey)}</span>
            <svg className={`w-3.5 h-3.5 text-ink-muted flex-shrink-0 transition-transform ${sortMenuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sortMenuOpen && (
            <>
              <div className="fixed inset-0 z-[45]" onClick={() => setSortMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-[50] w-52 rounded-card border border-line bg-canvas shadow-2xl p-1.5">
                {sortOptions.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { setSort(o.value); setSortMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-control text-[13px] font-semibold text-left transition-colors ${
                      sort === o.value ? "bg-accent-soft text-accent-deep" : "text-ink hover:bg-panel"
                    }`}
                  >
                    <span>{t(o.labelKey)}</span>
                    {sort === o.value && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-ink-muted font-semibold mb-5">
        {filtered.length === 1 ? t("filter.product1") : t("filter.products").replace("{n}", String(filtered.length))}
        {active !== "All" && ` ${t("filter.inCategory").replace("{category}", categoryPlural(active as Product["category"], t))}`}
        {query.trim() && ` · "${query.trim()}"`}
        {ageFilter !== "all" && ` · ${t(AGE_FILTERS.find((a) => a.value === ageFilter)!.descKey)}`}
        {priceRange !== "all" && ` · ${t(priceRanges.find((p) => p.value === priceRange)!.labelKey)}`}
        {selectedColors.length > 0 && ` · ${selectedColors.map((c) => colorLabel(c, t)).join(", ")}`}
        {seasonFilter !== "all" && ` · ${seasonLabel(seasonFilter, t)}`}
        {dealOnly && ` · ${t("nav.deals")}`}
        {recentOnly && ` · ${t("filter.recentlyViewed")}`}
      </p>

      {/* ── LEFT FILTER DRAWER (all filters: colour names, fabric, price, age, season) ── */}
      {mounted && createPortal(
        <div
          className={`fixed inset-0 z-[600] transition-opacity duration-200 ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          aria-hidden={!drawerOpen}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(20,20,18,0.4)" }}
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel — slides in from the LEFT */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("filter.filters")}
            className={`absolute left-0 top-0 h-full w-[86%] max-w-[360px] bg-canvas shadow-2xl flex flex-col transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
            style={{ transitionTimingFunction: "var(--ease-smooth)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
              <span className="text-base font-extrabold text-ink">{t("filter.filters")}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-panel transition-colors active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* Price */}
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-2.5">{t("filter.price")}</p>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map((pr) => (
                    <button
                      key={pr.value}
                      onClick={() => setPriceRange(pr.value)}
                      className={`px-3.5 py-2 rounded-control text-[12.5px] font-semibold border transition-colors ${
                        priceRange === pr.value ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-ink hover:text-ink"
                      }`}
                    >
                      {t(pr.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-2.5">{t("filter.age")}</p>
                <div className="flex flex-wrap gap-2">
                  {AGE_FILTERS.map((af) => (
                    <button
                      key={af.value}
                      onClick={() => setAgeFilter(af.value)}
                      title={t(af.descKey)}
                      className={`px-3.5 py-2 rounded-control text-[12.5px] font-semibold border transition-colors ${
                        ageFilter === af.value ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-ink hover:text-ink"
                      }`}
                    >
                      {t(af.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colour — NAME chips (no colour circles) */}
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-2.5">{t("filter.color")}</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_FILTERS.map((cf) => {
                    const isSelected = selectedColors.includes(cf.name);
                    return (
                      <button
                        key={cf.name}
                        onClick={() => toggleColor(cf.name)}
                        aria-pressed={isSelected}
                        className={`px-3.5 py-2 rounded-control text-[12.5px] font-semibold border transition-colors ${
                          isSelected ? "border-accent bg-accent-soft text-accent-deep" : "border-line text-ink-soft hover:border-ink hover:text-ink"
                        }`}
                      >
                        {colorLabel(cf.name, t)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fabric / material — only when the catalog declares fabrics */}
              {fabricsPresent.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-2.5">{t("filter.fabric")}</p>
                  <div className="flex flex-wrap gap-2">
                    {fabricsPresent.map((f) => (
                      <button
                        key={f}
                        onClick={() => toggleFabric(f)}
                        className={`px-3.5 py-2 rounded-control text-[12.5px] font-semibold border transition-colors ${
                          selectedFabrics.includes(f) ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-ink hover:text-ink"
                        }`}
                      >
                        {FABRIC_EMOJI[f]} {fabricLabel(f, t)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Season — only when the catalog has a real season set */}
              {seasonsPresent && (
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-2.5">{t("filter.season")}</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(SEASON_META) as Season[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSeasonFilter(s)}
                        className={`px-3.5 py-2 rounded-control text-[12.5px] font-semibold border transition-colors ${
                          seasonFilter === s ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-ink hover:text-ink"
                        }`}
                      >
                        {SEASON_META[s].emoji} {seasonLabel(s, t)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* On sale + recently viewed toggles */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDealOnly((v) => !v)}
                  aria-pressed={dealOnly}
                  className={`px-3.5 py-2 rounded-control text-[12.5px] font-semibold border transition-colors ${
                    dealOnly ? "border-danger bg-danger-soft text-danger" : "border-line text-ink-soft hover:border-ink hover:text-ink"
                  }`}
                >
                  🔥 {t("nav.deals")}
                </button>
                {recentIds.length > 0 && (
                  <button
                    onClick={() => setRecentOnly((v) => !v)}
                    aria-pressed={recentOnly}
                    className={`px-3.5 py-2 rounded-control text-[12.5px] font-semibold border transition-colors ${
                      recentOnly ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-ink hover:text-ink"
                    }`}
                  >
                    🕐 {t("filter.recentlyViewed")}
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-line flex-shrink-0">
              <button
                onClick={clearAll}
                className="h-11 px-4 rounded-control border border-line text-[12px] font-bold text-ink-soft uppercase tracking-[0.06em] hover:border-ink hover:text-ink transition-colors"
              >
                {t("filter.clear")}
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="u-btn flex-1 h-11 rounded-control bg-accent text-white text-[12.5px] font-extrabold uppercase tracking-[0.06em] hover:bg-accent-deep active:scale-[0.98] transition-all"
              >
                {t("filter.showResults").replace("{n}", String(filtered.length))}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Products */}
      {filtered.length > 0 ? (
        <>
          {viewMode === "grid" ? (
            /* Each card carries its own border/rounding — a shared
               "gap-px bg-line" background (the old hairline-grid trick) bleeds
               through as a big solid rectangle in any column a partial last
               row leaves empty, since that space still belongs to the tinted
               container and has no card painted over it. */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {visibleProducts.map((p) => (
                <div key={p.id} className="bg-canvas border border-line rounded-card p-2.5 sm:p-3">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-line rounded-card overflow-hidden divide-y divide-line">
              {visibleProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="flex items-center gap-4 bg-canvas p-4 hover:bg-panel/70 transition-colors group"
                >
                  <div
                    className="w-20 h-20 rounded-control flex items-center justify-center text-4xl flex-shrink-0"
                    style={{ backgroundColor: p.cardColor }}
                  >
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">
                        {categoryLabel(p.category as Product["category"], t)}
                      </span>
                      {p.isNew && (
                        <span className="text-[9px] font-bold text-accent uppercase tracking-[0.12em]">{t("product.new")}</span>
                      )}
                    </div>
                    <p className="font-bold text-ink text-sm group-hover:underline underline-offset-4 transition-colors leading-snug line-clamp-2">
                      {p.name}
                    </p>
                    <p className="text-xs text-ink-muted mt-1 line-clamp-1">{p.colors.map((c) => colorLabel(c, t)).join(" · ")}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-extrabold text-ink text-lg">
                      {hasVariablePricing(p) && <span className="text-[10px] font-semibold text-ink-muted mr-1">{t("common.from")}</span>}
                      {formatPrice(minEffectivePrice(p))}
                    </p>
                    <p className="text-[10px] text-ink-muted mt-0.5">{t("filter.sizesCount").replace("{n}", String(p.sizes.length))}</p>
                  </div>
                  <svg className="w-4 h-4 text-line group-hover:text-accent transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}

          {/* Load more */}
          {visibleCount < filtered.length && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setVisibleCount((n) => n + pageSize)}
                className="u-btn u-btn-ghost font-semibold px-8 py-3.5 rounded-control border border-ink text-ink text-[12px] uppercase tracking-[0.1em] hover:bg-ink hover:text-white"
              >
                {t("filter.loadMore")}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="font-bold text-ink mb-2">{t("filter.noMatch")}</p>
          <p className="text-sm text-ink-muted mb-4">{t("filter.noMatchHint")}</p>
          <button
            onClick={clearAll}
            className="u-btn font-semibold px-6 py-3 rounded-control bg-ink text-white text-[12px] uppercase tracking-[0.1em] hover:bg-ink/85"
          >
            {t("filter.clearAllFilters")}
          </button>
        </div>
      )}
    </div>
  );
}
