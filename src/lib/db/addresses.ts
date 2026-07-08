"use client";

/**
 * Saved addresses — browser client + RLS (own rows only).
 * Requires supabase/addresses.sql; every call degrades gracefully when the
 * table doesn't exist yet (ready: false / error strings, never a throw).
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface SavedAddress {
  id: string;
  label: string; // Home | Work | Other (canonical English, translated at render)
  firstName: string;
  lastName: string;
  street: string;
  region: string;
  district: string;
  city: string;
  zip: string;
  phone: string;
  isDefault: boolean;
}

interface AddressRow {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  street: string;
  region: string;
  district: string;
  city: string;
  zip: string;
  phone: string;
  is_default: boolean;
}

function mapRow(r: AddressRow): SavedAddress {
  return {
    id: r.id,
    label: r.label,
    firstName: r.first_name,
    lastName: r.last_name,
    street: r.street,
    region: r.region,
    district: r.district,
    city: r.city,
    zip: r.zip,
    phone: r.phone,
    isDefault: !!r.is_default,
  };
}

function missingTable(msg: string): boolean {
  return /relation .*addresses.* does not exist|addresses.*schema cache/i.test(msg);
}

export async function listAddresses(): Promise<{ addresses: SavedAddress[]; ready: boolean }> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("addresses")
      .select("id, label, first_name, last_name, street, region, district, city, zip, phone, is_default")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) {
      if (missingTable(error.message)) {
        console.warn("[addresses] run supabase/addresses.sql in the SQL editor");
        return { addresses: [], ready: false };
      }
      throw error;
    }
    return { addresses: (data as AddressRow[] ?? []).map(mapRow), ready: true };
  } catch (e) {
    console.warn("[addresses] list failed:", (e as Error).message);
    return { addresses: [], ready: false };
  }
}

export async function addAddress(
  a: Omit<SavedAddress, "id" | "isDefault"> & { isDefault?: boolean }
): Promise<{ address?: SavedAddress; error?: string }> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return { error: "Not signed in" };
    const { data, error } = await supabase
      .from("addresses")
      .insert({
        user_id: userId,
        label: ["Home", "Work", "Other"].includes(a.label) ? a.label : "Other",
        first_name: a.firstName.trim(),
        last_name: a.lastName.trim(),
        street: a.street.trim(),
        region: a.region.trim(),
        district: a.district.trim(),
        city: a.city.trim(),
        zip: a.zip.trim(),
        phone: a.phone.trim(),
        is_default: !!a.isDefault,
      })
      .select("id, label, first_name, last_name, street, region, district, city, zip, phone, is_default")
      .single();
    if (error) throw error;
    return { address: mapRow(data as AddressRow) };
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("[addresses] add failed:", msg);
    return { error: missingTable(msg) ? "Address book isn't set up yet." : msg };
  }
}

export async function removeAddress(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) throw error;
    return {};
  } catch (e) {
    console.warn("[addresses] remove failed:", (e as Error).message);
    return { error: (e as Error).message };
  }
}

export async function setDefaultAddress(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createSupabaseBrowserClient();
    // Clear the old default first (partial unique index allows only one).
    const { error: clearErr } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("is_default", true);
    if (clearErr) throw clearErr;
    const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    if (error) throw error;
    return {};
  } catch (e) {
    console.warn("[addresses] set default failed:", (e as Error).message);
    return { error: (e as Error).message };
  }
}
