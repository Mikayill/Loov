"use client";

/**
 * Mobile hamburger menu — a COMPACT DROPDOWN BOX that opens right under the
 * hamburger button: a small card with stacked options, while the rest of the
 * page (bottom tab bar included) stays visible behind it.
 *
 * History — the user rejected, in order: the inline 2-column grid panel, a
 * bottom sheet ("popup"), and a full-screen slide-in panel ("popup" again,
 * and it hid the bottom nav). What they want is the classic small hamburger
 * dropdown: "hamburgere basıcaz, küçük alt alta seçenekler veren ekran
 * çıkıcak". Do NOT turn this back into a sheet or a full-screen panel.
 *
 * Content (single column, stacked rows):
 *   [profile / sign-in row]  → [👶 baby row, inline edit]
 *   ── My Account ── Orders / Returns / Rewards / Reviews /
 *                    Addresses / Notifications / Security
 *   ── Shop ──       Products / Bundle Deals / On Sale / Journal
 *   ── Preferences ─ Dark Mode (switch) · Language (chips) — shared with
 *                    /account/settings via PreferenceRows.tsx
 *   ── Help (guests) FAQ / Size Guide / Contact
 *   [sign out]
 *
 * Rendered through a portal because the frosted navbar creates a stacking
 * context that would trap an in-tree dropdown behind later content.
 */

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { useDelayedUnmount } from "@/hooks/useDelayedUnmount";
import { fetchMyProfile, updateMyProfile, type MyProfile } from "@/lib/db/profile";
import { monthsOld, ageLabel } from "@/lib/babyAge";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { DarkModeRow, LanguageRow } from "./PreferenceRows";

/* Stacked account rows — icon + label + chevron, one per line. */
const ACCOUNT_ROWS: { href: string; key: TranslationKey; icon: string }[] = [
  { href: "/account/orders",        key: "acct.myOrders",      icon: "📦" },
  { href: "/account/returns",       key: "acct.myReturns",     icon: "↩️" },
  { href: "/account/rewards",       key: "acct.rewards",       icon: "⭐" },
  { href: "/account/reviews",       key: "acct.myReviews",     icon: "📝" },
  { href: "/account/addresses",     key: "acct.addresses",     icon: "📍" },
  { href: "/account/notifications", key: "acct.notifications", icon: "🔔" },
  { href: "/account/security",      key: "acct.security",      icon: "🔒" },
];

const SHOP_ROWS: { href: string; key: TranslationKey; icon: string }[] = [
  { href: "/products",        key: "nav.products", icon: "🛍️" },
  { href: "/bundles",         key: "nav.bundles",  icon: "🎁" },
  { href: "/products?deal=1", key: "nav.deals",    icon: "🏷️" },
  { href: "/blog",            key: "nav.blog",     icon: "📖" },
];

const HELP_ROWS: { href: string; key: TranslationKey; icon: string }[] = [
  { href: "/faq",        key: "help.faq",    icon: "❓" },
  { href: "/size-guide", key: "sg.title",    icon: "📏" },
  { href: "/contact",    key: "nav.contact", icon: "💬" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9.5px] font-bold text-ink-muted uppercase tracking-[0.14em] px-3 mb-1 mt-3">
      {children}
    </p>
  );
}

