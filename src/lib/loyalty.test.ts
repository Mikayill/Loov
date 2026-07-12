import { describe, it, expect } from "vitest";
import {
  pointsForAmountAt,
  discountForPoints,
  maxRedeemablePoints,
  tierForAt,
  tiersFor,
  MAX_DISCOUNT_RATIO,
} from "@/lib/loyalty";

describe("earning", () => {
  it("pointsForAmountAt uses the given rate at base tier, floored", () => {
    expect(pointsForAmountAt(10, 2)).toBe(20);
    expect(pointsForAmountAt(10.7, 2)).toBe(21); // floor(21.4)
  });
  it("pointsForAmountAt honors admin rate + tier multiplier", () => {
    const gold = tiersFor().find((t) => t.id === "gold")!;
    expect(pointsForAmountAt(100, 3)).toBe(300);
    expect(pointsForAmountAt(100, 2, gold)).toBe(300); // 100*2*1.5
  });
  it("falls back to default rate on a bad value", () => {
    expect(pointsForAmountAt(10, NaN)).toBe(20);
  });
});

describe("perk lines", () => {
  it("every perk is generated from settings — no stale promises", () => {
    const tiers = tiersFor({ pointsPerGel: 3, silverMultiplier: 1.3, goldMultiplier: 1.75 });
    expect(tiers[0].perks).toEqual(["3 points per 1 ₾"]);
    expect(tiers[1].perks).toEqual(["+30% bonus points"]);
    expect(tiers[2].perks).toEqual(["+75% bonus points"]);
    // the removed false promises never come back
    const all = tiers.flatMap((t) => t.perks).join(" ");
    expect(all).not.toMatch(/express|birthday|early access/i);
  });
});

describe("redeeming", () => {
  it("100 points = 5₾, whole blocks only", () => {
    expect(discountForPoints(100)).toBe(5);
    expect(discountForPoints(250)).toBe(10); // 2 whole blocks
    expect(discountForPoints(90)).toBe(0);
  });
  it("maxRedeemablePoints is limited by balance AND %-of-subtotal", () => {
    // 200₾ order, 20% cap → 40₾ → 800 points; balance 500 → capped to 500 (whole blocks)
    expect(maxRedeemablePoints(500, 200, 0.2)).toBe(500);
    // small order dominates: 50₾ * 20% = 10₾ → 200 points even with big balance
    expect(maxRedeemablePoints(10000, 50, 0.2)).toBe(200);
    // default ratio constant applied when omitted
    expect(maxRedeemablePoints(10000, 100)).toBe(Math.floor((100 * MAX_DISCOUNT_RATIO) / 5) * 100);
  });
  it("never returns negative", () => {
    expect(maxRedeemablePoints(0, 0, 0.2)).toBe(0);
  });
});

describe("tiers", () => {
  it("tierForAt picks the highest reached and never regresses", () => {
    const tiers = tiersFor();
    expect(tierForAt(0, tiers).id).toBe("bronze");
    expect(tierForAt(1000, tiers).id).toBe("silver");
    expect(tierForAt(5000, tiers).id).toBe("gold");
  });
  it("admin thresholds/multipliers flow through", () => {
    const tiers = tiersFor({ silverThreshold: 500, goldThreshold: 2000, silverMultiplier: 1.5, goldMultiplier: 2 });
    expect(tierForAt(500, tiers).id).toBe("silver");
    expect(tierForAt(600, tiers).multiplier).toBe(1.5);
    // gold threshold can't drop below silver
    const clamped = tiersFor({ silverThreshold: 1000, goldThreshold: 200 });
    expect(clamped.find((t) => t.id === "gold")!.threshold).toBeGreaterThanOrEqual(1000);
  });
});
