"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import LanguageSwitcher from "./LanguageSwitcher";
import SearchModal from "./SearchModal";

const announcementKeys: TranslationKey[] = [
  "announce.freeShipping",
  "announce.organic",
  "announce.giftWrap",
  "announce.returns",
];

const navLinks: { href: string; key: TranslationKey }[] = [
  { href: "/",         key: "nav.home" },
  { href: "/products", key: "nav.products" },
  { href: "/bundles",  key: "nav.bundles" },
  { href: "/blog",     key: "nav.blog" },
  { href: "/about",    key: "nav.about" },
  { href: "/contact",  key: "nav.contact" },
];

export default function Navbar() {
  const { t } = useLocale();
  const { totalItems }   = useCart();
  const { count: wCount, hasUrgency } = useWishlist();
  const pathname         = usePathname();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const { user, signOut } = useAuth();
  const [annoIdx,     setAnnoIdx]     = useState(0);
  const [annoVisible, setAnnoVisible] = useState(true);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef  = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setAnnoVisible(false);
      setTimeout(() => {
        setAnnoIdx((i) => (i + 1) % announcementKeys.length);
        setAnnoVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(t);
  }, []);

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

  /* ⌘K / Ctrl+K opens search */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    const base = href.split("#")[0];
    return base !== "/" && pathname.startsWith(base);
  }

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Rotating announcement bar */}
        <div
          className="text-white text-center text-xs sm:text-sm py-2 px-4 font-semibold overflow-hidden min-h-[32px] flex items-center justify-center"
          style={{ backgroundColor: "#5E9E8C" }}
        >
          <span
            className="transition-opacity duration-300"
            style={{ opacity: annoVisible ? 1 : 0 }}
          >
            {t(announcementKeys[annoIdx])}
          </span>
        </div>

        <nav className="bg-white border-b border-[#DDD5CC] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3 gap-3">

              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                <span className="text-2xl">🌿</span>
                <span className="text-xl font-extrabold text-[#2A2320] tracking-tight">Loov</span>
              </Link>

              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-5 flex-1 justify-center">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-semibold transition-colors whitespace-nowrap ${
                      isActive(link.href)
                        ? "text-[#5E9E8C]"
                        : "text-[#5E5450] hover:text-[#2A2320]"
                    }`}
                  >
                    {t(link.key)}
                  </Link>
                ))}
              </div>

              {/* Right group */}
              <div className="flex items-center gap-1.5 flex-shrink-0">

                {/* Desktop search bar */}
                <button
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search"
                  className="hidden md:flex items-center gap-2.5 w-52 lg:w-64 h-9 px-3.5 rounded-xl border-2 border-[#DDD5CC] bg-[#FAFAF8] text-[#9A8E88] text-sm hover:border-[#5E9E8C] transition-colors group"
                >
                  <svg className="w-4 h-4 flex-shrink-0 group-hover:text-[#5E9E8C] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="flex-1 text-left text-[13px] text-[#B0A89E] group-hover:text-[#9A8E88] transition-colors">Search products…</span>
                  <kbd className="hidden lg:inline text-[10px] bg-[#EDE5D8] text-[#9A8E88] px-1.5 py-0.5 rounded font-mono leading-none">⌘K</kbd>
                </button>

                {/* Mobile search icon */}
                <button
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search"
                  className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-[#5E5450] hover:bg-[#EDE5D8] transition-colors"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Wishlist */}
                <Link
                  href="/wishlist"
                  aria-label="Wishlist"
                  className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#5E5450] hover:bg-[#EDE5D8] transition-colors"
                >
                  <svg className="w-[18px] h-[18px]" fill={wCount > 0 ? "#E8789A" : "none"} viewBox="0 0 24 24" stroke={wCount > 0 ? "#E8789A" : "currentColor"} strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {/* Attention dot — price drop or a saved item running low on stock */}
                  {hasUrgency && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" aria-label="A wishlist item needs attention" />
                  )}
                </Link>

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
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-sm transition-opacity hover:opacity-80 flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: "#5E9E8C" }}
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
                    className="flex items-center gap-1.5 text-sm font-bold text-[#5E5450] hover:text-[#5E9E8C] transition-colors px-2.5 md:px-3 py-2 rounded-xl hover:bg-[#EDE5D8] flex-shrink-0"
                  >
                    <svg className="w-[18px] h-[18px] md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="hidden md:inline">{t("nav.signIn")}</span>
                  </Link>
                )}

                {/* Cart */}
                <Link
                  href="/cart"
                  className="relative flex items-center gap-1.5 font-bold px-4 py-2 rounded-full text-white text-sm transition-colors hover:opacity-90"
                  style={{ backgroundColor: "#5E9E8C" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="hidden sm:inline">Cart</span>
                  {totalItems > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#2A2320] text-white text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </Link>

                {/* Hamburger — mobile */}
                <button
                  ref={hamburgerRef}
                  className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-[#EDE5D8] transition-colors gap-1.5"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                >
                  <span className={`block w-5 h-0.5 bg-[#2A2320] transition-all duration-200 origin-center ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
                  <span className={`block w-5 h-0.5 bg-[#2A2320] transition-all duration-200 ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
                  <span className={`block w-5 h-0.5 bg-[#2A2320] transition-all duration-200 origin-center ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile dropdown */}
          {menuOpen && (
            <div ref={mobileMenuRef} className="md:hidden border-t border-[#DDD5CC] bg-white px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive(link.href)
                      ? "bg-[#EAF2F0] text-[#5E9E8C]"
                      : "text-[#2A2320] hover:bg-[#F5F0EB]"
                  }`}
                >
                  {t(link.key)}
                </Link>
              ))}
              {user ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EAF2F0]">
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 overflow-hidden" style={{ backgroundColor: "#5E9E8C" }}>
                      {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.name[0]?.toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-semibold text-[#2A2320] truncate">{user.name}</span>
                  </Link>
                  <button onClick={() => { signOut(); setMenuOpen(false); }}
                    className="text-xs font-bold text-red-400 flex-shrink-0 ml-2">{t("nav.signOut")}</button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: "#5E9E8C" }}>
                  {t("nav.signInRegister")}
                </Link>
              )}
              <div className="pt-2 border-t border-[#DDD5CC] mt-1">
                <p className="text-[10px] text-[#9A8E88] font-bold uppercase tracking-widest px-3 mb-2">Language</p>
                <div className="px-2"><LanguageSwitcher /></div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Search modal — lives outside header to cover full page */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
