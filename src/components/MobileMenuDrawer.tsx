"use client";

/**
 * Mobile hamburger menu — a drawer sliding in from the RIGHT (~80% width),
 * chosen by the user from 5 interactive demos (17 Tem 2026, "design 4").
 * The page behind stays visible but BLURRED; the bottom tab bar stays fully
 * visible and sharp (the drawer and its backdrop both stop above it).
 *
 * Content rule (user's explicit request): NOTHING that already lives in the
 * bottom tab bar (Home / Products / Wishlist / Cart / Account) is repeated
 * here. The drawer holds only what the bottom bar doesn't cover:
 *
 *   [compact account header — avatar/name/email/provider + "switch account"]
 *   ── Shop ────────  Bundle Deals / On Sale / Journal / Size Guide
 *   ── Preferences ─  Dark Mode (inline switch) · Language (inline chips)
 *   ── Help ────────  FAQ / Contact
 *
 * Signed-in shoppers get the compact profile + inline account switcher at the
 * very top; guests get a sign-in row there instead.
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useDelayedUnmount } from "@/hooks/useDelayedUnmount";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useRememberedAccounts } from "@/hooks/useRememberedAccounts";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import Wordmark from "./Wordmark";

const SHOP_ROWS: { href: string; key: TranslationKey; icon: string }[] = [
  { href: "/bundles",           key: "nav.bundles",        icon: "🎁" },
  { href: "/deals",             key: "nav.deals",          icon: "🏷️" },
  { href: "/products?recent=1", key: "nav.recentlyViewed", icon: "🕐" },
  { href: "/blog",              key: "nav.blog",           icon: "📖" },
  { href: "/size-guide",        key: "sg.title",           icon: "📏" },
];

const HELP_ROWS: { href: string; key: TranslationKey; icon: string }[] = [
  { href: "/faq",     key: "help.faq",    icon: "❓" },
  { href: "/contact", key: "nav.contact", icon: "💬" },
];

/* Height of MobileBottomNav (h-14 tabs) — drawer + backdrop stop above it so
   the bottom bar stays sharp and tappable. The bar exists only below `sm`,
   so from `sm` up the drawer reaches the bottom edge. */
const ABOVE_BOTTOM_NAV = "max-sm:bottom-[calc(3.5rem+env(safe-area-inset-bottom))] bottom-0";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.14em] px-4 mb-1 mt-4">
      {children}
    </p>
  );
}

