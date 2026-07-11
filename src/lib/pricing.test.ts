import { describe, it, expect } from "vitest";
import {
  discountPercent,
  isDiscounted,
  basePriceForSize,
  effectivePrice,
  savingsAmount,
  minEffectivePrice,
  isNewArrival,
} from "@/lib/pricing";

const p = (over: Partial<Parameters<typeof effectivePrice>[0]> = {}) => ({
  price: 100,
  discountPercent: 0,
  sizePrices: null,
  ...over,
});

describe("discountPercent", () => {
  it("clamps to [0,90] and rounds", () => {
    expect(discountPercent({ discountPercent: 0 })).toBe(0);
    expect(discountPercent({ discountPercent: -5 })).toBe(0);
    expect(discountPercent({ discountPercent: 20.4 })).toBe(20);
    expect(discountPercent({ discountPercent: 200 })).toBe(90);
    expect(discountPercent({ discountPercent: undefined })).toBe(0);
  });
  it("isDiscounted reflects it", () => {
    expect(isDiscounted({ discountPercent: 0 })).toBe(false);
    expect(isDiscounted({ discountPercent: 10 })).toBe(true);
  });
});

describe("basePriceForSize", () => {
  it("uses size price when set, else base", () => {
    expect(basePriceForSize(p({ sizePrices: { "0-3m": 120 } }), "0-3m")).toBe(120);
    expect(basePriceForSize(p({ sizePrices: { "0-3m": 120 } }), "6-9m")).toBe(100);
    expect(basePriceForSize(p(), undefined)).toBe(100);
    // Zero / invalid size price falls back to base.
    expect(basePriceForSize(p({ sizePrices: { x: 0 } }), "x")).toBe(100);
  });
});

describe("effectivePrice", () => {
  it("applies discount, rounded to cents", () => {
    expect(effectivePrice(p({ discountPercent: 20 }))).toBe(80);
    expect(effectivePrice(p({ price: 23, discountPercent: 20 }))).toBe(18.4);
    expect(effectivePrice(p())).toBe(100);
  });
  it("respects per-size price + discount together", () => {
    expect(effectivePrice(p({ discountPercent: 50, sizePrices: { L: 40 } }), "L")).toBe(20);
  });
});

describe("savingsAmount", () => {
  it("is base minus effective", () => {
    expect(savingsAmount(p({ price: 23, discountPercent: 20 }))).toBe(4.6);
    expect(savingsAmount(p())).toBe(0);
  });
});

describe("minEffectivePrice", () => {
  it("is the cheapest discounted variant", () => {
    expect(minEffectivePrice(p({ price: 100, sizePrices: { s: 60, l: 140 }, discountPercent: 10 }))).toBe(54);
  });
});

describe("isNewArrival", () => {
  it("honors a manual pin", () => {
    expect(isNewArrival({ isNew: true, createdAt: "2000-01-01" }, 30)).toBe(true);
  });
  it("uses the day window otherwise", () => {
    const today = new Date().toISOString();
    const old = new Date(Date.now() - 60 * 86_400_000).toISOString();
    expect(isNewArrival({ isNew: false, createdAt: today }, 30)).toBe(true);
    expect(isNewArrival({ isNew: false, createdAt: old }, 30)).toBe(false);
    expect(isNewArrival({ isNew: false, createdAt: today }, 0)).toBe(false);
    expect(isNewArrival({ isNew: false, createdAt: undefined }, 30)).toBe(false);
  });
});
