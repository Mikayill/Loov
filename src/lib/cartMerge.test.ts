import { describe, it, expect } from "vitest";
import { mergeLines, parseEnvelope, pruneTombstones, type MergeEnvelope } from "@/lib/cartMerge";

interface Line { key: string; qty: number; updatedAt?: number }
const keyOf = (l: Line) => l.key;
const env = (lines: Line[], tombstones: { key: string; removedAt: number }[] = []): MergeEnvelope<Line> => ({ lines, tombstones });

describe("mergeLines", () => {
  it("keeps an item that exists only on one side (never silently drop)", () => {
    const local = env([{ key: "a", qty: 1, updatedAt: 10 }]);
    const remote = env([]);
    const merged = mergeLines(local, remote, keyOf);
    expect(merged.lines).toEqual([{ key: "a", qty: 1, updatedAt: 10 }]);
    expect(merged.tombstones).toEqual([]);
  });

  it("newer item edit wins over an older one for the same key", () => {
    const local = env([{ key: "a", qty: 5, updatedAt: 100 }]);
    const remote = env([{ key: "a", qty: 1, updatedAt: 200 }]); // deliberate reduction, more recent
    const merged = mergeLines(local, remote, keyOf);
    expect(merged.lines).toEqual([{ key: "a", qty: 1, updatedAt: 200 }]); // respects the reduction, not max(5,1)
  });

  it("a tombstone newer than the other side's item wins — deletion sticks", () => {
    const local = env([], [{ key: "a", removedAt: 300 }]);
    const remote = env([{ key: "a", qty: 2, updatedAt: 200 }]); // stale, deleted after this
    const merged = mergeLines(local, remote, keyOf);
    expect(merged.lines).toEqual([]);
    expect(merged.tombstones).toEqual([{ key: "a", removedAt: 300 }]);
  });

  it("an item edited AFTER a tombstone resurrects it (re-added later)", () => {
    const local = env([{ key: "a", qty: 1, updatedAt: 400 }]); // re-added on this device
    const remote = env([], [{ key: "a", removedAt: 300 }]); // was deleted earlier on remote
    const merged = mergeLines(local, remote, keyOf);
    expect(merged.lines).toEqual([{ key: "a", qty: 1, updatedAt: 400 }]);
    expect(merged.tombstones).toEqual([]);
  });

  it("items missing updatedAt (legacy data) always lose to any stamped edit", () => {
    const local = env([{ key: "a", qty: 9 }]); // no updatedAt → treated as 0
    const remote = env([{ key: "a", qty: 1, updatedAt: 1 }]);
    const merged = mergeLines(local, remote, keyOf);
    expect(merged.lines).toEqual([{ key: "a", qty: 1, updatedAt: 1 }]);
  });

  it("exact timestamp tie: item wins over tombstone (never-lose bias)", () => {
    const local = env([{ key: "a", qty: 1, updatedAt: 50 }]);
    const remote = env([], [{ key: "a", removedAt: 50 }]);
    const merged = mergeLines(local, remote, keyOf);
    expect(merged.lines).toEqual([{ key: "a", qty: 1, updatedAt: 50 }]);
  });

  it("independent lines on both sides all survive (real union case)", () => {
    const local = env([{ key: "a", qty: 1, updatedAt: 10 }]);
    const remote = env([{ key: "b", qty: 2, updatedAt: 20 }]);
    const merged = mergeLines(local, remote, keyOf);
    expect(merged.lines.map((l) => l.key).sort()).toEqual(["a", "b"]);
  });

  it("tombstone present on only one side still removes the key", () => {
    const local = env([{ key: "a", qty: 1, updatedAt: 10 }], [{ key: "a", removedAt: 20 }]);
    const remote = env([]); // never had it
    const merged = mergeLines(local, remote, keyOf);
    expect(merged.lines).toEqual([]);
    expect(merged.tombstones).toEqual([{ key: "a", removedAt: 20 }]);
  });
});

describe("parseEnvelope — backward compatibility", () => {
  it("legacy bare array (pre-tombstone format) becomes lines with no tombstones", () => {
    const parsed = parseEnvelope<Line>([{ key: "a", qty: 1 }]);
    expect(parsed).toEqual({ lines: [{ key: "a", qty: 1 }], tombstones: [] });
  });

  it("current envelope format round-trips", () => {
    const raw = { lines: [{ key: "a", qty: 1, updatedAt: 5 }], tombstones: [{ key: "b", removedAt: 6 }] };
    expect(parseEnvelope<Line>(raw)).toEqual(raw);
  });

  it("garbage input never throws, returns empty", () => {
    expect(parseEnvelope<Line>(null)).toEqual({ lines: [], tombstones: [] });
    expect(parseEnvelope<Line>("not an object")).toEqual({ lines: [], tombstones: [] });
    expect(parseEnvelope<Line>(42)).toEqual({ lines: [], tombstones: [] });
  });

  it("normalizeLine filters/transforms raw legacy line shapes", () => {
    const parsed = parseEnvelope<{ id: string }>(["x", "y", 123], (raw) =>
      typeof raw === "string" ? { id: raw } : null
    );
    expect(parsed.lines).toEqual([{ id: "x" }, { id: "y" }]);
  });
});

describe("pruneTombstones", () => {
  it("drops tombstones older than 30 days, keeps recent ones", () => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const tombstones = [
      { key: "old", removedAt: now - 31 * DAY },
      { key: "recent", removedAt: now - 1 * DAY },
    ];
    expect(pruneTombstones(tombstones, now)).toEqual([{ key: "recent", removedAt: now - 1 * DAY }]);
  });
});
