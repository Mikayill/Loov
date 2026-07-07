"use client";

/**
 * Loov Rewards wallet.
 *
 * Two sources, picked automatically:
 *  - Signed-in  → the `loyalty_transactions` table in Supabase (written
 *    server-side by /api/orders; RLS lets users READ their own rows only).
 *    Points follow the account across devices.
 *  - Guest      → a localStorage ledger, same shape.
 *
 * Both are append-only ledgers; balance is always derived from the rows, so
 * it can never drift out of sync.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  tierFor,
  nextTierAfter,
  pointsForAmount,
  type LoyaltyTier,
} from "@/lib/loyalty";

export interface LoyaltyTransaction {
  id: string;
  /** Positive = earned, negative = redeemed. */
  delta: number;
  reason: "order" | "redeem" | "bonus";
  orderNumber?: string;
  date: string; // ISO
}

interface LoyaltyContextType {
  transactions: LoyaltyTransaction[];
  /** Spendable points right now. */
  balance: number;
  /** All points ever earned — decides the tier (never decreases). */
  lifetimeEarned: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  /** Points still needed to reach the next tier (0 when Gold). */
  pointsToNextTier: number;
  /** Which ledger is active: account (db) or this browser (local). */
  source: "db" | "local";
  /** Re-read the DB ledger (call after the server writes new rows). */
  refresh: () => Promise<void>;
  /** Guest-only: record points earned locally. Returns points added. */
  earnFromOrder: (totalGel: number, orderNumber: string) => number;
  /** Guest-only: record a redemption locally. */
  redeemPoints: (points: number, orderNumber: string) => void;
  hydrated: boolean;
}

const LoyaltyContext = createContext<LoyaltyContextType | null>(null);
const STORAGE_KEY = "loov-loyalty";

interface DbTxRow {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
  orders: { order_number: string } | null;
}

export function LoyaltyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [localTx, setLocalTx] = useState<LoyaltyTransaction[]>([]);
  const [dbTx, setDbTx] = useState<LoyaltyTransaction[] | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /* ── Local (guest) ledger ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLocalTx(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(localTx));
  }, [localTx, hydrated]);

  /* ── DB (account) ledger ── */
  const refresh = useCallback(async () => {
    if (!user) { setDbTx(null); return; }
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("loyalty_transactions")
        .select("id, delta, reason, created_at, orders(order_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDbTx(
        ((data ?? []) as unknown as DbTxRow[]).map((r) => ({
          id: r.id,
          delta: Number(r.delta),
          reason: (["order", "redeem", "bonus"].includes(r.reason) ? r.reason : "order") as LoyaltyTransaction["reason"],
          orderNumber: r.orders?.order_number,
          date: r.created_at,
        }))
      );
    } catch (e) {
      /* Table missing / network issue → stay on the local ledger. */
      console.warn("[loyalty] DB ledger unavailable:", (e as Error).message);
      setDbTx(null);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const source: "db" | "local" = dbTx !== null ? "db" : "local";
  const transactions = dbTx ?? localTx;

  const lifetimeEarned = transactions.reduce(
    (sum, t) => (t.delta > 0 ? sum + t.delta : sum),
    0
  );
  const balance = transactions.reduce((sum, t) => sum + t.delta, 0);
  const tier = tierFor(lifetimeEarned);
  const nextTier = nextTierAfter(lifetimeEarned);
  const pointsToNextTier = nextTier ? nextTier.threshold - lifetimeEarned : 0;

  const earnFromOrder = useCallback(
    (totalGel: number, orderNumber: string): number => {
      if (dbTx !== null) return 0; // account ledger is written server-side
      const pts = pointsForAmount(totalGel, tierFor(lifetimeEarned));
      if (pts <= 0) return 0;
      setLocalTx((prev) => [
        { id: crypto.randomUUID(), delta: pts, reason: "order" as const, orderNumber, date: new Date().toISOString() },
        ...prev,
      ]);
      return pts;
    },
    [dbTx, lifetimeEarned]
  );

  const redeemPoints = useCallback((points: number, orderNumber: string) => {
    if (dbTx !== null || points <= 0) return; // account ledger is server-side
    setLocalTx((prev) => [
      { id: crypto.randomUUID(), delta: -points, reason: "redeem" as const, orderNumber, date: new Date().toISOString() },
      ...prev,
    ]);
  }, [dbTx]);

  return (
    <LoyaltyContext.Provider
      value={{
        transactions,
        balance,
        lifetimeEarned,
        tier,
        nextTier,
        pointsToNextTier,
        source,
        refresh,
        earnFromOrder,
        redeemPoints,
        hydrated,
      }}
    >
      {children}
    </LoyaltyContext.Provider>
  );
}

export function useLoyalty() {
  const ctx = useContext(LoyaltyContext);
  if (!ctx) throw new Error("useLoyalty must be used within LoyaltyProvider");
  return ctx;
}
