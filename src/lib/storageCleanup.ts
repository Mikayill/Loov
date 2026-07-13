/**
 * Best-effort Supabase Storage cleanup — deletes objects that just became
 * unreferenced (removed from a product's gallery, a bundle photo replaced,
 * or the parent row itself deleted). Every upload path so far has only ever
 * ADDED files (new timestamped path each time) and updated the DB pointer —
 * the previous file was silently left behind. Never blocks or throws on
 * failure: worst case is the pre-existing behavior (an orphaned file), never
 * a regression, and it must never risk the DB write it rides alongside.
 */
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

/** Turn a Supabase public Storage URL into `{bucket, path}` — null for
 *  anything that doesn't look like one (already gone, external, etc). */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const marker = "/storage/v1/object/public/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const rest = url.slice(i + marker.length);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

/** Delete every URL in `urls` that belongs to `bucket` (anything else is ignored). */
export async function deleteStorageUrls(
  admin: AdminClient,
  bucket: string,
  urls: (string | null | undefined)[]
): Promise<void> {
  const paths = urls
    .filter((u): u is string => !!u)
    .map(parseStorageUrl)
    .filter((p): p is { bucket: string; path: string } => !!p && p.bucket === bucket)
    .map((p) => p.path);
  if (paths.length === 0) return;
  try {
    const { error } = await admin.storage.from(bucket).remove(paths);
    if (error) console.warn(`[storageCleanup] remove from "${bucket}" failed:`, error.message);
  } catch (e) {
    console.warn(`[storageCleanup] remove from "${bucket}" failed:`, (e as Error).message);
  }
}

/** URLs present in `before` but not in `after` — the ones that just got orphaned. */
export function removedUrls(
  before: (string | null | undefined)[],
  after: (string | null | undefined)[]
): string[] {
  const keep = new Set(after.filter((u): u is string => !!u));
  return before.filter((u): u is string => !!u && !keep.has(u));
}
