/**
 * Loov Rewards — loyalty program rules (single source of truth).
 *
 * Earning:   points per 1 ₾ spent on merchandise (after discounts; shipping
 *            and gift wrap never earn). Rate + tier multipliers are
 *            admin-tunable in /admin/settings (defaults: 2/₾, ×1.25, ×1.5).
 * Redeeming: 100 points = 5 ₾ off, in blocks of 100, at checkout. A single
 *            order can be discounted by at most the admin-set
 *            `loyaltyMaxRedeemPercent` of its subtotal (default 20%).
 * Tiers:     lifetime-earned points decide the tier (never goes down).
 *
 * Perks are ONLY the earning rate/bonus — never promise anything here that
 * checkout doesn't actually implement (no "free express", no "birthday
 * surprise": both were removed 12 Jul 2026 as false promises).
 */

export const POINTS_PER_GEL = 2;
export const REDEEM_BLOCK = 100;      // points per redemption block
export const GEL_PER_BLOCK = 5;       // ₾ discount per block
/** Fallback max share of subtotal payable with points, used only when store
 *  settings are unavailable — normally overridden by the admin-tunable
 *  `loyaltyMaxRedeemPercent` setting (see src/lib/settings.ts). */
export const MAX_DISCOUNT_RATIO = 0.2;

export interface LoyaltyTier {
  id: "bronze" | "silver" | "gold";
  name: string;
  emoji: string;
  /** Lifetime points needed to reach this tier. */
  threshold: number;
  /** Earning multiplier applied on top of POINTS_PER_GEL. */
  multiplier: number;
  perks: string[];
}

export const TIERS: LoyaltyTier[] = [
  {
    id: "bronze",
    name: "Bronze",
    emoji: "🌱",
    threshold: 0,
    multiplier: 1,
    perks: ["2 points per 1 ₾"],
  },
  {
    id: "silver",
    name: "Silver",
    emoji: "🌿",
    threshold: 1000,
    multiplier: 1.25,
    perks: ["+25% bonus points"],
  },
  {
    id: "gold",
    name: "Gold",
    emoji: "🌳",
    threshold: 3000,
    multiplier: 1.5,
    perks: ["+50% bonus points"],
  },
];

/** Admin-tunable tier knobs (rate, thresholds, multipliers) — from store settings. */
export interface TierConfig {
  silverThreshold: number;
  goldThreshold: number;
  silverMultiplier: number;
  goldMultiplier: number;
  /** Base earning rate (points per 1 ₾) — drives the Bronze perk line. */
  pointsPerGel: number;
}

/**
 * Build the tier ladder from admin settings. EVERY perk line is generated
 * from the actual setting so none can go stale: Bronze shows the real
 * per-₾ rate, Silver/Gold show the real bonus percentage.
 */
export function tiersFor(cfg?: Partial<TierConfig>): LoyaltyTier[] {
  const silverThreshold = cfg?.silverThreshold ?? 1000;
  const goldThreshold = Math.max(cfg?.goldThreshold ?? 3000, silverThreshold);
  const silverMult = cfg?.silverMultiplier ?? 1.25;
  const goldMult = cfg?.goldMultiplier ?? 1.5;
  const rate = cfg?.pointsPerGel ?? POINTS_PER_GEL;
  const bonus = (m: number) => `+${Math.round((m - 1) * 100)}% bonus points`;
  return [
    { ...TIERS[0], perks: [`${rate} points per 1 ₾`] },
    {
      ...TIERS[1],
      threshold: silverThreshold,
      multiplier: silverMult,
      perks: [bonus(silverMult)],
    },
    {
      ...TIERS[2],
      threshold: goldThreshold,
      multiplier: goldMult,
      perks: [bonus(goldMult)],
    },
  ];
}

/** Convenience: build the ladder straight from store settings. */
export function tiersFromSettings(s: {
  loyaltySilverThreshold: number;
  loyaltyGoldThreshold: number;
  loyaltySilverMultiplier: number;
  loyaltyGoldMultiplier: number;
  pointsPerGel?: number;
}): LoyaltyTier[] {
  return tiersFor({
    silverThreshold: s.loyaltySilverThreshold,
    goldThreshold: s.loyaltyGoldThreshold,
    silverMultiplier: s.loyaltySilverMultiplier,
    goldMultiplier: s.loyaltyGoldMultiplier,
    pointsPerGel: s.pointsPerGel,
  });
}

/** The tier for a lifetime-earned total within a given ladder. */
export function tierForAt(lifetimeEarned: number, tiers: LoyaltyTier[]): LoyaltyTier {
  let tier = tiers[0];
  for (const t of tiers) if (lifetimeEarned >= t.threshold) tier = t;
  return tier;
}

/** The next tier above within a given ladder, or null when already at the top. */
export function nextTierAfterAt(lifetimeEarned: number, tiers: LoyaltyTier[]): LoyaltyTier | null {
  return tiers.find((t) => t.threshold > lifetimeEarned) ?? null;
}

/**
 * Points earned for an amount in ₾ at a configurable per-₾ rate (the
 * admin-set `pointsPerGel` from store settings). Tier multipliers apply on top.
 */
export function pointsForAmountAt(
  amountGel: number,
  pointsPerGel: number,
  tier?: LoyaltyTier
): number {
  const rate = Number.isFinite(pointsPerGel) && pointsPerGel >= 0 ? pointsPerGel : POINTS_PER_GEL;
  const mult = tier?.multiplier ?? 1;
  return Math.max(0, Math.floor(amountGel * rate * mult));
}

/** ₾ discount for a number of points (whole blocks only). */
export function discountForPoints(points: number): number {
  return Math.floor(points / REDEEM_BLOCK) * GEL_PER_BLOCK;
}

/**
 * The most points a shopper can redeem on an order:
 * limited by their balance (whole blocks) and by maxRatio of subtotal
 * (defaults to MAX_DISCOUNT_RATIO — pass the admin-set
 * `loyaltyMaxRedeemPercent / 100` from store settings instead).
 */
export function maxRedeemablePoints(balance: number, subtotalGel: number, maxRatio: number = MAX_DISCOUNT_RATIO): number {
  const byBalance = Math.floor(balance / REDEEM_BLOCK);
  const byOrder = Math.floor((subtotalGel * maxRatio) / GEL_PER_BLOCK);
  return Math.max(0, Math.min(byBalance, byOrder)) * REDEEM_BLOCK;
}