function MenuRow({
  href, icon, label, onClose,
}: { href: string; icon: string; label: string; onClose: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center justify-between px-3 py-2.5 hover:bg-panel transition-colors"
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-control bg-panel flex items-center justify-center text-sm flex-shrink-0">{icon}</span>
        <span className="font-semibold text-ink text-[13px] truncate">{label}</span>
      </span>
      <svg className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default function MobileMenu({
  open, onClose, anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { user, signOut } = useAuth();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const shouldRender = useDelayedUnmount(open, 180);
  const [top, setTop] = useState(0);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [babyEditing, setBabyEditing] = useState(false);
  const [babyName, setBabyName] = useState("");
  const [babyDate, setBabyDate] = useState("");
  const [babySaving, setBabySaving] = useState(false);
  const [babyError, setBabyError] = useState("");

  useEffect(() => setMounted(true), []);

  /* Pin the box right under the hamburger button (sticky header, so the
     anchor position is stable while the menu is open). */
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = anchorRef.current?.getBoundingClientRect();
      setTop(rect ? rect.bottom + 8 : 64);
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Load the baby-profile snippet once, the first time the menu opens for a
     signed-in shopper — not on every open. */
  useEffect(() => {
    if (!open || !user || profile !== null) return;
    let cancelled = false;
    fetchMyProfile().then(({ profile: p }) => {
      if (cancelled) return;
      setProfile(p);
      setBabyName(p?.babyName ?? "");
      setBabyDate(p?.babyBirthdate ?? "");
    });
    return () => { cancelled = true; };
  }, [open, user, profile]);

  const saveBaby = useCallback(async () => {
    setBabySaving(true);
    setBabyError("");
    const res = await updateMyProfile({
      babyName: babyName.trim(),
      babyBirthdate: babyDate || null,
    });
    setBabySaving(false);
    if (res.error) { setBabyError(res.error); return; }
    setProfile((p) => ({
      ...(p ?? { name: null, phone: null, babyName: null, babyBirthdate: null, babyGender: null, language: null, avatarUrl: null, notificationPrefs: {} }),
      babyName: babyName.trim() || null,
      babyBirthdate: babyDate || null,
    }));
    setBabyEditing(false);
  }, [babyName, babyDate]);

  if (!mounted || !shouldRender) return null;

  const babyMonths = profile?.babyBirthdate ? monthsOld(profile.babyBirthdate) : null;

  return createPortal(
    <div className="md:hidden">
      {/* Invisible click-catcher — closes the menu on any outside tap without
          dimming the page (this must not look or feel like a popup). */}
      <div className="fixed inset-0 z-[590]" onClick={onClose} />

      {/* The dropdown box itself */}
      <div
        role="menu"
        aria-label="Menu"
        className={`fixed inset-x-3 z-[600] rounded-card border border-line bg-canvas shadow-2xl overflow-y-auto ${open ? "animate-drop-in" : "animate-drop-out"}`}
        style={{ top, maxHeight: `calc(100dvh - ${top}px - 5.5rem - env(safe-area-inset-bottom))` }}
      >
        <div className="py-1.5">
          {user ? (
            <>
              {/* Profile row */}
              <Link href="/account" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 hover:bg-panel transition-colors">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-ink text-sm font-extrabold flex-shrink-0 overflow-hidden bg-panel border border-line">
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : user.name[0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-ink truncate">{user.name}</span>
                    <span className="block text-[10.5px] text-ink-muted">{t("acct.editProfile")}</span>
                  </span>
                </span>
                <svg className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* 👶 Baby profile row — expands into the inline editor */}
              {babyEditing ? (
                <div className="px-3 py-2.5 space-y-2">
                  <p className="text-[9.5px] font-semibold text-ink-muted uppercase tracking-[0.12em]">👶 {t("acct.yourLittleOne")}</p>
                  <input
                    type="text"
                    value={babyName}
                    onChange={(e) => setBabyName(e.target.value)}
                    placeholder={t("acct.babyName")}
                    className="w-full h-9 px-3 rounded-control border border-line bg-canvas text-[13px] text-ink font-medium focus:border-ink outline-none"
                  />
                  <input
                    type="date"
                    value={babyDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setBabyDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-control border border-line bg-canvas text-[13px] text-ink font-medium focus:border-ink outline-none"
                  />
                  {babyError && <p className="text-danger text-[11px] font-semibold">{babyError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={saveBaby}
                      disabled={babySaving}
                      className="u-btn flex-1 h-8 rounded-control text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white bg-ink disabled:opacity-60"
                    >
                      {babySaving ? t("auth.saving") : t("acct.saveChanges")}
                    </button>
                    <button
                      onClick={() => { setBabyEditing(false); setBabyName(profile?.babyName ?? ""); setBabyDate(profile?.babyBirthdate ?? ""); setBabyError(""); }}
                      className="h-8 px-3.5 rounded-control border border-line text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-soft"
                    >
                      {t("acct.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setBabyEditing(true)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-panel transition-colors text-left">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-panel flex items-center justify-center text-sm flex-shrink-0">
                      {profile?.babyGender === "girl" ? "👧" : profile?.babyGender === "boy" ? "👦" : "🍼"}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink truncate">
                        {profile?.babyName || t("acct.yourLittleOne")}
                      </span>
                      <span className="block text-[10.5px] text-ink-muted">
                        {babyMonths !== null ? ageLabel(babyMonths) : t("acct.addBabyInfo")}
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-accent flex-shrink-0">✎</span>
                </button>
              )}

              {/* ── My Account — stacked rows ── */}
              <SectionLabel>{t("acct.title")}</SectionLabel>
              <div className="divide-y divide-line border-t border-b border-line">
                {ACCOUNT_ROWS.map((r) => (
                  <MenuRow key={r.href} href={r.href} icon={r.icon} label={t(r.key)} onClose={onClose} />
                ))}
              </div>
            </>
          ) : (
            /* Guest: sign-in row on top */
            <Link
              href="/login"
              onClick={onClose}
              className="mx-1.5 flex items-center justify-between px-3 py-3 rounded-control bg-ink text-white hover:bg-ink/90 transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="text-[13px] font-bold">{t("nav.signInRegister")}</span>
              </span>
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* ── Shop — main store navigation ── */}
          <SectionLabel>{t("nav.shop")}</SectionLabel>
          <div className="divide-y divide-line border-t border-b border-line">
            {SHOP_ROWS.map((r) => (
              <MenuRow key={r.href} href={r.href} icon={r.icon} label={t(r.key)} onClose={onClose} />
            ))}
          </div>

          {/* ── Preferences — dark mode + language, shared with /account/settings ── */}
          <SectionLabel>{t("acct.preferences")}</SectionLabel>
          <div className="divide-y divide-line border-t border-b border-line">
            <DarkModeRow />
            <LanguageRow />
          </div>

          {/* ── Help — guests only, signed-in users already have a long list ── */}
          {!user && (
            <>
              <SectionLabel>{t("footer.help")}</SectionLabel>
              <div className="divide-y divide-line border-t border-b border-line">
                {HELP_ROWS.map((r) => (
                  <MenuRow key={r.href} href={r.href} icon={r.icon} label={t(r.key)} onClose={onClose} />
                ))}
              </div>
            </>
          )}

          {/* Sign out */}
          {user && (
            <button
              onClick={() => { onClose(); signOut(); }}
              className="w-full mt-1.5 flex items-center gap-3 px-3 py-2.5 text-danger hover:bg-danger-soft transition-colors text-left border-t border-line"
            >
              <span className="w-8 h-8 rounded-control bg-danger-soft flex items-center justify-center text-sm flex-shrink-0">↪</span>
              <span className="font-semibold text-[13px]">{t("acct.signOut")}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