export default function MobileMenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, setLocale, t } = useLocale();
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  const { user } = useAuth();
  const accounts = useRememberedAccounts();
  const [mounted, setMounted] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const shouldRender = useDelayedUnmount(open, 260);

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(open);

  /* Reset the account-switch expansion each time the drawer closes. */
  useEffect(() => { if (!open) setSwitchOpen(false); }, [open]);

  const providerLabel: Record<string, string> = {
    email: t("acct.providerEmail"),
    google: t("acct.providerGoogle"),
    facebook: t("acct.providerFacebook"),
    phone: t("acct.providerPhone"),
  };
  const otherAccounts = accounts.filter((a) => a.id !== user?.id);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !shouldRender) return null;

  /* Staggered row entrance — each row fades/slides in a beat after the one
     above it, only while opening (closing is a single smooth slide-out). */
  let riseIndex = 0;
  const rise = () =>
    open
      ? { animation: "loov-fade-up 0.3s var(--ease-smooth) both", animationDelay: `${80 + riseIndex++ * 30}ms` }
      : undefined;

  return createPortal(
    <div className="md:hidden">
      {/* Blurred backdrop — page stays visible underneath; tap closes. */}
      <div
        className={`fixed inset-x-0 top-0 z-[590] backdrop-blur-[3px] ${ABOVE_BOTTOM_NAV} ${open ? "animate-fade-in" : "animate-fade-out"}`}
        style={{ backgroundColor: "rgba(20,20,18,0.28)" }}
        onClick={onClose}
      />

      {/* The drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed right-0 top-0 z-[600] w-[80%] max-w-[320px] bg-canvas border-l border-line shadow-2xl flex flex-col ${ABOVE_BOTTOM_NAV} ${open ? "animate-drawer-in" : "animate-drawer-out"}`}
      >
        {/* Header — wordmark + close. paddingTop 45px + pr-4 put the ✕ at the
            exact spot of the navbar's hamburger button (its top edge sits at
            45px: 33px announcement strip + nav-row padding; both bars are
            sticky, so the position is the same at any scroll depth) — the
            open/close buttons overlap instead of the ✕ floating higher. */}
        <div
          className="flex items-center justify-between pl-4 pr-4 pb-2 border-b border-line flex-shrink-0"
          style={{ paddingTop: "45px" }}
        >
          <Wordmark className="text-base text-ink" />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink-soft hover:bg-panel transition-colors active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pb-5">
          {/* ── Account header (compact) — always first ── */}
          {user ? (
            <div style={rise()} className="border-b border-line">
              {/* Compact profile: avatar + name + email + provider badge */}
              <Link href="/account" onClick={onClose} className="flex items-center gap-3 px-4 py-3.5 hover:bg-panel transition-colors">
                <span className="w-11 h-11 rounded-full bg-panel border border-line flex items-center justify-center text-ink text-base font-bold flex-shrink-0 overflow-hidden">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (user.name[0]?.toUpperCase() || "?")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-ink text-[14px] truncate">{user.name}</span>
                    <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-accent bg-accent-soft px-1.5 py-0.5 rounded">
                      ✓ {providerLabel[user.provider] || user.provider}
                    </span>
                  </span>
                  {user.email && <span className="block text-[11px] text-ink-muted truncate mt-0.5">{user.email}</span>}
                </span>
                <svg className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              {/* Account-switch button — expands the remembered accounts inline */}
              <button
                type="button"
                onClick={() => setSwitchOpen((v) => !v)}
                aria-expanded={switchOpen}
                className="w-full flex items-center justify-between gap-2 pl-4 pr-3 pb-3 -mt-1 text-left"
              >
                <span className="flex items-center gap-2 text-[12px] font-semibold text-accent">
                  <span>🔄</span> {t("acct.switchAccountBtn")}
                </span>
                <svg className={`w-3.5 h-3.5 text-ink-muted transition-transform ${switchOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {switchOpen && (
                <div className="pb-2">
                  {otherAccounts.map((a) => (
                    <Link
                      key={a.id}
                      href={`/login?email=${encodeURIComponent(a.email)}&switch=1`}
                      onClick={onClose}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-panel transition-colors"
                    >
                      <span className="w-8 h-8 rounded-full bg-panel border border-line flex items-center justify-center text-ink text-xs font-bold flex-shrink-0 overflow-hidden">
                        {a.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (a.name[0]?.toUpperCase() || "?")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-ink truncate">{a.name}</span>
                        <span className="block text-[10.5px] text-ink-muted truncate">{a.email || a.provider}</span>
                      </span>
                      <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-accent">{t("acct.switchAccount")}</span>
                    </Link>
                  ))}
                  <Link
                    href="/login?switch=1"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-panel transition-colors"
                  >
                    <span className="w-8 h-8 rounded-full border border-dashed border-line flex items-center justify-center text-ink-muted text-base flex-shrink-0">＋</span>
                    <span className="text-[12.5px] font-semibold text-accent">{t("acct.addAccount")}</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* Guest: sign-in / register row at the top */
            <Link
              href="/login"
              onClick={onClose}
              style={rise()}
              className="flex items-center justify-between px-4 py-3.5 border-b border-line bg-ink text-white hover:bg-ink/90 transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="text-[13px] font-bold">{t("nav.signInRegister")}</span>
              </span>
              <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* ── Shop — only what the bottom bar doesn't already cover ── */}
          <SectionLabel>{t("nav.shop")}</SectionLabel>
          <div className="border-y border-line divide-y divide-line">
            {SHOP_ROWS.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                onClick={onClose}
                style={rise()}
                className="flex items-center justify-between pl-4 pr-3 py-3 bg-canvas hover:bg-panel transition-colors"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-control bg-panel flex items-center justify-center text-sm flex-shrink-0">{r.icon}</span>
                  <span className="font-semibold text-ink text-[13px] truncate">{t(r.key)}</span>
                </span>
                <svg className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          {/* ── Preferences ── */}
          <SectionLabel>{t("acct.preferences")}</SectionLabel>
          <div className="border-y border-line divide-y divide-line">
            {/* Dark mode — inline switch */}
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              onClick={() => setTheme(dark ? "light" : "dark")}
              style={rise()}
              className="w-full flex items-center justify-between pl-4 pr-3 py-3 bg-canvas hover:bg-panel transition-colors text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-control bg-panel flex items-center justify-center text-sm flex-shrink-0">
                  {dark ? "🌙" : "☀️"}
                </span>
                <span className="font-semibold text-ink text-[13px]">{t("pref.darkMode")}</span>
              </span>
              <span
                aria-hidden
                className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${dark ? "bg-accent" : "bg-line"}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-[left] duration-200 ${dark ? "left-[22px]" : "left-0.5"}`}
                />
              </span>
            </button>

            {/* Language — inline chips, one tap */}
            <div style={rise()} className="flex items-center justify-between gap-3 pl-4 pr-3 py-3 bg-canvas">
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-control bg-panel flex items-center justify-center text-sm flex-shrink-0">🌐</span>
                <span className="font-semibold text-ink text-[13px]">{t("nav.language")}</span>
              </span>
              <span className="flex gap-1 flex-shrink-0">
                {LOCALES.map((code) => {
                  const selected = locale === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLocale(code)}
                      aria-pressed={selected}
                      title={LOCALE_META[code].label}
                      className={`h-8 min-w-[34px] px-1 rounded-control text-[10.5px] font-extrabold uppercase tracking-wide border transition-colors ${
                        selected
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-line text-ink-muted hover:border-ink-muted hover:text-ink"
                      }`}
                    >
                      {code}
                    </button>
                  );
                })}
              </span>
            </div>
          </div>

          {/* ── Help ── */}
          <SectionLabel>{t("footer.help")}</SectionLabel>
          <div className="border-y border-line divide-y divide-line">
            {HELP_ROWS.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                onClick={onClose}
                style={rise()}
                className="flex items-center justify-between pl-4 pr-3 py-3 bg-canvas hover:bg-panel transition-colors"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-control bg-panel flex items-center justify-center text-sm flex-shrink-0">{r.icon}</span>
                  <span className="font-semibold text-ink text-[13px] truncate">{t(r.key)}</span>
                </span>
                <svg className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
