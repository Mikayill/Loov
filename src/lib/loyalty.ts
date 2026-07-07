/**
 * Loov Rewards — loyalty program rules (single source of truth).
 *
 * Earning:   2 points per 1 ₾ spent (order total, after discounts).
 *            Tier multipliers boost earning: Silver ×1.25, Gold ×1.5.
 * Redeeming: 100 points = 5 ₾ off, in blocks of 100, at checkout.
 *            A single order can be discounted by at most 30% of its subtotal.
 * Tiers:     lifetime-earned points decide the tier (never goes down).
 */

export const POINTS_PER_GEL = 2;
export const REDEEM_BLOCK = 100;      // points per redemption block
export const GEL_PER_BLOCK = 5;       // ₾ discount per block
export const MAX_DISCOUNT_RATIO = 0.3; // max share of subtotal payable with points

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
    perks: ["2 points per 1 ₾", "Birthday surprise"],
  },
  {
    id: "silver",
    name: "Silver",
    emoji: "🌿",
    threshold: 1000,
    multiplier: 1.25,
    perks: ["+25% bonus points", "Early access to new arrivals", "Birthday surprise"],
  },
  {
    id: "gold",
    name: "Gold",
    emoji: "🌳",
    threshold: 3000,
    multiplier: 1.5,
    perks: [
      "+50% bonus points",
      "Free express shipping",
      "Early access to new arrivals",
      "Birthday surprise",
    ],
  },
];

/** The tier for a given lifetime-earned points total. */
export function tierFor(lifetimeEarned: number): LoyaltyTier {
  let tier = TIERS[0];
  for (const t of TIERS) if (lifetimeEarned >= t.threshold) tier = t;
  return tier;
}

/** The next tier above, or null when already Gold. */
export function nextTierAfter(lifetimeEarned: number): LoyaltyTier | null {
  return TIERS.find((t) => t.threshold > lifetimeEarned) ?? null;
}

/** Points earned for an amount in ₾ at a given tier (defaults to base rate). */
export function pointsForAmount(amountGel: number, tier?: LoyaltyTier): number {
  const mult = tier?.multiplier ?? 1;
  return Math.max(0, Math.floor(amountGel * POINTS_PER_GEL * mult));
}

/**
 * Like pointsForAmount but with a configurable per-₾ rate (the admin-set
 * `pointsPerGel` from store settings). Tier multipliers still apply on top.
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
 * limited by their balance (whole blocks) and by MAX_DISCOUNT_RATIO of subtotal.
 */
export function maxRedeemablePoints(balance: number, subtotalGel: number): number {
  const byBalance = Math.floor(balance / REDEEM_BLOCK);
  const byOrder = Math.floor((subtotalGel * MAX_DISCOUNT_RATIO) / GEL_PER_BLOCK);
  return Math.max(0, Math.min(byBalance, byOrder)) * REDEEM_BLOCK;
}
