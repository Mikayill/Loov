/**
 * Translation dictionaries — re-export hub.
 *
 * The actual dictionaries live in ./locales/{en,ka,ru,tr}.ts (split so the
 * files stay reviewable as the key set grows). `en` is the source of truth
 * and defines TranslationKey; ka/ru/tr are typed as FULL Dictionaries, so a
 * missing translation fails the build. Runtime still falls back key → en →
 * raw key (defence in depth) via t() in LocaleContext / getT().
 */

import type { Locale } from "./config";
import { en } from "./locales/en";
import { ka } from "./locales/ka";
import { ru } from "./locales/ru";
import { tr } from "./locales/tr";
import type { Dictionary } from "./locales/en";

export { en, ka, ru, tr };
export type { TranslationKey, Dictionary } from "./locales/en";

export const dictionaries: Record<Locale, Partial<Dictionary>> = {
  en,
  ka,
  ru,
  tr,
};
