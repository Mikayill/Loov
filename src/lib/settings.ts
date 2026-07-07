/**
 * Store-wide settings — shared types + defaults.
 *
 * Values live in the `settings` table (key/value jsonb, public read) and are
 * editable from /admin/settings. If the table/keys are missing, the defaults
 * below keep the site fully working.
 */

export interface StoreSettings {
  /** Loyalty points earned per 1 ₾ spent. */
  pointsPerGel: number;
  /** Order subtotal (₾) at which STANDARD shipping becomes free. */
  freeShippingThreshold: number;
  /** A product shows the "New" badge for this many days after creation. */
  newBadgeDays: number;
  /** Price of standard delivery below the free-shipping threshold (₾). */
  standardShippingPrice: number;
  /** Whether Express Delivery is offered at checkout at all. */
  expressEnabled: boolean;
  /** Price of express delivery (₾). Express is always charged — the
   *  free-shipping threshold only applies to standard delivery. */
  expressPrice: number;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  pointsPerGel: 2,
  freeShippingThreshold: 100,
  newBadgeDays: 30,
  standardShippingPrice: 15,
  expressEnabled: true,
  expressPrice: 25,
};

/** Map DB key → settings field. */
export const SETTING_KEYS: Record<string, keyof StoreSettings> = {
  points_per_gel: "pointsPerGel",
  free_shipping_threshold: "freeShippingThreshold",
  new_badge_days: "newBadgeDays",
  standard_shipping_price: "standardShippingPrice",
  express_enabled: "expressEnabled",
  express_price: "expressPrice",
};

/** Reverse map: settings field → DB key. */
export const FIELD_TO_KEY: Record<keyof StoreSettings, string> = {
  pointsPerGel: "points_per_gel",
  freeShippingThreshold: "free_shipping_threshold",
  newBadgeDays: "new_badge_days",
  standardShippingPrice: "standard_shipping_price",
  expressEnabled: "express_enabled",
  expressPrice: "express_price",
};

/** Build a StoreSettings from raw {key: value} DB rows, filling gaps with defaults. */
export function settingsFromRows(rows: { key: string; value: unknown }[]): StoreSettings {
  const out: StoreSettings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    const field = SETTING_KEYS[key];
    if (!field) continue;
    if (field === "expressEnabled") {
      // Boolean setting — accept true/false, 1/0 and their string forms.
      out.expressEnabled =
        value === true || value === 1 || value === "true" || value === "1";
      continue;
    }
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) (out[field] as number) = n;
  }
  return out;
}
