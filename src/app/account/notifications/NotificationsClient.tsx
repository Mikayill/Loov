"use client";

/**
 * Notification preferences — persisted for real in profiles.notification_prefs
 * (FAZ 7; requires supabase/profile.sql).
 *
 * "Order Updates" is transactional (order/return status emails) and can't be
 * turned off — the toggle is locked ON. The marketing categories are stored
 * and will gate future promo emails; SMS is stored ready for the future SMS
 * integration.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { fetchMyProfile, updateMyProfile } from "@/lib/db/profile";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import Button from "@/components/ui/Button";

interface PrefMeta {
  id: string;
  icon: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  /** Locked ON — transactional, not optional. */
  alwaysOn?: boolean;
}

const PREFS: PrefMeta[] = [
  { id: "orders",   icon: "📦", labelKey: "notif.ordersLabel",   descKey: "notif.ordersDesc", alwaysOn: true },
  { id: "promo",    icon: "🎁", labelKey: "notif.promoLabel",    descKey: "notif.promoDesc" },
  { id: "arrivals", icon: "✨", labelKey: "notif.arrivalsLabel", descKey: "notif.arrivalsDesc" },
  { id: "tips",     icon: "🌿", labelKey: "notif.tipsLabel",     descKey: "notif.tipsDesc" },
  { id: "sms",      icon: "📱", labelKey: "notif.smsLabel",      descKey: "notif.smsDesc" },
  { id: "wishlist", icon: "❤️", labelKey: "notif.wishlistLabel", descKey: "notif.wishlistDesc" },
];

const DEFAULTS: Record<string, boolean> = {
  orders: true, promo: true, arrivals: true, tips: false, sms: false, wishlist: true,
};

function Toggle({ enabled, disabled, onClick, label }: {
  enabled: boolean; disabled?: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        enabled ? "" : "bg-line"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={enabled ? { backgroundColor: "#5E9E8C" } : {}}
      aria-label={`Toggle ${label}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function NotificationsClient() {
  const router = useRouter();
  const { t } = useLocale();
  const { user, loading } = useAuth();

  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULTS);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  /* Load saved preferences (merge over defaults; orders is always forced on). */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyProfile().then(({ profile }) => {
      if (cancelled) return;
      setPrefs({ ...DEFAULTS, ...(profile?.notificationPrefs ?? {}), orders: true });
      setFetching(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  if (loading || !user || fetching) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  function toggle(id: string) {
    if (PREFS.find((p) => p.id === id)?.alwaysOn) return;
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const res = await updateMyProfile({ notificationPrefs: { ...prefs, orders: true } });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const enabledCount = PREFS.filter((p) => prefs[p.id]).length;

  const renderRow = (pref: PrefMeta) => (
    <div key={pref.id} className="flex items-center justify-between p-5 gap-4">
      <div className="flex items-center gap-3">
        <span className="text-xl w-8 text-center">{pref.icon}</span>
        <div>
          <p className="font-bold text-ink text-sm flex items-center gap-2">
            {t(pref.labelKey)}
            {pref.alwaysOn && (
              <span className="text-[9px] font-extrabold text-accent bg-accent-soft px-2 py-0.5 rounded-full uppercase tracking-wide">
                {t("notif.alwaysOn")}
              </span>
            )}
          </p>
          <p className="text-xs text-ink-muted mt-0.5">
            {pref.alwaysOn
              ? t("notif.transactionalNote")
              : t(pref.descKey)}
          </p>
        </div>
      </div>
      <Toggle
        enabled={!!prefs[pref.id]}
        disabled={pref.alwaysOn}
        onClick={() => toggle(pref.id)}
        label={t(pref.labelKey)}
      />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-accent transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("notif.breadcrumb")}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{t("notif.title")}</h1>
          <p className="text-ink-muted text-sm mt-0.5">{t("notif.enabledOf").replace("{n}", String(enabledCount)).replace("{total}", String(PREFS.length))}</p>
        </div>
        <Link href="/account" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("notif.backToAccount")}
        </Link>
      </div>

      {saved && (
        <div className="mb-5 p-3 bg-accent-soft border border-sage rounded-control flex items-center gap-2 text-sm font-semibold text-accent-deep">
          <span>✓</span>
          <span>{t("notif.saved")}</span>
        </div>
      )}
      {error && (
        <div className="mb-5 p-3 bg-[#FBF0F0] border border-[#E8C4C4] rounded-control text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {/* Email section */}
      <div className="mb-2">
        <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest px-1 mb-3">
          {t("notif.emailSection")}
        </p>
        <div className="bg-white rounded-card border border-line divide-y divide-canvas">
          {PREFS.filter((p) => p.id !== "sms").map(renderRow)}
        </div>
      </div>

      {/* SMS section */}
      <div className="mt-5 mb-8">
        <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest px-1 mb-3">
          {t("notif.smsSection")}
        </p>
        <div className="bg-white rounded-card border border-line">
          {PREFS.filter((p) => p.id === "sms").map(renderRow)}
        </div>
      </div>

      <Button
        onClick={handleSave}
        loading={saving}
        loadingText={t("auth.saving")}
        fullWidth
        className="!rounded-card !h-auto py-3.5"
      >
        {t("notif.savePreferences")} →
      </Button>

      <p className="text-center text-xs text-ink-muted mt-3">
        {t("notif.privacyNote")}
      </p>
    </div>
  );
}
