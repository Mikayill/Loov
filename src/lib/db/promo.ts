"use client";

/**
 * Client-side promo validation — thin fetch wrapper over POST /api/promo.
 * Used by the cart (Apply button) and checkout (re-validating the code the
 * cart handed over). The server re-runs the same rules at order time, so a
 * stale "ok" here can never produce a wrong charge.
 */

import type { PromoDef, PromoError } from "@/lib/promo";

export async function validatePromo(
  code: string
): Promise<{ promo?: PromoDef; error?: PromoError }> {
  try {
    const res = await fetch("/api/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.ok) {
      return { promo: { code: d.code, type: d.type, value: Number(d.value) } };
    }
    const known: PromoError[] = ["invalid", "expired", "limit", "used", "signin"];
    return { error: known.includes(d.error) ? d.error : "invalid" };
  } catch {
    return { error: "network" };
  }
}
