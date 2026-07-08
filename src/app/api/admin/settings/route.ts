/** /api/admin/settings — read & update store-wide settings. Admin only. */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SETTINGS,
  FIELD_TO_KEY,
  settingsFromRows,
  type StoreSettings,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Bounds so an admin can't set nonsense that breaks the storefront. */
const LIMITS: Record<Exclude<keyof StoreSettings, "expressEnabled" | "whatsappNumber">, { min: number; max: number; int?: boolean }> = {
  pointsPerGel: { min: 0, max: 100 },
  freeShippingThreshold: { min: 0, max: 100000 },
  newBadgeDays: { min: 0, max: 365, int: true },
  standardShippingPrice: { min: 0, max: 1000 },
  expressPrice: { min: 0, max: 1000 },
};

export async function GET() {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const { data, error } = await admin.from("settings").select("key, value");
  if (error) {
    // Table not created yet → return defaults so the page still works.
    return NextResponse.json({ settings: DEFAULT_SETTINGS, seeded: false });
  }
  return NextResponse.json({ settings: settingsFromRows(data ?? []), seeded: true });
}

export async function PATCH(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const updates: { key: string; value: number | boolean | string }[] = [];

  for (const field of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    if (body[field] === undefined) continue;
    const n = Number(body[field]);
    const { min, max, int } = LIMITS[field];
    if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) {
      return NextResponse.json({ error: `Invalid value for ${field}` }, { status: 400 });
    }
    updates.push({ key: FIELD_TO_KEY[field], value: n });
  }
  // Boolean toggle (Express Delivery on/off).
  if (body.expressEnabled !== undefined) {
    updates.push({ key: FIELD_TO_KEY.expressEnabled, value: !!body.expressEnabled });
  }
  // WhatsApp number — digits only, empty allowed (hides WhatsApp sitewide).
  if (body.whatsappNumber !== undefined) {
    const digits = String(body.whatsappNumber ?? "").replace(/\D/g, "");
    if (digits.length > 0 && (digits.length < 8 || digits.length > 15)) {
      return NextResponse.json({ error: "WhatsApp number must be 8–15 digits (or empty to hide)" }, { status: 400 });
    }
    updates.push({ key: FIELD_TO_KEY.whatsappNumber, value: digits });
  }
  if (updates.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const rows = updates.map((u) => ({ key: u.key, value: u.value, updated_at: new Date().toISOString() }));
  const { error } = await admin.from("settings").upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    actorEmail: guard.email,
    action: "settings.update",
    entity: "settings",
    detail: Object.fromEntries(updates.map((u) => [u.key, u.value])),
  });
  return NextResponse.json({ ok: true });
}
