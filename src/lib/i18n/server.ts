/**
 * Server-side translation (for Server Components & Route Handlers).
 *
 * The locale lives in a cookie so BOTH the server and the client agree on it
 * (client mirror is in LocaleContext). Server Components can't read React
 * context, so they call `getT()` which reads the cookie via next/headers.
 */

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { dictionaries, en, type TranslationKey } from "./dictionaries";

export const LOCALE_COOKIE = "loov-locale";

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Returns `{ t, locale }` for the current request's cookie locale. */
export async function getT(): Promise<{
  t: (key: TranslationKey) => string;
  locale: Locale;
}> {
  const locale = await getServerLocale();
  const t = (key: TranslationKey) => dictionaries[locale][key] ?? en[key] ?? key;
  return { t, locale };
}
