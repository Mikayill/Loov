"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { useProductSearch } from "@/lib/db/useProductSearch";
import { useSettings } from "@/lib/db/useSettings";
import { loadRecentSearches, saveRecentSearch, clearRecentSearches, type CatKey } from "@/lib/search";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import SearchResultsPanel from "./SearchResultsPanel";
import { categoryPlural } from "@/lib/i18n/labels";
import type { Product } from "@/types";

const navLinks: { href: string; key: TranslationKey }[] = [
  { href: "/",         key: "nav.home" },
  { href: "/products", key: "nav.products" },
  { href: "/bundles",  key: "nav.bundles" },
  { href: "/blog",     key: "nav.blog" },
  { href: "/about",    key: "nav.about" },
  { href: "/contact",  key: "nav.contact" },
];

/* Nordic category tab strip under the nav row */
const tabCategories: Product["category"][] = ["body", "blanket", "set", "towel", "romper", "bag"];

export default function Navbar() {
  const { t } = useLocale();
  const { freeShippingThreshold, deliveryMinDays, deliveryMaxDays } = useSettings();
  const { totalItems }   = useCart();
  const { count: wCount, hasUrgency } = useWishlist();
  const pathname         = usePathname();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const { user, signOut } = useAuth();
  const [cartBump,    setCartBump]    = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef  = useRef<HTMLButtonElement>(null);
  const prevTotalItems = useRef(totalItems);

  /* ── Search — inline bar (desktop) / expanding row (mobile), no popup ──
     Matching now happens server-side (GET /api/products/search) instead of
     pulling the whole catalog into the browser on every keystroke. Fetch a
     generous candidate set so the category-pill filter below still has
     enough to work with (MAX_RESULTS only shows 8 either way). */
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<CatKey>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchIconRef = useRef<HTMLButtonElement>(null);
  const mobileSearchRowRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRecentSearches(loadRecentSearches()); }, []);

  const { results: queryMatches } = useProductSearch(query, 50);
  const searchResults = useMemo(
    () => (activeCat === "all" ? queryMatches : queryMatches.filter((p) => p.category === activeCat)),
    [queryMatches, activeCat]
  );

  function closeSearch() {
    setSearchOpen(false);
  }
  function navigateFromSearch() {
    setRecentSearches((prev) => saveRecentSearch(query, prev));
    closeSearch();
  }
  function clearRecent() {
    clearRecentSearches();
    setRecentSearches([]);
  }
  function openSearch(focusMobile: boolean) {
    setMenuOpen(false);
    setSearchOpen(true);
    requestAnimationFrame(() => (focusMobile ? mobileInputRef : desktopInputRef).current?.focus());
  }

  /* Close search on outside click */
  useEffect(() => {
    if (!searchOpen) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      const inside =
        (desktopSearchRef.current && desktopSearchRef.current.contains(target)) ||
        (mobileSearchIconRef.current && mobileSearchIconRef.current.contains(target)) ||
        (mobileSearchRowRef.current && mobileSearchRowRef.current.contains(target));
      if (!inside) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [searchOpen]);

  /* Escape closes search */
  useEffect(() => {
    if (!searchOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeSearch(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  /* html's scroll-padding-top (for anchor-link navigation elsewhere) makes
     Chromium's "keep the edited input in view" heuristic nudge the whole
     page up on every keystroke, since the input sits in a sticky header —
     the header is already always visible, it just doesn't know that. Turn
     the padding off only while the search UI is actually in use. */
  useEffect(() => {
    document.documentElement.style.scrollPaddingTop = searchOpen ? "0px" : "";
    return () => { document.documentElement.style.scrollPaddingTop = ""; };
  }, [searchOpen]);

  /* Bump the cart badge whenever an item is added */
  useEffect(() => {
    if (totalItems > prevTotalItems.current) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 350);
      prevTotalItems.current = totalItems;
      return () => clearTimeout(t);
    }
    prevTotalItems.current = totalItems;
  }, [totalItems]);

  /* Close mobile menu on any outside click (except the menu / hamburger) */
  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(target) &&
        hamburgerRef.current && !hamburgerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  /* Close mobile menu on route change */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /* ⌘K / Ctrl+K opens search and focuses whichever input is visible */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch(window.innerWidth < 768);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    const base = href.split("#")[0];
    return base !== "/" && pathname.startsWith(base);
  }

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Utility top bar — static store facts (admin-driven values) */}
        <div className="bg-ink text-white text-[11px] tracking-[0.08em] uppercase font-medium py-2 px-4 flex items-center justify-center gap-8 whitespace-nowrap overflow-hidden">
          <span>{t("topbar.shipping").replace("{n}", String(freeShippingThreshold))}</span>
          <span className="hidden sm:inline opacity-90">{t("topbar.delivery").replace("{min}", String(deliveryMinDays)).replace("{max}", String(deliveryMaxDays))}</span>
          <span className="hidden md:inline opacity-90">{t("topbar.returns")}</span>
        </div>

        <nav className="bg-canvas border-b border-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-3 gap-3 md:gap-6">

              {/* Logo — the LOOV wordmark (warm-white variant, ink extracted) */}
              <Link href="/" className="flex items-center flex-shrink-0" aria-label="Loov — home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Loov" className="h-5 w-auto" />
              </Link>

              {/* Desktop search — Nordic: full-width functional bar in the center */}
              <div ref={desktopSearchRef} className="hidden md:block relative flex-1 max-w-xl">
                <div className="flex items-center gap-2.5 h-10 px-4 rounded-control border border-line bg-panel focus-within:border-ink transition-colors">
                    <svg className="w-4 h-4 flex-shrink-0 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={desktopInputRef}
                      type="text"
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                      onFocus={() => setSearchOpen(true)}
                      placeholder={t("search.placeholder")}
                      aria-label="Search products"
                      className="flex-1 min-w-0 text-[13px] text-ink placeholder-ink-muted bg-transparent outline-none focus-visible:outline-none"
                    />
                    {query && (
                      <button type="button" onClick={() => { setQuery(""); desktopInputRef.current?.focus(); }} aria-label="Clear search" className="text-ink-muted hover:text-ink flex-shrink-0">
                        <span className="text-xs">✕</span>
                      </button>
                    )}
                  </div>
                  {searchOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-canvas rounded-card border border-line shadow-2xl p-4 z-[200] animate-pop-in">
                      <SearchResultsPanel
                        query={query} setQuery={setQuery}
                        activeCat={activeCat} setActiveCat={setActiveCat}
                        results={searchResults} recentSearches={recentSearches}
                        onClearRecent={clearRecent} onNavigate={navigateFromSearch}
                      />
                    </div>
                  )}
                </div>

              {/* Right group */}
              <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">

                {/* Mobile search icon — expands an inline row below the nav, no popup */}
                <button
                  ref={mobileSearchIconRef}
                  onClick={() => (searchOpen ? closeSearch() : openSearch(true))}
                  aria-label="Search"
                  aria-expanded={searchOpen}
                  className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-panel transition-all active:scale-90"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Wishlist */}
                <Link
                  href="/wishlist"
                  aria-label="Wishlist"
                  className="relative w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-panel transition-all active:scale-90"
                >
                  <svg className="w-[18px] h-[18px]" fill={wCount > 0 ? "#E8789A" : "none"} viewBox="0 0 24 24" stroke={wCount > 0 ? "#E8789A" : "currentColor"} strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {/* Attention dot — price drop or a saved item running low on stock */}
                  {hasUrgency && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" aria-label="A wishlist item needs attention" />
                  )}
                </Link>

                {/* Theme toggle */}
                <ThemeToggle />

                {/* Language switcher — desktop only */}
                <div className="hidden md:block">
                  <LanguageSwitcher />
                </div>

                {/* Account — direct link (mobile + desktop), no dropdown */}
                {user ? (
                  <Link
                    href="/account"
                    aria-label="My account"
                    title={user.name}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-sm transition-opacity hover:opacity-80 flex-shrink-0 overflow-hidden bg-accent"
                  >
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.name[0]?.toUpperCase()
                    )}
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    aria-label="Sign in or register"
                    className="flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-accent transition-colors px-2.5 md:px-3 py-2 rounded-control hover:bg-panel flex-shrink-0"
                  >
                    <svg className="w-[18px] h-[18px] md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="hidden md:inline">{t("nav.signIn")}</span>
                  </Link>
                )}

                {/* Cart — Nordic: solid ink block, count inline */}
                <Link
                  href="/cart"
                  className="u-btn flex items-center gap-2 font-semibold px-4 py-2.5 rounded-control bg-ink text-white text-[12px] uppercase tracking-[0.08em] hover:bg-accent"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="hidden sm:inline">{t("nav.cart")}</span>
                  {totalItems > 0 && (
                    <span className={`text-[11px] font-extrabold text-[#9FC7B5] leading-none ${cartBump ? "animate-bump" : ""}`}>
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </Link>

                {/* Hamburger — mobile */}
                <button
                  ref={hamburgerRef}
                  className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-panel transition-all active:scale-90 gap-1.5"
                  onClick={() => { setSearchOpen(false); setMenuOpen((v) => !v); }}
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                >
                  <span className={`block w-5 h-0.5 bg-ink transition-all duration-200 origin-center ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
                  <span className={`block w-5 h-0.5 bg-ink transition-all duration-200 ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
                  <span className={`block w-5 h-0.5 bg-ink transition-all duration-200 origin-center ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Category tab strip — Nordic structural navigation */}
          <div className="border-t border-line overflow-x-auto no-scrollbar">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-5 md:gap-7 whitespace-nowrap">
              <Link
                href="/products"
                className={`py-3 text-[11.5px] uppercase tracking-[0.08em] font-semibold border-b-2 -mb-px transition-colors ${
                  pathname === "/products" ? "text-ink border-ink" : "text-ink-muted border-transparent hover:text-ink"
                }`}
              >
                {t("nav.products")}
              </Link>
              {tabCategories.map((cat) => (
                <Link
                  key={cat}
                  href={`/products?cat=${cat}`}
                  className="py-3 text-[11.5px] uppercase tracking-[0.08em] font-medium text-ink-muted border-b-2 border-transparent hover:text-ink transition-colors"
                >
                  {categoryPlural(cat, t)}
                </Link>
              ))}
              <Link
                href="/blog"
                className={`py-3 text-[11.5px] uppercase tracking-[0.08em] font-medium border-b-2 -mb-px transition-colors ${
                  isActive("/blog") ? "text-ink border-ink" : "text-ink-muted border-transparent hover:text-ink"
                }`}
              >
                {t("nav.blog")}
              </Link>
              <Link
                href="/bundles"
                className={`py-3 text-[11.5px] uppercase tracking-[0.08em] font-bold border-b-2 -mb-px transition-colors ${
                  isActive("/bundles") ? "text-accent border-accent" : "text-accent border-transparent hover:border-accent"
                }`}
              >
                {t("nav.bundles")}
              </Link>
            </div>
          </div>

          {/* Mobile search — expanding row, not a full-screen popup */}
          {searchOpen && (
            <div ref={mobileSearchRowRef} className="md:hidden border-t border-line bg-white px-4 py-3 animate-fade-up">
              <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-control border-2 border-line bg-surface mb-3">
                <svg className="w-4 h-4 flex-shrink-0 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("search.placeholder")}
                  aria-label="Search products"
                  className="flex-1 min-w-0 text-sm text-ink placeholder-ink-muted bg-transparent outline-none focus-visible:outline-none"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(""); mobileInputRef.current?.focus(); }} aria-label="Clear search" className="text-ink-muted hover:text-ink flex-shrink-0">
                    <span className="text-xs">✕</span>
                  </button>
                )}
                <button type="button" onClick={closeSearch} aria-label="Close search" className="text-ink-muted hover:text-ink flex-shrink-0 text-xs font-bold">
                  {t("search.close")}
                </button>
              </div>
              <SearchResultsPanel
                query={query} setQuery={setQuery}
                activeCat={activeCat} setActiveCat={setActiveCat}
                results={searchResults} recentSearches={recentSearches}
                onClearRecent={clearRecent} onNavigate={navigateFromSearch}
              />
            </div>
          )}

          {/* Mobile dropdown */}
          {menuOpen && (
            <div ref={mobileMenuRef} className="md:hidden border-t border-line bg-white px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-control text-sm font-semibold transition-colors ${
                    isActive(link.href)
                      ? "bg-accent-soft text-accent"
                      : "text-ink hover:bg-canvas"
                  }`}
                >
                  {t(link.key)}
                </Link>
              ))}
              {user ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-control bg-accent-soft">
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 overflow-hidden bg-accent">
                      {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.name[0]?.toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-semibold text-ink truncate">{user.name}</span>
                  </Link>
                  <button onClick={() => { signOut(); setMenuOpen(false); }}
                    className="text-xs font-bold text-red-400 flex-shrink-0 ml-2">{t("nav.signOut")}</button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-control text-sm font-semibold text-white transition-colors bg-accent">
                  {t("nav.signInRegister")}
                </Link>
              )}
              <div className="pt-2 border-t border-line mt-1">
                <p className="text-[10px] text-ink-muted font-bold uppercase tracking-widest px-3 mb-2">Language</p>
                <div className="px-2"><LanguageSwitcher /></div>
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}
