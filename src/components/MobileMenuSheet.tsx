"use client";

/**
 * Mobile hamburger menu — a tall bottom sheet whose content is a SINGLE
 * COLUMN of stacked rows (app-menu style: icon + label + chevron), grouped
 * into sections, exactly like the big commerce apps do:
 *
 *   [profile / sign-in row]
 *   [👶 baby profile row — tap to edit inline]
 *   ── My Account ──   Orders / Returns / Rewards / Reviews /
 *                      Addresses / Notifications / Security
 *   ── Preferences ──  Dark Mode (inline switch) · Language (inline chips)
 *   ── Help (guests) ─ FAQ / Size Guide / Contact
 *   [sign out]
 *
 * The Preferences rows are shared with /account/settings (PreferenceRows.tsx)
 * so the two surfaces can never drift apart. The old design (2-column link
 * grid + a floating dropdown language picker + a near-empty guest state)
 * was explicitly rejected by the user — don't bring any of it back.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { useDelayedUnmount } from "@/hooks/useDelayedUnmount";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
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

const HELP_ROWS: { href: string; key: TranslationKey; icon: string }[] = [
  { href: "/faq",        key: "help.faq",    icon: "❓" },
  { href: "/size-guide", key: "sg.title",    icon: "📏" },
  { href: "/contact",    key: "nav.contact", icon: "💬" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.14em] px-1 mb-1.5 mt-4">
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
      className="flex items-center justify-between px-4 py-3.5 bg-canvas hover:bg-panel transition-colors"
    >
      <span className="flex items-center gap-3.5 min-w-0">
        <span className="w-9 h-9 rounded-control bg-panel flex items-center justify-center text-base flex-shrink-0">{icon}</span>
        <span className="font-semibold text-ink text-[13.5px] truncate">{label}</span>
      </span>
      <svg className="w-4 h-4 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default function MobileMenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const shouldRender = useDelayedUnmount(open, 220);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [babyEditing, setBabyEditing] = useState(false);
  const [babyName, setBabyName] = useState("");
  const [babyDate, setBabyDate] = useState("");
  const [babySaving, setBabySaving] = useState(false);
  const [babyError, setBabyError] = useState("");

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Load the baby-profile snippet once, the first time the sheet opens for a
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
    <div
      className={`md:hidden fixed inset-0 z-[600] flex items-end justify-center ${open ? "animate-fade-in" : "animate-fade-out"}`}
      style={{ backgroundColor: "rgba(20,20,18,0.5)" }}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[92vh] overflow-y-auto bg-panel rounded-t-2xl shadow-2xl pb-[calc(1rem+env(safe-area-inset-bottom))] ${open ? "animate-sheet-up" : "animate-sheet-down"}`}
      >
        {/* Grab handle + close */}
        <div className="sticky top-0 bg-panel flex items-center justify-between px-4 pt-3 pb-2 z-10">
          <div className="w-9" />
          <div className="w-10 h-1 rounded-full bg-line" aria-hidden />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-canvas transition-colors active:scale-90"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pb-2">
          {user ? (
            <>
              {/* Profile row */}
              <div className="rounded-card border border-line overflow-hidden bg-canvas">
                <Link href="/account" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-panel transition-colors">
                  <span className="flex items-center gap-3.5 min-w-0">
                    <span className="w-11 h-11 rounded-full flex items-center justify-center text-ink text-base font-extrabold flex-shrink-0 overflow-hidden bg-panel border border-line">
                      {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : user.name[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold text-ink truncate">{user.name}</span>
                      <span className="block text-[11px] text-ink-muted">{t("acct.editProfile")}</span>
                    </span>
                  </span>
                  <svg className="w-4 h-4 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* 👶 Baby profile row — expands into the inline editor */}
                <div className="border-t border-line">
                  {babyEditing ? (
                    <div className="px-4 py-3.5 space-y-2.5">
                      <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em]">👶 {t("acct.yourLittleOne")}</p>
                      <input
                        type="text"
                        value={babyName}
                        onChange={(e) => setBabyName(e.target.value)}
                        placeholder={t("acct.babyName")}
                        className="w-full h-10 px-3 rounded-control border border-line bg-canvas text-sm text-ink font-medium focus:border-ink outline-none"
                      />
                      <input
                        type="date"
                        value={babyDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setBabyDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-control border border-line bg-canvas text-sm text-ink font-medium focus:border-ink outline-none"
                      />
                      {babyError && <p className="text-danger text-[11px] font-semibold">{babyError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={saveBaby}
                          disabled={babySaving}
                          className="u-btn flex-1 h-9 rounded-control text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-ink disabled:opacity-60"
                        >
                          {babySaving ? t("auth.saving") : t("acct.saveChanges")}
                        </button>
                        <button
                          onClick={() => { setBabyEditing(false); setBabyName(profile?.babyName ?? ""); setBabyDate(profile?.babyBirthdate ?? ""); setBabyError(""); }}
                          className="h-9 px-4 rounded-control border border-line text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft"
                        >
                          {t("acct.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setBabyEditing(true)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-panel transition-colors text-left">
                      <span className="flex items-center gap-3.5 min-w-0">
                        <span className="w-9 h-9 rounded-full bg-panel flex items-center justify-center text-base flex-shrink-0">
                          {profile?.babyGender === "girl" ? "👧" : profile?.babyGender === "boy" ? "👦" : "🍼"}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-semibold text-ink truncate">
                            {profile?.babyName || t("acct.yourLittleOne")}
                          </span>
                          <span className="block text-[11px] text-ink-muted">
                            {babyMonths !== null ? ageLabel(babyMonths) : t("acct.addBabyInfo")}
                          </span>
                        </span>
                      </span>
                      <span className="text-[10px] font-bold text-accent uppercase tracking-[0.08em] flex-shrink-0">✎</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ── My Account — stacked rows ── */}
              <SectionLabel>{t("acct.title")}</SectionLabel>
              <div className="rounded-card border border-line overflow-hidden divide-y divide-line">
                {ACCOUNT_ROWS.map((r) => (
                  <MenuRow key={r.href} href={r.href} icon={r.icon} label={t(r.key)} onClose={onClose} />
                ))}
              </div>
            </>
          ) : (
            /* Guest: a proper sign-in row, not a lonely button in a void */
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-between px-4 py-4 rounded-card bg-ink text-white hover:bg-ink/90 transition-colors"
            >
              <span className="flex items-center gap-3.5">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="text-sm font-bold">{t("nav.signInRegister")}</span>
              </span>
              <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* ── Preferences — dark mode + language, shared with /account/settings ── */}
          <SectionLabel>{t("acct.preferences")}</SectionLabel>
          <div className="rounded-card border border-line overflow-hidden divide-y divide-line">
            <DarkModeRow />
            <LanguageRow />
          </div>

          {/* ── Help — guests get useful rows instead of an empty panel ── */}
          {!user && (
            <>
              <SectionLabel>{t("footer.help")}</SectionLabel>
              <div className="rounded-card border border-line overflow-hidden divide-y divide-line">
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
              className="w-full mt-4 flex items-center gap-3.5 px-4 py-3.5 rounded-card border border-line bg-canvas text-danger hover:bg-danger-soft transition-colors text-left"
            >
              <span className="w-9 h-9 rounded-control bg-danger-soft flex items-center justify-center text-base flex-shrink-0">↪</span>
              <span className="font-semibold text-[13.5px]">{t("acct.signOut")}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
