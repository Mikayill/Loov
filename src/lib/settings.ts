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
  /** Business WhatsApp number, digits only (e.g. "995599123456").
   *  Empty = WhatsApp buttons/links are hidden across the site. */
  whatsappNumber: string;
  /** Lifetime points needed to reach Silver. */
  loyaltySilverThreshold: number;
  /** Lifetime points needed to reach Gold. */
  loyaltyGoldThreshold: number;
  /** Earning multiplier at Silver (1.25 = +25% bonus points). */
  loyaltySilverMultiplier: number;
  /** Earning multiplier at Gold (1.5 = +50% bonus points). */
  loyaltyGoldMultiplier: number;
  /** Minimum estimated delivery days shown on product pages (standard delivery). */
  deliveryMinDays: number;
  /** Maximum estimated delivery days shown on product pages (standard delivery). */
  deliveryMaxDays: number;
  /** Highest share (%) of an order's subtotal a customer can pay for with
   *  Loov points, in whole 100-point/5₾ blocks. */
  loyaltyMaxRedeemPercent: number;
  /** Price of gift wrapping at checkout (₾). 0 = free. */
  giftWrapPrice: number;
  /** ₾ value of one 100-point redemption block (drives checkout + rewards). */
  loyaltyRedeemValue: number;
  /** Comma-separated product slugs shown in the homepage hero showcase,
   *  in order. Empty = automatic (first featured product). */
  heroSlugs: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  pointsPerGel: 1,
  freeShippingThreshold: 100,
  newBadgeDays: 30,
  standardShippingPrice: 15,
  expressEnabled: true,
  expressPrice: 25,
  whatsappNumber: "",
  loyaltySilverThreshold: 1000,
  loyaltyGoldThreshold: 3000,
  loyaltySilverMultiplier: 1.25,
  loyaltyGoldMultiplier: 1.5,
  deliveryMinDays: 2,
  deliveryMaxDays: 4,
  loyaltyMaxRedeemPercent: 20,
  giftWrapPrice: 5,
  loyaltyRedeemValue: 3,
  heroSlugs: "",
};

/** Map DB key → settings field. */
export const SETTING_KEYS: Record<string, keyof StoreSettings> = {
  points_per_gel: "pointsPerGel",
  free_shipping_threshold: "freeShippingThreshold",
  new_badge_days: "newBadgeDays",
  standard_shipping_price: "standardShippingPrice",
  express_enabled: "expressEnabled",
  express_price: "expressPrice",
  whatsapp_number: "whatsappNumber",
  loyalty_silver_threshold: "loyaltySilverThreshold",
  loyalty_gold_threshold: "loyaltyGoldThreshold",
  loyalty_silver_multiplier: "loyaltySilverMultiplier",
  loyalty_gold_multiplier: "loyaltyGoldMultiplier",
  delivery_min_days: "deliveryMinDays",
  delivery_max_days: "deliveryMaxDays",
  loyalty_max_redeem_percent: "loyaltyMaxRedeemPercent",
  gift_wrap_price: "giftWrapPrice",
  hero_slugs: "heroSlugs",
  loyalty_redeem_value: "loyaltyRedeemValue",
};

/** Reverse map: settings field → DB key. */
export const FIELD_TO_KEY: Record<keyof StoreSettings, string> = {
  pointsPerGel: "points_per_gel",
  freeShippingThreshold: "free_shipping_threshold",
  newBadgeDays: "new_badge_days",
  standardShippingPrice: "standard_shipping_price",
  expressEnabled: "express_enabled",
  expressPrice: "express_price",
  whatsappNumber: "whatsapp_number",
  loyaltySilverThreshold: "loyalty_silver_threshold",
  loyaltyGoldThreshold: "loyalty_gold_threshold",
  loyaltySilverMultiplier: "loyalty_silver_multiplier",
  loyaltyGoldMultiplier: "loyalty_gold_multiplier",
  deliveryMinDays: "delivery_min_days",
  deliveryMaxDays: "delivery_max_days",
  loyaltyMaxRedeemPercent: "loyalty_max_redeem_percent",
  giftWrapPrice: "gift_wrap_price",
  heroSlugs: "hero_slugs",
  loyaltyRedeemValue: "loyalty_redeem_value",
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
    if (field === "heroSlugs") {
      // String setting — comma-separated product slugs for the hero showcase.
      out.heroSlugs = String(value ?? "");
      continue;
    }
    if (field === "whatsappNumber") {
      // String setting — keep digits only so wa.me links always work.
      out.whatsappNumber = String(value ?? "").replace(/\D/g, "");
      continue;
    }
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) (out[field] as number) = n;
  }
  return out;
}
