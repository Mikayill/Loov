/**
 * Georgia (საქართველო) administrative + contact data for address forms.
 *
 * Regions ("mkhare" / მხარე) plus the self-governing city of Tbilisi.
 * Tbilisi is split into its raioni (districts) for finer delivery routing.
 * Phone numbers use the +995 country code (mobile: +995 5XX XXX XXX).
 */

export const PHONE_COUNTRY_CODE = "+995";
export const PHONE_PLACEHOLDER = "+995 5XX XXX XXX";
/** Basic Georgian mobile pattern: +995 followed by 9 digits (spaces allowed). */
export const PHONE_PATTERN = "\\+?995[\\s-]?5?[0-9\\s-]{7,12}";

/** Georgian postal codes are 4 digits (e.g. Tbilisi center 0102). */
export const POSTAL_CODE_PATTERN = "[0-9]{4}";
export const POSTAL_CODE_PLACEHOLDER = "0102";

export interface GeorgiaRegion {
  code: string;
  /** English label */
  en: string;
  /** Georgian label */
  ka: string;
}

/** The 9 regions + self-governing / autonomous units used for shipping. */
export const GEORGIA_REGIONS: GeorgiaRegion[] = [
  { code: "TB", en: "Tbilisi", ka: "თბილისი" },
  { code: "AJ", en: "Adjara", ka: "აჭარა" },
  { code: "GU", en: "Guria", ka: "გურია" },
  { code: "IM", en: "Imereti", ka: "იმერეთი" },
  { code: "KA", en: "Kakheti", ka: "კახეთი" },
  { code: "KK", en: "Kvemo Kartli", ka: "ქვემო ქართლი" },
  { code: "MM", en: "Mtskheta-Mtianeti", ka: "მცხეთა-მთიანეთი" },
  { code: "RL", en: "Racha-Lechkhumi & Kvemo Svaneti", ka: "რაჭა-ლეჩხუმი და ქვემო სვანეთი" },
  { code: "SJ", en: "Samtskhe-Javakheti", ka: "სამცხე-ჯავახეთი" },
  { code: "SZ", en: "Samegrelo-Zemo Svaneti", ka: "სამეგრელო-ზემო სვანეთი" },
  { code: "SK", en: "Shida Kartli", ka: "შიდა ქართლი" },
  { code: "AB", en: "Abkhazia", ka: "აფხაზეთი" },
];

/** Tbilisi districts (raioni) — shown when the region is Tbilisi. */
export const TBILISI_DISTRICTS: string[] = [
  "Vake",
  "Saburtalo",
  "Mtatsminda",
  "Krtsanisi",
  "Isani",
  "Samgori",
  "Chugureti",
  "Didube",
  "Nadzaladevi",
  "Gldani",
];
