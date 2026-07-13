"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SearchResultsPanel from "@/components/SearchResultsPanel";
import { useLocale } from "@/context/LocaleContext";
import { useProductSearch } from "@/lib/db/useProductSearch";
import { loadRecentSearches, saveRecentSearch, clearRecentSearches, type CatKey } from "@/lib/search";

export default function NotFound() {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<CatKey>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRecentSearches(loadRecentSearches()); }, []);

  const { results: queryMatches } = useProductSearch(query, 50);
  const results = useMemo(
    () => (activeCat === "all" ? queryMatches : queryMatches.filter((p) => p.category === activeCat)),
    [queryMatches, activeCat]
  );

  useEffect(() => {
    if (!searchOpen) return;
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [searchOpen]);

  /* Same scroll-padding-top workaround as Navbar's search — see its comment. */
  useEffect(() => {
    document.documentElement.style.scrollPaddingTop = searchOpen ? "0px" : "";
    return () => { document.documentElement.style.scrollPaddingTop = ""; };
  }, [searchOpen]);

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
        {/* Big number */}
        <div className="relative mb-6">
          <p
            className="text-[120px] sm:text-[160px] font-extrabold leading-none select-none"
            style={{ color: "#EDE5D8" }}
          >
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🌿
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A2320] mb-3">
          {t("err.notFoundTitle")}
        </h1>
        <p className="text-[#5E5450] mb-8 max-w-sm leading-relaxed text-sm">
          {t("err.notFoundBody")}
        </p>

        {/* Search bar — real input, live dropdown, no popup */}
        <div ref={searchRef} className="relative w-full max-w-sm mb-6">
          <div className="flex items-center gap-3 px-5 py-3 bg-white border-2 border-[#DDD5CC] rounded-2xl shadow-sm">
            <svg className="w-4 h-4 text-[#9A8E88] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder={t("err.searchPlaceholder")}
              aria-label="Search products"
              className="flex-1 min-w-0 text-sm text-[#2A2320] placeholder-[#9A8E88] bg-transparent outline-none focus-visible:outline-none"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search" className="text-[#9A8E88] hover:text-[#2A2320] flex-shrink-0 text-xs">
                ✕
              </button>
            )}
          </div>
          {searchOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#DDD5CC] shadow-2xl p-4 z-[200] animate-pop-in text-left">
              <SearchResultsPanel
                query={query} setQuery={setQuery}
                activeCat={activeCat} setActiveCat={setActiveCat}
                results={results} recentSearches={recentSearches}
                onClearRecent={() => { clearRecentSearches(); setRecentSearches([]); }}
                onNavigate={() => { setRecentSearches((prev) => saveRecentSearch(query, prev)); setSearchOpen(false); }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3 rounded-full text-white hover:opacity-90 shadow-sm transition-opacity"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            ← {t("err.backToHome")}
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3 rounded-full border-2 border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-all"
          >
            {t("err.browseProducts")}
          </Link>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { label: t("nav.products"), href: "/products" },
            { label: t("nav.blog"),     href: "/blog" },
            { label: t("pdp.sizeGuide"),href: "/size-guide" },
            { label: t("nav.about"),    href: "/about" },
            { label: t("nav.contact"),  href: "/contact" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-[#9A8E88] hover:text-[#5E9E8C] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
