/**
 * Locale-aware date formatting — the one place date locales are decided.
 * Replaces the hardcoded "en-GB"/"en-US" toLocaleDateString calls so dates
 * follow the visitor's language (ka/ru/tr are valid BCP-47 tags as-is).
 */

import type { Locale } from "./config";

const BCP47: Record<Locale, string> = { en: "en-GB", ka: "ka", ru: "ru", tr: "tr" };

/** "12 Jun 2026" (short) · "12 June 2026" (long). Falls back to the raw string. */
export function fmtDate(
  iso: string | Date,
  locale: Locale,
  style: "short" | "long" = "short"
): string {
  try {
    return new Date(iso).toLocaleDateString(BCP47[locale] ?? "en-GB", {
      day: "numeric",
      month: style === "long" ? "long" : "short",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

/** "12 Jun" — for delivery estimates and other near-future dates. */
export function fmtDateNoYear(iso: string | Date, locale: Locale): string {
  try {
    return new Date(iso).toLocaleDateString(BCP47[locale] ?? "en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return String(iso);
  }
}
