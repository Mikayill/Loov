/**
 * Supabase ADMIN client — uses the service-role key, which BYPASSES all RLS.
 *
 * ⚠️ Server-only. Never import from a client component; never expose the key.
 * Used for trusted writes the anon key can't do (loyalty ledger, guest order
 * lookups). Returns null when the key isn't configured so callers can degrade
 * gracefully.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
