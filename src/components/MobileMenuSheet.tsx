"use client";

/**
 * Mobile hamburger menu — a real bottom-sheet overlay (portal, role=dialog,
 * shared scroll lock, Escape/backdrop close), replacing the old panel that
 * just dropped down inline below the navbar and pushed page content around.
 * Also surfaces a compact "baby profile" quick-edit (name + birth date) —
 * previously this was only reachable by opening the full /account edit form.
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
import LanguageSwitcher from "./LanguageSwitcher";

const accountLinks: { href: string; key: TranslationKey; icon: string }[] = [
  { href: "/account/orders",        key: "acct.myOrders",      icon: "📦" },
  { href: "/account/returns",       key: "acct.myReturns",     icon: "↩️" },
  { href: "/account/rewards",       key: "acct.rewards",       icon: "⭐" },
  { href: "/account/reviews",       key: "acct.myReviews",     icon: "📝" },
  { href: "/account/notifications", key: "acct.notifications", icon: "🔔" },
  { href: "/account/settings",      key: "acct.settings",      icon: "⚙️" },
];

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
     signed-in shopper — not on every open (avoids refetching on each tap). */
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
        className={`w-full max-w-lg max-h-[86vh] overflow-y-auto bg-canvas rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)] ${open ? "animate-sheet-up" : "animate-sheet-down"}`}
      >
        {/* Grab handle + close */}
        <div className="sticky top-0 bg-canvas flex items-center justify-between px-4 pt-3 pb-2 border-b border-line z-10">
          <div className="w-9" />
          <div className="w-10 h-1 rounded-full bg-line" aria-hidden />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-panel transition-colors active:scale-90"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {user ? (
            <>
              <Link href="/account" onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-control bg-panel">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-ink text-sm font-extrabold flex-shrink-0 overflow-hidden bg-canvas border border-line">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : user.name[0]?.toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink truncate">{user.name}</span>
                  <span className="block text-[11px] text-ink-muted">{t("acct.editProfile")} →</span>
                </span>
              </Link>

              {/* Baby profile quick-edit — the whole point of this redesign:
                  no more diving into the full /account edit form just to set
                  a name/birthdate. */}
              <div className="rounded-control border border-line p-3.5">
                {babyEditing ? (
                  <div className="space-y-2.5">
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
                  <button onClick={() => setBabyEditing(true)} className="w-full flex items-center gap-3 text-left">
                    <span className="w-9 h-9 rounded-full bg-panel flex items-center justify-center text-base flex-shrink-0">
                      {profile?.babyGender === "girl" ? "👧" : profile?.babyGender === "boy" ? "👦" : "🍼"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink truncate">
                        {profile?.babyName || t("acct.yourLittleOne")}
                      </span>
                      <span className="block text-[11px] text-ink-muted">
                        {babyMonths !== null ? ageLabel(babyMonths) : t("acct.addBabyInfo")}
                      </span>
                    </span>
                    <span className="text-[10px] font-semibold text-accent uppercase tracking-[0.08em] flex-shrink-0">{t("acct.editProfile")}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {accountLinks.map((l) => (
                  <Link key={l.href} href={l.href} onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-control text-[13px] font-semibold text-ink-soft hover:bg-panel hover:text-ink transition-colors">
                    <span aria-hidden>{l.icon}</span> {t(l.key)}
                  </Link>
                ))}
              </div>

              <button
                onClick={() => { onClose(); signOut(); }}
                className="w-full text-left px-3 py-2.5 rounded-control text-[13px] font-semibold text-danger hover:bg-danger-soft transition-colors"
              >
                {t("acct.signOut")}
              </button>
            </>
          ) : (
            <Link href="/login" onClick={onClose}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-control text-sm font-semibold text-white bg-ink">
              {t("nav.signInRegister")}
            </Link>
          )}

          <div className="pt-3 border-t border-line">
            <p className="text-[10px] text-ink-muted font-bold uppercase tracking-widest px-1 mb-2">{t("nav.language")}</p>
            <div className="px-1"><LanguageSwitcher /></div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
