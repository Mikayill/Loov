"use client";

/**
 * Customer profile data layer (browser client, RLS own-row).
 *
 * The extended columns (baby info, language, avatar, notification prefs) come
 * from supabase/profile.sql. When that migration hasn't been run yet the
 * fetch retries with the base columns and reports `ready: false`, so the UI
 * can show a clear "run profile.sql" hint instead of breaking.
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n/config";

export type BabyGender = "boy" | "girl" | "na";

export interface MyProfile {
  name: string | null;
  phone: string | null;
  babyName: string | null;
  /** "YYYY-MM-DD" */
  babyBirthdate: string | null;
  babyGender: BabyGender | null;
  language: Locale | null;
  avatarUrl: string | null;
  notificationPrefs: Record<string, boolean>;
}

export const EMPTY_PROFILE: MyProfile = {
  name: null,
  phone: null,
  babyName: null,
  babyBirthdate: null,
  babyGender: null,
  language: null,
  avatarUrl: null,
  notificationPrefs: {},
};

const FULL_SELECT =
  "name, phone, baby_name, baby_birthdate, baby_gender, language, avatar_url, notification_prefs";
const BASE_SELECT = "name, phone";

/** Does this error smell like "profile.sql not run yet"? */
const isMissingColumn = (msg: string) =>
  /baby_|language|avatar_url|notification_prefs|column|schema cache/i.test(msg);

interface ProfileRow {
  name?: string | null;
  phone?: string | null;
  baby_name?: string | null;
  baby_birthdate?: string | null;
  baby_gender?: string | null;
  language?: string | null;
  avatar_url?: string | null;
  notification_prefs?: Record<string, boolean> | null;
}

function mapRow(row: ProfileRow | null): MyProfile {
  return {
    name: row?.name ?? null,
    phone: row?.phone ?? null,
    babyName: row?.baby_name ?? null,
    babyBirthdate: row?.baby_birthdate ?? null,
    babyGender: (row?.baby_gender as BabyGender) ?? null,
    language: (row?.language as Locale) ?? null,
    avatarUrl: row?.avatar_url ?? null,
    notificationPrefs:
      row?.notification_prefs && typeof row.notification_prefs === "object"
        ? row.notification_prefs
        : {},
  };
}

/**
 * The signed-in user's profile. `ready: false` means the extended columns are
 * missing (supabase/profile.sql not run) — base fields still load.
 */
export async function fetchMyProfile(): Promise<{ profile: MyProfile | null; ready: boolean }> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: session } = await supabase.auth.getUser();
    const uid = session?.user?.id;
    if (!uid) return { profile: null, ready: true };

    const res = await supabase.from("profiles").select(FULL_SELECT).eq("id", uid).maybeSingle();
    if (res.error && isMissingColumn(res.error.message)) {
      /* profile.sql not run yet — fall back to the base columns. */
      const retry = await supabase.from("profiles").select(BASE_SELECT).eq("id", uid).maybeSingle();
      if (retry.error) throw retry.error;
      return { profile: mapRow(retry.data as unknown as ProfileRow | null), ready: false };
    }
    if (res.error) throw res.error;
    return { profile: mapRow(res.data as unknown as ProfileRow | null), ready: true };
  } catch (e) {
    console.warn("[profile] fetch failed:", (e as Error).message);
    return { profile: null, ready: true };
  }
}

/**
 * Save profile fields (own row; UPSERT because accounts created before the
 * signup trigger may have no profiles row yet). Only the provided keys are
 * written — other columns stay untouched.
 */
export async function updateMyProfile(patch: Partial<MyProfile>): Promise<{ error?: string }> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: session } = await supabase.auth.getUser();
    const uid = session?.user?.id;
    if (!uid) return { error: "You must be signed in." };

    const row: Record<string, unknown> = { id: uid };
    if (patch.name !== undefined) row.name = patch.name?.trim() || null;
    if (patch.phone !== undefined) row.phone = patch.phone?.replace(/\s/g, "") || null;
    if (patch.babyName !== undefined) row.baby_name = patch.babyName?.trim() || null;
    if (patch.babyBirthdate !== undefined) {
      const d = patch.babyBirthdate;
      if (d && d > new Date().toISOString().slice(0, 10)) {
        return { error: "Baby's birth date can't be in the future." };
      }
      row.baby_birthdate = d || null;
    }
    if (patch.babyGender !== undefined) {
      row.baby_gender = ["boy", "girl", "na"].includes(patch.babyGender ?? "") ? patch.babyGender : null;
    }
    if (patch.language !== undefined) {
      row.language = ["en", "ka", "ru", "tr"].includes(patch.language ?? "") ? patch.language : null;
    }
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl || null;
    if (patch.notificationPrefs !== undefined) row.notification_prefs = patch.notificationPrefs;

    const { error } = await supabase.from("profiles").upsert(row);
    if (error) {
      if (isMissingColumn(error.message)) {
        return { error: "Profile upgrades aren't installed yet — run supabase/profile.sql in the Supabase SQL Editor." };
      }
      return { error: error.message };
    }
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Admin-uploaded preset avatar URLs (settings key, public read). [] on any error. */
export async function fetchAvatarPresets(): Promise<string[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "avatar_presets")
      .maybeSingle();
    if (error || !data) return [];
    const list = data.value;
    return Array.isArray(list) ? list.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}
