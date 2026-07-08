/**
 * i18n configuration (skeleton).
 *
 * Full translation of every page is a Phase 2 task (see CLAUDE.md). This file
 * establishes the locale list + defaults so the plumbing — LocaleContext, the
 * language switcher, `<html lang>` and the dictionaries — is already in place.
 *
 * The Georgian market primarily uses Georgian (ka), English (en) and Russian
 * (ru); tr/az are kept for the store owner's audience and fall back to en until
 * their dictionaries are filled in.
 */

// Georgia market: Georgian (ka) is the priority — reviewed by a native speaker.
// Russian & Turkish are DeepL-quality (DeepL does NOT support Georgian, hence
// the human review for ka). Azerbaijani was dropped (low value for GE customers).
export const LOCALES = ["en", "ka", "ru", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

// First-time visitors see Georgian — it's a Georgian store. The cookie
// (loov-locale) set by the language switcher/profile overrides this.
export const DEFAULT_LOCALE: Locale = "ka";

/** Locales that ship with a (partially) populated dictionary today. */
export const SEEDED_LOCALES: Locale[] = ["en", "ka", "ru"];

export const LOCALE_META: Record<Locale, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇬🇧" },
  ka: { label: "ქართული", flag: "🇬🇪" },
  ru: { label: "Русский", flag: "🇷🇺" },
  tr: { label: "Türkçe", flag: "🇹🇷" },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
