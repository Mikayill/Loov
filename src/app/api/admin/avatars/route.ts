/**
 * /api/admin/avatars — preset avatar management. Admin only (404 otherwise).
 *
 *  GET             → { avatars: string[] } (the settings "avatar_presets" list)
 *  DELETE { url }  → remove from the list + delete the storage object
 *
 * Customers only ever READ this list (account page picker) — uploads happen
 * via /api/admin/upload with kind=avatar.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function readPresets(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>) {
  const { data, error } = await admin
    .from("settings").select("value").eq("key", "avatar_presets").maybeSingle();
  if (error) return null;
  return Array.isArray(data?.value) ? (data.value as string[]) : [];
}

export async function GET() {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const avatars = await readPresets(admin);
  if (avatars === null) return NextResponse.json({ avatars: [], ready: false });
  return NextResponse.json({ avatars, ready: true });
}

export async function DELETE(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const url = String(body.url ?? "");
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`;
  if (!url.startsWith(prefix)) {
    return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
  }

  const list = await readPresets(admin);
  if (list === null) return NextResponse.json({ error: "Settings table missing — run supabase/profile.sql" }, { status: 500 });

  const next = list.filter((u) => u !== url);
  const { error: sErr } = await admin
    .from("settings")
    .upsert({ key: "avatar_presets", value: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  /* Best-effort storage cleanup — the list is the source of truth. */
  const path = url.slice(prefix.length);
  await admin.storage.from("avatars").remove([path]);

  await writeAudit({ actorEmail: guard.email, action: "settings.avatar.remove", entity: "settings", entityId: "avatar_presets" });
  return NextResponse.json({ ok: true, avatars: next });
}
