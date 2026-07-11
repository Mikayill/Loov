/**
 * Cross-device cart/wishlist sync for signed-in users (supabase/cart-wishlist.sql).
 *
 * Best-effort by design: if the tables aren't migrated, the user is offline,
 * or RLS blocks the row, both functions fail silently and the caller keeps
 * using its localStorage copy — so nothing breaks before the migration runs.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SyncTable = "user_carts" | "user_wishlists";

/** The account's stored items, or null when unavailable (keep local). */
export async function loadRemote<T>(table: SyncTable): Promise<T[] | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    // RLS limits the result to the signed-in user's own row.
    const { data, error } = await supabase.from(table).select("items").maybeSingle();
    if (error) return null;
    const items = data?.items ?? null;
    return Array.isArray(items) ? (items as T[]) : null;
  } catch {
    return null;
  }
}

/** Upsert the account's items. Silent on failure. */
export async function saveRemote<T>(table: SyncTable, userId: string, items: T[]): Promise<void> {
  try {
    const supabase = createSupabaseBrowserClient();
    await supabase
      .from(table)
      .upsert({ user_id: userId, items, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  } catch {
    /* best-effort — the localStorage copy is still authoritative locally */
  }
}
