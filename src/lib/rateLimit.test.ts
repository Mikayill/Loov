import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimited } from "@/lib/rateLimit";

describe("rateLimited (in-memory sliding window)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows up to `max` calls in the window, blocks the next one", () => {
    const key = `test:${Math.random()}`;
    expect(rateLimited(key, 3, 1000)).toBe(false);
    expect(rateLimited(key, 3, 1000)).toBe(false);
    expect(rateLimited(key, 3, 1000)).toBe(false);
    expect(rateLimited(key, 3, 1000)).toBe(true); // 4th call in the window
  });

  it("different keys have independent buckets", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    expect(rateLimited(a, 1, 1000)).toBe(false);
    expect(rateLimited(a, 1, 1000)).toBe(true);
    expect(rateLimited(b, 1, 1000)).toBe(false); // b is untouched by a's limit
  });

  it("old hits fall out of the window and free up capacity", () => {
    const key = `window:${Math.random()}`;
    expect(rateLimited(key, 1, 1000)).toBe(false);
    expect(rateLimited(key, 1, 1000)).toBe(true); // still within the window
    vi.advanceTimersByTime(1001);
    expect(rateLimited(key, 1, 1000)).toBe(false); // window has rolled over
  });
});
