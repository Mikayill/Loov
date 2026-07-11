/**
 * Tiny in-memory sliding-window rate limiter for API routes (same approach
 * the contact form has used since day one). Best-effort by design: the map
 * resets on redeploy and isn't shared across serverless instances — good
 * enough to stop naive flood/bot abuse, not a substitute for edge-level
 * limiting if that ever becomes necessary.
 */

const buckets = new Map<string, number[]>();

/** True if `key` already made `max` calls within the last `windowMs`. */
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
