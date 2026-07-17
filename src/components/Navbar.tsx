"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useLoyalty } from "@/context/LoyaltyContext";
import { useLocale } from "@/context/LocaleContext";
import { useProductSearch } from "@/lib/db/useProductSearch";
import { useProductsByIds } from "@/lib/db/useProductsByIds";
import { useSettings } from "@/lib/db/useSettings";
import { useDelayedUnmount } from "@/hooks/useDelayedUnmount";
import { loadRecentSearches, saveRecentSearch, clearRecentSearches, type CatKey } from "@/lib/search";
import { ACCOUNT_LINKS } from "@/lib/accountNav";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import SearchResultsPanel from "./SearchResultsPanel";
import MobileMenuSheet from "./MobileMenuSheet";
import Wordmark from "./Wordmark";

export default function Navbar() {
  const { t } = useLocale();
  const { freeShippingThreshold, deliveryMinDays, deliveryMaxDays, loyaltyRedeemValue } = useSettings();
  const { balance: pointsBalance } = useLoyalty();
  const { totalItems }   = useCart();
  const { count: wCount, hasUrgency } = useWishlist();
  const pathname         = usePathname();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const { user, signOut } = useAuth();
  const [cartBump,    setCartBump]    = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [annoIdx,     setAnnoIdx]     = useState(0);
  const [annoShown,   setAnnoShown]   = useState(true);
  const accountRef    = useRef<HTMLDivElement>(null);
  const prevTotalItems = useRef(totalItems);
  const [pointsBump, setPointsBump] = useState(false);
  const prevPoints = useRef(pointsBalance);


  /* Rotating store facts — one at a time on mobile (fades), all three on md+. */
  const topbarFacts = [
    t("topbar.shipping").replace("{n}", String(freeShippingThreshold)),
    t("topbar.delivery").replace("{min}", String(deliveryMinDays)).replace("{max}", String(deliveryMaxDays)),
    t("topbar.returns"),
  ];

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

  /* Recently-viewed products — the fallback shown in the search panel before
     the shopper types anything (so it's never an empty "no results"). */
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    setRecentSearches(loadRecentSearches());
    try {
      const ids: string[] = JSON.parse(localStorage.getItem("loov_recently_viewed") ?? "[]");
      if (Array.isArray(ids)) setRecentIds(ids.slice(0, 6));
    } catch { /* ignore */ }
  }, [searchOpen]);
  const recentProducts = useProductsByIds(recentIds);

  const { results: queryMatches, loading: searchLoading } = useProductSearch(query, 50);
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

  /* Bump the points chip when the balance grows (gamification feedback) */
  useEffect(() => {
    if (pointsBalance > prevPoints.current) {
      setPointsBump(true);
      const id = setTimeout(() => setPointsBump(false), 400);
      prevPoints.current = pointsBalance;
      return () => clearTimeout(id);
    }
    prevPoints.current = pointsBalance;
  }, [pointsBalance]);

  /* Close mobile menu + account dropdown on route change */
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  /* Close the account dropdown on any outside click */
  useEffect(() => {
    if (!accountOpen) return;
    function handle(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [accountOpen]);

  /* Rotate the top-bar fact every 4s with a quick fade (mobile shows one). */
  useEffect(() => {
    const id = setInterval(() => {
      setAnnoShown(false);
      setTimeout(() => { setAnnoIdx((i) => (i + 1) % 3); setAnnoShown(true); }, 260);
    }, 4000);
    return () => clearInterval(id);
  }, []);

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

  /* Keep the mobile menu / search row mounted a beat after closing so the
     fade-down exit animation has time to play (matches loov-fade-down's
     200ms — otherwise they'd unmount instantly and only the open animation
     would ever be seen). */
  const mobileSearchRender = useDelayedUnmount(searchOpen, 200);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    const base = href.split("#")[0];
    return base !== "/" && pathname.startsWith(base);
  }

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Utility top bar — all three facts on md+, a single rotating one below */}
        <div className="bg-ink text-white text-[11px] tracking-[0.08em] uppercase font-medium py-2 px-4 h-[33px] flex items-center justify-center gap-8 whitespace-nowrap overflow-hidden">
          {/* md+ : the full set */}
          <span className="hidden md:inline">{topbarFacts[0]}</span>
          <span className="hidden md:inline opacity-90">{topbarFacts[1]}</span>
          <span className="hidden md:inline opacity-90">{topbarFacts[2]}</span>
          {/* < md : one at a time, cross-fading */}
          <span className={`md:hidden transition-opacity duration-300 ${annoShown ? "opacity-100" : "opacity-0"}`}>
            {topbarFacts[annoIdx]}
          </span>
        </div>

        {/* Frosted glass — applied per row: a nested backdrop-filter inside an
            already-filtered ancestor is ignored by browsers, so the <nav> stays
            plain and each bar frosts itself. */}
        <nav className="border-b border-line">
          <div className="bg-canvas/75 backdrop-blur-lg backdrop-saturate-150">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-3 gap-3 md:gap-6">

              {/* Logo — the LOOV wordmark (warm-white variant, ink extracted) */}
              <Link href="/" className="flex items-center flex-shrink-0" aria-label="Loov — home">
                <Wordmark className="text-[21px] text-ink" />
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
                        onClearRecent={clearRecent} onNavigate={navigateFromSearch} searching={searchLoading} fallback={recentProducts}
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
                  className="md:hidden w-11 h-11 rounded-full flex items-center justify-center text-ink-soft hover:bg-panel transition-all active:scale-90"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Wishlist — desktop only; the mobile bottom nav already has it
                    (with the same urgency dot) within one-thumb reach, so
                    repeating it up here just crowded the row (and on a 375-390px
                    phone, pushed the hamburger button partly off-screen). */}
                <Link
                  href="/wishlist"
                  aria-label="Wishlist"
                  className="relative hidden md:flex w-11 h-11 rounded-full items-center justify-center text-ink-soft hover:bg-panel transition-all active:scale-90"
                >
                  <svg className="w-[18px] h-[18px]" fill={wCount > 0 ? "#E8789A" : "none"} viewBox="0 0 24 24" stroke={wCount > 0 ? "#E8789A" : "currentColor"} strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {/* Attention dot — price drop or a saved item running low on stock */}
                  {hasUrgency && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" aria-label="A wishlist item needs attention" />
                  )}
                </Link>

                {/* Loov points — the shopper's running score, one tap from Rewards */}
                {user && (
                  <Link
                    href="/account/rewards"
                    title={t("nav.pointsTip").replace("{n}", String(loyaltyRedeemValue))}
                    className={`hidden sm:flex items-center gap-1 px-2 h-9 rounded-control text-ink text-[12px] font-bold tabular-nums hover:bg-panel transition-all active:scale-90 ${pointsBump ? "animate-bump" : ""}`}
                  >
                    <span className="text-[var(--color-star)]" aria-hidden>★</span>
                    {pointsBalance.toLocaleString()}
                  </Link>
                )}

                {/* Theme toggle */}
                <ThemeToggle />

                {/* Language switcher — desktop only */}
                <div className="hidden md:block">
                  <LanguageSwitcher />
                </div>

                {/* Account — desktop dropdown (mobile uses the hamburger) */}
                {user ? (
                  <div ref={accountRef} className="relative hidden md:block">
                    <button
                      onClick={() => setAccountOpen((v) => !v)}
                      aria-label="My account"
                      aria-expanded={accountOpen}
                      title={user.name}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-ink font-extrabold text-sm bg-panel border border-line transition-opacity hover:opacity-80 flex-shrink-0 overflow-hidden"
                    >
                      {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.name[0]?.toUpperCase()
                      )}
                    </button>
                    {accountOpen && (
                      <div className="absolute right-0 top-full mt-2 w-60 bg-canvas rounded-card border border-line shadow-2xl p-2 z-[200] animate-pop-in">
                        <div className="px-3 py-2 border-b border-line mb-1">
                          <p className="text-sm font-bold text-ink truncate">{user.name}</p>
                          {user.email && <p className="text-[11px] text-ink-muted truncate">{user.email}</p>}
                        </div>
                        <Link href="/account" onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-control text-[13px] font-semibold text-ink hover:bg-panel transition-colors">
                          <span aria-hidden>👤</span> {t("acct.editProfile")}
                        </Link>
                        <div className="h-px bg-line my-1" />
                        {ACCOUNT_LINKS.map((l) => (
                          <Link key={l.href} href={l.href} onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-control text-[13px] font-medium text-ink-soft hover:bg-panel hover:text-ink transition-colors">
                            <span aria-hidden>{l.icon}</span> {t(l.key)}
                          </Link>
                        ))}
                        <div className="h-px bg-line my-1" />
                        <button onClick={() => { signOut(); setAccountOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-[13px] font-semibold text-danger hover:bg-danger-soft transition-colors">
                          <span aria-hidden>↪</span> {t("nav.signOut")}
                        </button>
                      </div>
                    )}
                  </div>
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

                {/* Cart — Nordic: solid ink block, count inline. Desktop/tablet
                    only; the mobile bottom nav carries the cart tab (same
                    badge count) within thumb reach. */}
                <Link
                  href="/cart"
                  className="u-btn hidden md:flex items-center gap-2 font-semibold px-4 py-2.5 rounded-control bg-ink text-white text-[12px] uppercase tracking-[0.08em] hover:bg-ink/85"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{t("nav.cart")}</span>
                  {totalItems > 0 && (
                    <span className={`text-[11px] font-extrabold opacity-75 leading-none ${cartBump ? "animate-bump" : ""}`}>
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </Link>

                {/* Hamburger — mobile */}
                <button
                  className="md:hidden flex flex-col justify-center items-center w-11 h-11 rounded-lg hover:bg-panel transition-all active:scale-90 gap-1.5"
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
          </div>

          {/* Category strip — Ürünler / Paketler / İndirimde / Beden Kılavuzu /
              Son Görüntülenenler / Blog. The pill row scrolls horizontally
              (overflow-x-auto); Chromium's used-value quirk otherwise forces
              overflow-y to "auto" too on a box with only one axis set (same
              bug fixed on the PDP tab bar) — overflow-y-hidden pins it. */}
          <div className="border-t border-line md:border-t-0 bg-canvas/75 backdrop-blur-lg backdrop-saturate-150">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="overflow-x-auto overflow-y-hidden no-scrollbar flex items-center gap-2 whitespace-nowrap py-2.5">
                <Link
                  href="/products"
                  className={`u-btn px-3.5 py-2 rounded-control border text-[11px] uppercase tracking-[0.08em] font-semibold ${
                    pathname === "/products"
                      ? "bg-ink text-white border-ink"
                      : "bg-canvas/60 text-ink-soft border-line hover:border-ink hover:text-ink"
                  }`}
                >
                  {t("nav.products")}
                </Link>
                <Link
                  href="/bundles"
                  className={`u-btn px-3.5 py-2 rounded-control border text-[11px] uppercase tracking-[0.08em] font-bold ${
                    isActive("/bundles")
                      ? "bg-ink text-white border-ink"
                      : "bg-canvas/60 text-accent-deep border-line hover:border-ink"
                  }`}
                >
                  {t("nav.bundles")}
                </Link>
                <Link
                  href="/products?deal=1"
                  className="u-btn px-3.5 py-2 rounded-control border border-line bg-canvas/60 text-[11px] uppercase tracking-[0.08em] font-bold text-danger hover:border-danger"
                >
                  {t("nav.deals")}
                </Link>
                {/* Recently Viewed — now a real filter on /products (?recent=1),
                    not a separate anchor-scroll section on the same page
                    (that used to make "Products" and "Recently Viewed" feel
                    like two conflicting views of the same screen). */}
                <Link
                  href="/products?recent=1"
                  className="u-btn px-3.5 py-2 rounded-control border border-line bg-canvas/60 text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-soft hover:border-ink hover:text-ink"
                >
                  {t("nav.recentlyViewed")}
                </Link>
                <Link
                  href="/size-guide"
                  className={`u-btn px-3.5 py-2 rounded-control border text-[11px] uppercase tracking-[0.08em] font-semibold ${
                    isActive("/size-guide")
                      ? "bg-ink text-white border-ink"
                      : "bg-canvas/60 text-ink-soft border-line hover:border-ink hover:text-ink"
                  }`}
                >
                  {t("sg.title")}
                </Link>
                <Link
                  href="/blog"
                  className={`u-btn px-3.5 py-2 rounded-control border text-[11px] uppercase tracking-[0.08em] font-semibold ${
                    isActive("/blog")
                      ? "bg-ink text-white border-ink"
                      : "bg-canvas/60 text-ink-soft border-line hover:border-ink hover:text-ink"
                  }`}
                >
                  {t("nav.blog")}
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile search — expanding row, not a full-screen popup */}
          {mobileSearchRender && (
            <div ref={mobileSearchRowRef} className={`md:hidden border-t border-line bg-canvas/95 backdrop-blur-lg px-4 py-3 ${searchOpen ? "animate-fade-up" : "animate-fade-down"}`}>
              <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-control border border-line bg-panel mb-3">
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
                onClearRecent={clearRecent} onNavigate={navigateFromSearch} searching={searchLoading} fallback={recentProducts}
              />
            </div>
          )}

          {/* Mobile hamburger menu — a real bottom-sheet overlay now (portal,
              dialog semantics, baby-profile quick-edit), not an inline panel
              that pushed page content down. */}
          <MobileMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
        </nav>
      </header>
    </>
  );
}
