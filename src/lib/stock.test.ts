import { describe, it, expect } from "vitest";
import { variantStock, hasAnyStock } from "@/lib/stock";
import type { Product } from "@/types";

const base = (over: Partial<Product> = {}): Product => ({
  id: "1",
  slug: "x",
  name: "X",
  category: "body",
  price: 10,
  colors: ["White", "Black"],
  sizes: ["0-3 Months", "3-6 Months"],
  emoji: "🍼",
  cardColor: "#fff",
  ...over,
} as Product);

describe("variantStock", () => {
  it("prefers the per-variant count", () => {
    const p = base({ stock: 0, stockByVariant: { "0-3 Months": { White: 4 } } });
    expect(variantStock(p, "0-3 Months", "White")).toBe(4);
  });
  it("falls back to flat stock when the combo isn't tracked", () => {
    const p = base({ stock: 7, stockByVariant: { "0-3 Months": { White: 4 } } });
    expect(variantStock(p, "3-6 Months", "Black")).toBe(7);
  });
  it("null flat stock means untracked/unlimited", () => {
    expect(variantStock(base({ stock: undefined }), "0-3 Months", "White")).toBeNull();
  });
});

describe("hasAnyStock", () => {
  it("true if ANY variant has units, even when flat stock is 0", () => {
    // the exact bug: flat 0 but every variant has 1 → product is NOT sold out
    const p = base({ stock: 0, stockByVariant: { "0-3 Months": { White: 1, Black: 1 }, "3-6 Months": { White: 1, Black: 1 } } });
    expect(hasAnyStock(p)).toBe(true);
  });
  it("false only when every tracked variant is 0", () => {
    const p = base({ stock: 0, stockByVariant: { "0-3 Months": { White: 0, Black: 0 }, "3-6 Months": { White: 0, Black: 0 } } });
    expect(hasAnyStock(p)).toBe(false);
  });
  it("untracked combos fall back to flat stock", () => {
    expect(hasAnyStock(base({ stock: 5 }))).toBe(true);
    expect(hasAnyStock(base({ stock: 0 }))).toBe(false);
    expect(hasAnyStock(base({ stock: undefined }))).toBe(true); // null = unlimited
  });
});
