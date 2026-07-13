import { describe, it, expect } from "vitest";
import { promoAvailable, validatePromoServer, recordPromoUse, adjustPromoUse } from "@/lib/promoValidation";
import { createFakeAdmin } from "@/lib/testUtils/fakeSupabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

function seed() {
  return createFakeAdmin({
    promo_codes: [
      { id: "p1", code: "LOOV10", type: "percent", value: 10, expires_at: null, usage_limit: null, times_used: 0, active: true },
      { id: "p2", code: "EXPIRED", type: "percent", value: 10, expires_at: past, usage_limit: null, times_used: 0, active: true },
      { id: "p3", code: "MAXEDOUT", type: "percent", value: 10, expires_at: null, usage_limit: 5, times_used: 5, active: true },
      { id: "p4", code: "OFF", type: "percent", value: 10, expires_at: null, usage_limit: null, times_used: 0, active: false },
      { id: "p5", code: "FRESH", type: "percent", value: 15, expires_at: future, usage_limit: 10, times_used: 2, active: true },
    ],
    orders: [
      { id: "o1", user_id: "used-user", promo_code: "LOOV10", status: "delivered" },
      { id: "o2", user_id: "cancelled-user", promo_code: "LOOV10", status: "cancelled" },
    ],
  });
}

describe("promoAvailable", () => {
  it("true for an active, unexpired, unlimited code", async () => {
    expect(await promoAvailable(seed() as Admin, "loov10")).toBe(true);
  });
  it("false when expired, inactive, limit reached, or missing", async () => {
    const admin = seed();
    expect(await promoAvailable(admin as Admin, "EXPIRED")).toBe(false);
    expect(await promoAvailable(admin as Admin, "OFF")).toBe(false);
    expect(await promoAvailable(admin as Admin, "MAXEDOUT")).toBe(false);
    expect(await promoAvailable(admin as Admin, "NOPE")).toBe(false);
  });
});

describe("validatePromoServer", () => {
  it("guests are refused — members only", async () => {
    const r = await validatePromoServer(seed() as Admin, "LOOV10", null);
    expect(r.error).toBe("signin");
  });
  it("unknown/inactive code is invalid", async () => {
    const admin = seed();
    expect((await validatePromoServer(admin as Admin, "NOPE", "u1")).error).toBe("invalid");
    expect((await validatePromoServer(admin as Admin, "OFF", "u1")).error).toBe("invalid");
  });
  it("expired code", async () => {
    const r = await validatePromoServer(seed() as Admin, "EXPIRED", "u1");
    expect(r.error).toBe("expired");
  });
  it("usage limit reached", async () => {
    const r = await validatePromoServer(seed() as Admin, "MAXEDOUT", "u1");
    expect(r.error).toBe("limit");
  });
  it("already used by this customer (non-cancelled order)", async () => {
    const r = await validatePromoServer(seed() as Admin, "LOOV10", "used-user");
    expect(r.error).toBe("used");
  });
  it("a cancelled order does NOT count as 'used'", async () => {
    const r = await validatePromoServer(seed() as Admin, "LOOV10", "cancelled-user");
    expect(r.promo?.code).toBe("LOOV10");
  });
  it("valid code for a fresh member returns the promo + rowId", async () => {
    const r = await validatePromoServer(seed() as Admin, "fresh", "new-user");
    expect(r.promo).toEqual({ code: "FRESH", type: "percent", value: 15, rowId: "p5" });
  });
});

describe("recordPromoUse", () => {
  it("increments times_used by exactly 1", async () => {
    const admin = seed();
    await recordPromoUse(admin as Admin, "p1");
    expect(admin.tables.promo_codes.find((r: any) => r.id === "p1")!.times_used).toBe(1); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
  it("refuses to exceed the usage limit", async () => {
    const admin = seed();
    await recordPromoUse(admin as Admin, "p3"); // already at limit (5/5)
    expect(admin.tables.promo_codes.find((r: any) => r.id === "p3")!.times_used).toBe(5); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
});

describe("adjustPromoUse — keeps the global counter honest on cancel/un-cancel", () => {
  it("cancel (-1) decrements the code's counter", async () => {
    const admin = seed();
    await adjustPromoUse(admin as Admin, "loov10", -1); // starts at 0
    // clamped at 0, never goes negative
    expect(admin.tables.promo_codes.find((r: any) => r.id === "p1")!.times_used).toBe(0); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
  it("un-cancel (+1) restores the slot", async () => {
    const admin = seed();
    await adjustPromoUse(admin as Admin, "fresh", -1); // 2 -> 1
    await adjustPromoUse(admin as Admin, "fresh", 1);  // 1 -> 2
    expect(admin.tables.promo_codes.find((r: any) => r.id === "p5")!.times_used).toBe(2); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
  it("unknown code is a silent no-op", async () => {
    const admin = seed();
    await adjustPromoUse(admin as Admin, "NOPE", -1);
    expect(admin.tables.promo_codes).toHaveLength(5);
  });
});
