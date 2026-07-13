/**
 * Rate limiting for API routes (SERVER ONLY).
 *
 * `serverRateLimited` is the one to use: it counts hits in the shared
 * `rate_limits` table (supabase/rate-limits.sql) so the limit holds across
 * every serverless instance and survives restarts. Until that migration is
 * run — or if the DB hiccups — it silently falls back to the in-memory
 * limiter below, so a limiter failure can never take checkout down.
 *
 * The in-memory limiter is per-instance by design (resets on redeploy, not
 * shared across lambdas) — fine against naive floods, weak against a real
 * attacker. That's exactly why the DB-backed path exists.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const buckets = new Map<string, number[]>();

/** True if `key` already made `max` calls within the last `windowMs`. (In-memory.) */
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  // Keep the map from growing unbounded.
  if (buckets.size > 2000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return false;
}

let dbLimiterBroken = false; // warn + skip DB retries once it's known missing

/**
 * Cross-instance limiter: counts in the DB, falls back to in-memory when the
 * migration hasn't run / service key is missing / the RPC errors.
 */
export async function serverRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  if (!dbLimiterBroken) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      try {
        const { data, error } = await admin.rpc("rate_limit_hit", {
          p_key: key,
          p_max: max,
          p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
        });
        if (!error) return data === true;
        if (/rate_limit_hit/i.test(error.message)) {
          dbLimiterBroken = true;
          console.warn("[rateLimit] rate_limit_hit missing — run supabase/rate-limits.sql. Using in-memory limiter.");
        } else {
          console.warn("[rateLimit] DB limiter failed, falling back to in-memory:", error.message);
        }
      } catch (e) {
        console.warn("[rateLimit] DB limiter failed, falling back to in-memory:", (e as Error).message);
      }
    }
  }
  return rateLimited(key, max, windowMs);
}
