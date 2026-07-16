"use client";

import { useEffect } from "react";
import GhostRows from "@/components/GhostRows";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/components/ThemeToggle";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";

export default function SettingsClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const [theme, setTheme] = useTheme();

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

      <div className="space-y-5">
        {/* Appearance */}
        <div className="bg-canvas rounded-card border border-line p-5 sm:p-6">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.14em] mb-1">{t("acct.appearance")}</p>
          <p className="text-[12.5px] text-ink-muted mb-4 leading-snug">{t("acct.appearanceSub")}</p>
          <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-control overflow-hidden">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`py-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors flex items-center justify-center gap-1.5 ${
                theme === "light" ? "bg-ink text-white" : "bg-canvas text-ink-soft hover:bg-panel"
              }`}
            >
              ☀ {t("theme.light")}
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`py-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors flex items-center justify-center gap-1.5 ${
                theme === "dark" ? "bg-ink text-white" : "bg-canvas text-ink-soft hover:bg-panel"
              }`}
            >
              ☾ {t("theme.dark")}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="bg-canvas rounded-card border border-line p-5 sm:p-6">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.14em] mb-1">{t("acct.siteLanguage")}</p>
          <p className="text-[12.5px] text-ink-muted mb-4 leading-snug">{t("acct.settingsSub")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LOCALES.map((l) => {
              const meta = LOCALE_META[l];
              const selected = locale === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-control border-2 text-[12.5px] font-semibold transition-all ${
                    selected ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft hover:border-ink-muted"
                  }`}
                >
                  {meta.flag} {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick links to the other account/security screens */}
        <div className="bg-canvas rounded-card border border-line overflow-hidden divide-y divide-line">
          {[
            { icon: "🔔", label: t("acct.notifications"), href: "/account/notifications" },
            { icon: "🔒", label: t("acct.security"), href: "/account/security" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between px-5 py-4 hover:bg-panel transition-colors group">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-control bg-panel group-hover:bg-canvas flex items-center justify-center text-sm flex-shrink-0 transition-colors">{item.icon}</span>
                <p className="font-semibold text-ink text-[13.5px]">{item.label}</p>
              </div>
              <svg className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
