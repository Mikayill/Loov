import { describe, it, expect } from "vitest";
import { reverseOrderLoyalty, restoreOrderLoyalty } from "@/lib/loyaltyReversal";
import { createFakeAdmin } from "@/lib/testUtils/fakeSupabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

function seed() {
  return createFakeAdmin({
    loyalty_transactions: [
      { id: "t1", user_id: "u1", order_id: "o1", delta: 100, reason: "order" },
      { id: "t2", user_id: "u1", order_id: "o1", delta: -40, reason: "redeem" },
      // A second order with no redemption, to check the "earned only" path.
      { id: "t3", user_id: "u1", order_id: "o2", delta: 30, reason: "order" },
      // A guest-less order (no loyalty rows at all) is order "o3" — nothing seeded.
    ],
  });
}

describe("reverseOrderLoyalty (admin cancel + customer cancel share this)", () => {
  it("claws back earned points AND refunds redeemed points as 'return' rows", async () => {
    const admin = seed();
    await reverseOrderLoyalty(admin as Admin, "o1");
    const rows = admin.tables.loyalty_transactions.filter((r: any) => r.order_id === "o1"); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rows).toHaveLength(4); // original 2 + 2 new "return" rows
    const returns = rows.filter((r: any) => r.reason === "return"); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(returns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ delta: -100 }), // claws back the 100 earned
        expect.objectContaining({ delta: 40 }),   // refunds the 40 redeemed
      ])
    );
    // Net balance for this order is now 0 (100 - 40 - 100 + 40).
    const net = rows.reduce((s: number, r: any) => s + Number(r.delta), 0); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(net).toBe(0);
  });

  it("only claws back earned points when there was no redemption", async () => {
    const admin = seed();
    await reverseOrderLoyalty(admin as Admin, "o2");
    const rows = admin.tables.loyalty_transactions.filter((r: any) => r.order_id === "o2"); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rows).toHaveLength(2);
    expect(rows.some((r: any) => r.reason === "return" && r.delta === -30)).toBe(true); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("is idempotent — a second cancel never double-reverses", async () => {
    const admin = seed();
    await reverseOrderLoyalty(admin as Admin, "o1");
    await reverseOrderLoyalty(admin as Admin, "o1"); // called again (e.g. retry)
    const rows = admin.tables.loyalty_transactions.filter((r: any) => r.order_id === "o1"); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rows).toHaveLength(4); // still exactly 2 + 2, not 2 + 4
  });

  it("does nothing for an order with no loyalty rows (guest order)", async () => {
    const admin = seed();
    await reverseOrderLoyalty(admin as Admin, "o3");
    expect(admin.tables.loyalty_transactions.filter((r: any) => r.order_id === "o3")).toHaveLength(0); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
});

describe("restoreOrderLoyalty (admin un-cancel)", () => {
  it("removes exactly the 'return' rows, restoring the original balance", async () => {
    const admin = seed();
    await reverseOrderLoyalty(admin as Admin, "o1");
    await restoreOrderLoyalty(admin as Admin, "o1");
    const rows = admin.tables.loyalty_transactions.filter((r: any) => r.order_id === "o1"); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rows).toHaveLength(2); // back to the original order+redeem rows
    expect(rows.every((r: any) => r.reason !== "return")).toBe(true); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("un-cancel then re-cancel reverses again cleanly", async () => {
    const admin = seed();
    await reverseOrderLoyalty(admin as Admin, "o1");
    await restoreOrderLoyalty(admin as Admin, "o1");
    await reverseOrderLoyalty(admin as Admin, "o1");
    const rows = admin.tables.loyalty_transactions.filter((r: any) => r.order_id === "o1"); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rows).toHaveLength(4);
    const net = rows.reduce((s: number, r: any) => s + Number(r.delta), 0); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(net).toBe(0);
  });
});
