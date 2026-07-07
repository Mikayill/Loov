/**
 * Supabase browser client (Phase 2 backend).
 *
 * Call `createSupabaseBrowserClient()` inside client components once the env
 * vars are set (see .env.local.example). Until then the UI keeps using the mock
 * contexts, so nothing breaks.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing — copy .env.local.example to .env.local and fill them in."
    );
  }
  return createBrowserClient(url, key);
}
