"use client";

/**
 * Client-side settings hook — the browser twin of `db/settings.ts`.
 *
 * Renders instantly with DEFAULT_SETTINGS, then swaps in the DB values.
 * Fetched ONCE per page load and shared via a module-level cache (like
 * useProducts), so many components cost a single request.
 */

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_SETTINGS, settingsFromRows, type StoreSettings } from "@/lib/settings";

let cache: StoreSettings | null = null;
let inflight: Promise<StoreSettings> | null = null;

async function loadSettings(): Promise<StoreSettings> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.from("settings").select("key, value");
        if (error) throw error;
        cache = settingsFromRows(data ?? []);
        return cache;
      } catch (e) {
        console.warn("[useSettings] DB fetch failed — defaults:", (e as Error).message);
        return DEFAULT_SETTINGS;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

export function useSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(cache ?? DEFAULT_SETTINGS);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    loadSettings().then((s) => { if (!cancelled) setSettings(s); });
    return () => { cancelled = true; };
  }, []);

  return settings;
}
