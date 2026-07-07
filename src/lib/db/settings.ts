/**
 * Server-side settings reader. Falls back to DEFAULT_SETTINGS if the DB /
 * settings table is unreachable, so the site never breaks.
 *
 * Server-only (uses the cookie server client). Call from Server Components /
 * Route Handlers, pass the result to client components as props if needed.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, settingsFromRows, type StoreSettings } from "@/lib/settings";

export async function getSettings(): Promise<StoreSettings> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) throw error;
    return settingsFromRows(data ?? []);
  } catch (e) {
    console.warn("[settings] fetch failed — using defaults:", (e as Error).message);
    return DEFAULT_SETTINGS;
  }
}

/** Cookie-free variant for static/build contexts (won't force a route dynamic). */
export async function getSettingsStatic(): Promise<StoreSettings> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return DEFAULT_SETTINGS;
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) throw error;
    return settingsFromRows(data ?? []);
  } catch {
    return DEFAULT_SETTINGS;
  }
}
