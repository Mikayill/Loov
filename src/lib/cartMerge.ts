/**
 * Pure, tombstone-aware merge for cart/wishlist cross-device sync.
 *
 * Why tombstones: a naive "union by key" merge can never distinguish "the
 * other device never had this line" from "the other device deleted this
 * line" — both look like absence. Without a deletion record, union merge
 * silently resurrects things the shopper explicitly removed. Every mutation
 * (add/update) stamps `updatedAt`; every removal records a tombstone. Merge
 * then picks whichever event — an item edit or a deletion — is newest for
 * each key. This mirrors how most e-commerce carts avoid losing items
 * without accidentally reviving ones the shopper meant to delete.
 *
 * Line-level (not whole-cart) last-write-wins: a deliberate quantity
 * reduction on one device is respected over a stale higher quantity
 * elsewhere, rather than always taking the max.
 */

export interface Tombstone {
  key: string;
  /** epoch ms */
  removedAt: number;
}

export interface MergeEnvelope<T> {
  lines: T[];
  tombstones: Tombstone[];
}

type Timestamped = { updatedAt?: number };

/** Tombstones older than this are pruned — sync happens within minutes in
 *  practice, so 30 days is generous headroom, not a real limitation. */
export const TOMBSTONE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function pruneTombstones(tombstones: Tombstone[], now: number = Date.now()): Tombstone[] {
  return tombstones.filter((t) => now - t.removedAt < TOMBSTONE_MAX_AGE_MS);
}

/** Decide the winner for one key: the newest of (local item, remote item,
 *  local tombstone, remote tombstone). Missing `updatedAt` defaults to 0, so
 *  old un-stamped data always loses to anything freshly edited. On an exact
 *  timestamp tie, the item wins over the tombstone (bias toward not losing
 *  items, consistent with the "never silently drop" goal). */
function resolveKey<T extends Timestamped>(
  localItem: T | undefined,
  remoteItem: T | undefined,
  localTombAt: number | undefined,
  remoteTombAt: number | undefined
): { item?: T; tombAt?: number } {
  const candidates: { time: number; item?: T; tomb?: boolean }[] = [];
  if (localItem) candidates.push({ time: localItem.updatedAt ?? 0, item: localItem });
  if (remoteItem) candidates.push({ time: remoteItem.updatedAt ?? 0, item: remoteItem });
  if (localTombAt !== undefined) candidates.push({ time: localTombAt, tomb: true });
  if (remoteTombAt !== undefined) candidates.push({ time: remoteTombAt, tomb: true });
  if (candidates.length === 0) return {};

  candidates.sort((a, b) => b.time - a.time || (a.tomb ? 1 : 0) - (b.tomb ? 1 : 0));
  const winner = candidates[0];
  if (winner.tomb) {
    const tombTimes = [localTombAt, remoteTombAt].filter((t): t is number => t !== undefined);
    return { tombAt: Math.max(...tombTimes) };
  }
  return { item: winner.item };
}

/**
 * Merge two envelopes (local + remote) into one, key by `keyOf`. Pure and
 * deterministic given its inputs — does NOT prune tombstones (that's a
 * real-time-dependent storage concern; call `pruneTombstones` separately,
 * with the real `Date.now()`, right before persisting the result).
 */
export function mergeLines<T extends Timestamped>(
  local: MergeEnvelope<T>,
  remote: MergeEnvelope<T>,
  keyOf: (item: T) => string
): MergeEnvelope<T> {
  const localByKey = new Map(local.lines.map((l) => [keyOf(l), l]));
  const remoteByKey = new Map(remote.lines.map((l) => [keyOf(l), l]));
  const localTomb = new Map(local.tombstones.map((t) => [t.key, t.removedAt]));
  const remoteTomb = new Map(remote.tombstones.map((t) => [t.key, t.removedAt]));

  const allKeys = new Set<string>([
    ...localByKey.keys(),
    ...remoteByKey.keys(),
    ...localTomb.keys(),
    ...remoteTomb.keys(),
  ]);

  const lines: T[] = [];
  const tombstones: Tombstone[] = [];
  for (const key of allKeys) {
    const { item, tombAt } = resolveKey(localByKey.get(key), remoteByKey.get(key), localTomb.get(key), remoteTomb.get(key));
    if (item) lines.push(item);
    else if (tombAt !== undefined) tombstones.push({ key, removedAt: tombAt });
  }
  return { lines, tombstones };
}

/**
 * Parse a persisted envelope from localStorage/DB JSON, tolerating the
 * pre-tombstone format (a bare array with no `updatedAt`/tombstones at all —
 * every real user's existing saved cart/wishlist looks like this today).
 * `normalizeLine` additionally handles per-context legacy line shapes
 * (e.g. wishlist's old plain `string[]` of ids); omit it when lines are
 * already in their current shape.
 */
export function parseEnvelope<T>(raw: unknown, normalizeLine?: (x: unknown) => T | null): MergeEnvelope<T> {
  let rawLines: unknown[];
  let tombstones: Tombstone[] = [];
  if (Array.isArray(raw)) {
    rawLines = raw; // legacy: bare array, no tombstones ever existed
  } else if (raw && typeof raw === "object" && Array.isArray((raw as { lines?: unknown }).lines)) {
    const envelope = raw as { lines: unknown[]; tombstones?: unknown };
    rawLines = envelope.lines;
    tombstones = Array.isArray(envelope.tombstones) ? (envelope.tombstones as Tombstone[]) : [];
  } else {
    return { lines: [], tombstones: [] };
  }
  const lines = normalizeLine
    ? rawLines.map(normalizeLine).filter((x): x is T => x !== null)
    : (rawLines as T[]);
  return { lines, tombstones };
}

/** Parse straight from a JSON string (localStorage.getItem result), swallowing bad JSON. */
export function parseEnvelopeJson<T>(raw: string | null, normalizeLine?: (x: unknown) => T | null): MergeEnvelope<T> {
  if (!raw) return { lines: [], tombstones: [] };
  try {
    return parseEnvelope<T>(JSON.parse(raw), normalizeLine);
  } catch {
    return { lines: [], tombstones: [] };
  }
}
