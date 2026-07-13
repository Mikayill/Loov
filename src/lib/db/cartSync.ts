/**
 * Cross-device cart/wishlist sync for signed-in users (supabase/cart-wishlist.sql).
 *
 * Best-effort by design: if the tables aren't migrated, the user is offline,
 * or RLS blocks the row, everything fails silently and the caller keeps
 * using its localStorage copy — so nothing breaks before the migration runs.
 *
 * The stored `items` jsonb holds a tombstone-aware envelope (see
 * src/lib/cartMerge.ts) rather than a bare array — `saveRemoteMerged` always
 * re-reads the current row and merges before writing, with one retry on a
 * detected conflict (CAS-lite via `updated_at`), so two devices saving
 * around the same time don't blindly clobber each other. This is best-effort
 * concurrency control, not a strict transactional guarantee — acceptable at
 * this store's scale (a lost race just means the next 700ms-debounced save
 * re-merges from fresh state).
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseEnvelope, type MergeEnvelope } from "@/lib/cartMerge";

export type SyncTable = "user_carts" | "user_wishlists";

/** The account's stored envelope + the row's `updated_at` (null = no row yet). */
export async function loadRemote<T>(
  table: SyncTable
): Promise<{ envelope: MergeEnvelope<T>; updatedAt: string | null } | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    // RLS limits the result to the signed-in user's own row.
    const { data, error } = await supabase.from(table).select("items, updated_at").maybeSingle();
    if (error) return null;
    if (!data) return { envelope: { lines: [], tombstones: [] }, updatedAt: null };
    return { envelope: parseEnvelope<T>(data.items), updatedAt: (data.updated_at as string) ?? null };
  } catch {
    return null;
  }
}

/**
 * Read-merge-write with a CAS-lite conflict check: re-reads the row fresh,
 * lets `merge` combine it with local state, and only writes if `updated_at`
 * hasn't changed since the read — retried once on a detected conflict, then
 * silently given up (best-effort, see file header).
 *
 * `merge` receives `null` when no remote row exists yet (first sync).
 */
export async function saveRemoteMerged<T>(
  table: SyncTable,
  userId: string,
  merge: (remote: MergeEnvelope<T> | null) => MergeEnvelope<T>
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.from(table).select("items, updated_at").maybeSingle();
      if (error) return; // can't read → best-effort, give up silently

      const currentEnvelope = data ? parseEnvelope<T>(data.items) : null;
      const currentUpdatedAt = (data?.updated_at as string | undefined) ?? null;
      const merged = merge(currentEnvelope);
      const nowIso = new Date().toISOString();

      if (currentUpdatedAt === null) {
        // No row yet — insert. A unique-violation here means another device
        // just inserted first; retry the loop to merge against it instead.
        const { error: insErr } = await supabase
          .from(table)
          .insert({ user_id: userId, items: merged, updated_at: nowIso });
        if (!insErr) return;
        continue;
      }

      // Conditional update: only applies if updated_at still matches what we
      // just read. 0 rows affected means someone else wrote in between.
      const { data: updData, error: updErr } = await supabase
        .from(table)
        .update({ items: merged, updated_at: nowIso })
        .eq("user_id", userId)
        .eq("updated_at", currentUpdatedAt)
        .select("user_id");
      if (!updErr && updData && updData.length > 0) return;
      // else: conflict — loop again with a fresh read.
    } catch {
      return; // best-effort
    }
  }
  /* Gave up after 2 attempts — the next debounced save (either device) will
     retry from fresh state. See file header for why this is an accepted
     trade-off rather than a full transactional protocol. */
}
