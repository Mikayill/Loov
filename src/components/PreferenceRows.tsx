"use client";

/**
 * Shared preference rows — dark mode + language, rendered as stacked
 * app-settings rows. Used by BOTH the mobile menu sheet and the
 * /account/settings page so the two can never drift apart in design
 * or behavior (they manage the same cookie-backed preferences).
 */

import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/components/ThemeToggle";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";

/** 🌙 Dark Mode — one row, inline switch. */
export function DarkModeRow() {
  const { t } = useLocale();
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="w-full flex items-center justify-between px-4 py-3.5 bg-canvas hover:bg-panel transition-colors text-left"
    >
      <span className="flex items-center gap-3.5 min-w-0">
        <span className="w-9 h-9 rounded-control bg-panel flex items-center justify-center text-base flex-shrink-0">
          {dark ? "🌙" : "☀️"}
        </span>
        <span className="font-semibold text-ink text-[13.5px]">{t("pref.darkMode")}</span>
      </span>
      {/* Switch */}
      <span
        aria-hidden
        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${dark ? "bg-accent" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-[left] duration-200 ${dark ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

/** 🌐 Language — one row, inline EN/KA/RU/TR chips (one tap, no dropdown). */
export function LanguageRow() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-canvas">
      <span className="flex items-center gap-3.5 min-w-0">
        <span className="w-9 h-9 rounded-control bg-panel flex items-center justify-center text-base flex-shrink-0">🌐</span>
        <span className="font-semibold text-ink text-[13.5px]">{t("nav.language")}</span>
      </span>
      <div className="flex gap-1 flex-shrink-0">
        {LOCALES.map((code) => {
          const selected = locale === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              aria-pressed={selected}
              title={LOCALE_META[code].label}
              className={`h-8 min-w-[38px] px-1.5 rounded-control text-[11px] font-extrabold uppercase tracking-wide border transition-colors ${
                selected
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink-muted hover:border-ink-muted hover:text-ink"
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
