"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import { Product, Season } from "@/types";
import { formatPrice } from "@/lib/format";
import { hasVariablePricing, minEffectivePrice } from "@/lib/pricing";
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
  advanced = false,
}: {
  products: Product[];
  initialCategory?: string;
  advanced?: boolean;
}) {
  const { t } = useLocale();
  const pageSize = advanced ? 16 : 8;
  const [active,         setActive]         = useState<Cat>((initialCategory as Cat) || "All");
  const [sort,           setSort]           = useState<SortKey>("default");
  const [priceRange,     setPriceRange]     = useState<PriceRange>("all");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [ageFilter,      setAgeFilter]      = useState<AgeFilter>("all");
  const [seasonFilter,   setSeasonFilter]   = useState<Season>("all");
  const [viewMode,       setViewMode]       = useState<ViewMode>("grid");
  const [visibleCount,   setVisibleCount]   = useState(pageSize);
  const [filtersOpen,    setFiltersOpen]    = useState(false);
  /* Categories the shopper browsed recently — boosts the default sort after
     mount only (server render stays plain, so no hydration mismatch). */
  const [preferredCats,  setPreferredCats]  = useState<string[]>([]);

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem("loov_recently_viewed") ?? "[]");
      if (!Array.isArray(ids) || ids.length === 0) return;
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
  }, [active, sort, priceRange, selectedColors, selectedFabrics, ageFilter, seasonFilter, products, preferredCats]);

  /* Reset pagination when filters change */
  useEffect(() => { setVisibleCount(pageSize); }, [active, sort, priceRange, selectedColors, selectedFabrics, ageFilter, seasonFilter, pageSize]);

  const activeFilterCount =
    (priceRange !== "all" ? 1 : 0) +
    selectedColors.length +
    selectedFabrics.length +
    (active !== "All" ? 1 : 0) +
    (ageFilter !== "all" ? 1 : 0) +
    (seasonFilter !== "all" ? 1 : 0);

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
    setVisibleCount(pageSize);
  }

  const visibleProducts = filtered.slice(0, visibleCount);

  return (
    <div>
      {/* ── Row 1: Category pills + Sort ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 flex-1">
          {categories.map((cat) => {
            const label = cat === "All" ? t("filter.allProducts") : categoryPlural(cat as Product["category"], t);
            const isActive = active === cat;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border-2 transition-all duration-200 ${
                  isActive
                    ? "border-accent bg-accent text-white shadow-sm scale-105"
                    : "border-line bg-white text-ink-soft hover:border-accent hover:text-accent"
                }`}
              >
                <span className="text-sm sm:text-base leading-none">{catIcons[cat]}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Filters toggle — mobile only (panel is always visible on desktop) */}
          {advanced && (
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className={`sm:hidden flex items-center gap-1.5 h-9 px-3 rounded-control border-2 text-xs font-bold transition-colors whitespace-nowrap ${
                filtersOpen || activeFilterCount > 0
                  ? "border-accent text-accent bg-accent-soft"
                  : "border-line text-ink-soft"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" />
              </svg>
              {t("filter.filters")}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          )}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 px-3 pr-8 rounded-control border-2 border-line bg-white text-sm font-semibold text-ink-soft focus:border-accent outline-none cursor-pointer appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239A8E88'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "16px" }}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>

          {/* View mode toggle */}
          <div className="flex items-center border-2 border-line rounded-control overflow-hidden h-9">
            <button
              onClick={() => setViewMode("grid")}
              title={t("filter.gridView")}
              className={`w-9 h-full flex items-center justify-center transition-colors ${
                viewMode === "grid" ? "bg-accent text-white" : "text-ink-muted hover:bg-canvas"
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              title={t("filter.listView")}
              className={`w-9 h-full flex items-center justify-center border-l-2 border-line transition-colors ${
                viewMode === "list" ? "bg-accent text-white" : "text-ink-muted hover:bg-canvas"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 h-9 px-3 rounded-control border-2 border-red-200 bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              ✕ {t("filter.clear")} ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: Advanced filters (only on /products page) ── */}
      {advanced && (
        <div className={`${filtersOpen ? "flex" : "hidden"} sm:flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-3 mb-4 py-2.5 sm:py-3 px-3 sm:px-4 bg-white rounded-card border border-line`}>
          {/* Price range */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-bold text-ink-muted uppercase tracking-widest flex-shrink-0">{t("filter.price")}:</span>
            {priceRanges.map((pr) => (
              <button
                key={pr.value}
                onClick={() => setPriceRange(pr.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border-2 transition-all ${
                  priceRange === pr.value
                    ? "border-accent bg-accent text-white"
                    : "border-line text-ink-soft hover:border-accent hover:text-accent"
                }`}
              >
                {t(pr.labelKey)}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-line hidden sm:block" />

          {/* Age filter */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-bold text-ink-muted uppercase tracking-widest flex-shrink-0">{t("filter.age")}:</span>
            {AGE_FILTERS.map((af) => (
              <button
                key={af.value}
                onClick={() => setAgeFilter(af.value)}
                title={t(af.descKey)}
                className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border-2 transition-all ${
                  ageFilter === af.value
                    ? "border-accent bg-accent text-white"
                    : "border-line text-ink-soft hover:border-accent hover:text-accent"
                }`}
              >
                {t(af.labelKey)}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-line hidden sm:block" />

          {/* Color filter — matching stays on the CANONICAL cf.name; only the
              visible label goes through colorLabel(). */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-bold text-ink-muted uppercase tracking-widest flex-shrink-0">{t("filter.color")}:</span>
            {COLOR_FILTERS.map((cf) => {
              const isSelected = selectedColors.includes(cf.name);
              return (
                <button
                  key={cf.name}
                  onClick={() => toggleColor(cf.name)}
                  title={colorLabel(cf.name, t)}
                  aria-label={t("filter.filterBy").replace("{name}", colorLabel(cf.name, t))}
                  className={`w-7 h-7 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                    isSelected
                      ? "border-accent ring-2 ring-accent ring-offset-1 scale-110"
                      : "border-line hover:scale-110 hover:border-ink-muted"
                  }`}
                  style={{ backgroundColor: cf.hex, borderColor: isSelected ? "#5E9E8C" : (cf.border ?? cf.hex) }}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-accent drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Fabric filter — only when the catalog declares fabrics */}
          {fabricsPresent.length > 0 && (
            <>
              <div className="h-6 w-px bg-line hidden sm:block" />
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold text-ink-muted uppercase tracking-widest flex-shrink-0">{t("filter.fabric")}:</span>
                {fabricsPresent.map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleFabric(f)}
                    className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border-2 transition-all ${
                      selectedFabrics.includes(f)
                        ? "border-accent bg-accent text-white"
                        : "border-line text-ink-soft hover:border-accent hover:text-accent"
                    }`}
                  >
                    {FABRIC_EMOJI[f]} {fabricLabel(f, t)}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Season filter — only when the catalog has a real (non-"all") season set */}
          {seasonsPresent && (
            <>
              <div className="h-6 w-px bg-line hidden sm:block" />
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold text-ink-muted uppercase tracking-widest flex-shrink-0">{t("filter.season")}:</span>
                {(Object.keys(SEASON_META) as Season[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeasonFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border-2 transition-all ${
                      seasonFilter === s
                        ? "border-accent bg-accent text-white"
                        : "border-line text-ink-soft hover:border-accent hover:text-accent"
                    }`}
                  >
                    {SEASON_META[s].emoji} {seasonLabel(s, t)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Result count */}
      <p className="text-xs text-ink-muted font-semibold mb-5">
        {filtered.length === 1 ? t("filter.product1") : t("filter.products").replace("{n}", String(filtered.length))}
        {active !== "All" && ` ${t("filter.inCategory").replace("{category}", categoryPlural(active as Product["category"], t))}`}
        {ageFilter !== "all" && ` · ${t(AGE_FILTERS.find((a) => a.value === ageFilter)!.descKey)}`}
        {priceRange !== "all" && ` · ${t(priceRanges.find((p) => p.value === priceRange)!.labelKey)}`}
        {selectedColors.length > 0 && ` · ${selectedColors.map((c) => colorLabel(c, t)).join(", ")}`}
        {seasonFilter !== "all" && ` · ${seasonLabel(seasonFilter, t)}`}
      </p>

      {/* Products */}
      {filtered.length > 0 ? (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {visibleProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="flex items-center gap-4 bg-white rounded-card border border-line p-4 hover:shadow-md hover:border-accent transition-all group"
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
                        <span className="text-[9px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full uppercase">{t("product.new")}</span>
                      )}
                    </div>
                    <p className="font-bold text-ink text-sm group-hover:text-accent transition-colors leading-snug line-clamp-2">
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
                className="font-bold px-8 py-3 rounded-full border-2 border-accent text-accent text-sm hover:bg-accent hover:text-white transition-all"
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
            className="font-bold px-6 py-2.5 rounded-full text-white text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            {t("filter.clearAllFilters")}
          </button>
        </div>
      )}
    </div>
  );
}
