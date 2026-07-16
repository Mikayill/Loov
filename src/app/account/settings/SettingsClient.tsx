"use client";

/**
 * /account/settings — one clean, app-style settings list. The Dark Mode and
 * Language rows are the exact same components the mobile hamburger menu uses
 * (PreferenceRows.tsx), so the two surfaces always look and behave the same.
 */

import { useEffect } from "react";
import GhostRows from "@/components/GhostRows";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { DarkModeRow, LanguageRow } from "@/components/PreferenceRows";

export default function SettingsClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLocale();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return <GhostRows variant="generic" rows={2} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-accent transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("acct.settings")}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{t("acct.settings")}</h1>
          <p className="text-ink-muted text-sm mt-0.5">{t("acct.settingsSub")}</p>
        </div>
        <Link href="/account" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("acct.title")}
        </Link>
      </div>

      {/* One stacked settings list — preferences first, then the two
          account-management screens that belong under "settings". */}
      <div className="rounded-card border border-line overflow-hidden divide-y divide-line">
        <DarkModeRow />
        <LanguageRow />
        {[
          { icon: "🔔", label: t("acct.notifications"), href: "/account/notifications" },
          { icon: "🔒", label: t("acct.security"), href: "/account/security" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 py-3.5 bg-canvas hover:bg-panel transition-colors">
            <span className="flex items-center gap-3.5 min-w-0">
              <span className="w-9 h-9 rounded-control bg-panel flex items-center justify-center text-base flex-shrink-0">{item.icon}</span>
              <span className="font-semibold text-ink text-[13.5px]">{item.label}</span>
            </span>
            <svg className="w-4 h-4 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
