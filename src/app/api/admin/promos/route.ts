/** /api/admin/promos — manage promo codes. Admin only. */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Z0-9]{3,20}$/;

function isMissingTable(msg: string) {
  return /relation .*promo_codes.* does not exist|promo_codes.*schema cache/i.test(msg);
}

/** Parse an expiry from the client: "" | null → no expiry; "YYYY-MM-DD" → end of that day. */
function parseExpiry(raw: unknown): { value: string | null; error?: string } {
  if (raw === undefined || raw === null || raw === "") return { value: null };
  const s = String(raw);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T23:59:59` : s);
  if (isNaN(d.getTime())) return { value: null, error: "Invalid expiry date" };
  return { value: d.toISOString() };
}

function parseLimit(raw: unknown): { value: number | null; error?: string } {
  if (raw === undefined || raw === null || raw === "") return { value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 1000000) return { value: null, error: "Usage limit must be a whole number ≥ 1 (or empty for unlimited)" };
  return { value: n };
}

export async function GET() {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const { data, error } = await admin
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    // Table missing → tell the client so it can show the "run promos.sql" hint.
    return NextResponse.json({ promos: [], ready: false });
  }
  return NextResponse.json({ promos: data ?? [], ready: true });
}

export async function POST(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  const type = body.type === "shipping" ? "shipping" : "percent";
  const value = type === "shipping" ? 0 : Number(body.value);

  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "Code must be 3–20 letters/digits (A–Z, 0–9)" }, { status: 400 });
  }
  if (type === "percent" && (!Number.isFinite(value) || value < 1 || value > 90)) {
    return NextResponse.json({ error: "Percent must be between 1 and 90" }, { status: 400 });
  }
  const expiry = parseExpiry(body.expiresAt);
  if (expiry.error) return NextResponse.json({ error: expiry.error }, { status: 400 });
  const limit = parseLimit(body.usageLimit);
  if (limit.error) return NextResponse.json({ error: limit.error }, { status: 400 });

  const { data, error } = await admin
    .from("promo_codes")
    .insert({ code, type, value, expires_at: expiry.value, usage_limit: limit.value, active: true })
    .select("*")
    .single();
  if (error) {
    if (/duplicate key|unique/i.test(error.message)) {
      return NextResponse.json({ error: `Code "${code}" already exists` }, { status: 409 });
    }
    if (isMissingTable(error.message)) {
      return NextResponse.json({ error: "Promo table missing — run supabase/promos.sql first." }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await writeAudit({
    actorEmail: guard.email,
    action: "promo.create",
    entity: "promo",
    entityId: code,
    detail: { type, value, expires_at: expiry.value, usage_limit: limit.value },
  });
  return NextResponse.json({ ok: true, promo: data });
}

export async function PATCH(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing promo id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.active !== undefined) patch.active = !!body.active;
  if (body.value !== undefined) {
    const v = Number(body.value);
    if (!Number.isFinite(v) || v < 0 || v > 90) {
      return NextResponse.json({ error: "Percent must be between 1 and 90" }, { status: 400 });
    }
    patch.value = v;
  }
  if (body.expiresAt !== undefined) {
    const expiry = parseExpiry(body.expiresAt);
    if (expiry.error) return NextResponse.json({ error: expiry.error }, { status: 400 });
    patch.expires_at = expiry.value;
  }
  if (body.usageLimit !== undefined) {
    const limit = parseLimit(body.usageLimit);
    if (limit.error) return NextResponse.json({ error: limit.error }, { status: 400 });
    patch.usage_limit = limit.value;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("promo_codes")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Promo not found" }, { status: 404 });

  await writeAudit({
    actorEmail: guard.email,
    action: "promo.update",
    entity: "promo",
    entityId: data.code as string,
    detail: patch,
  });
  return NextResponse.json({ ok: true, promo: data });
}

export async function DELETE(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Missing promo id" }, { status: 400 });

  const { data, error } = await admin
    .from("promo_codes")
    .delete()
    .eq("id", id)
    .select("code")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Promo not found" }, { status: 404 });

  await writeAudit({
    actorEmail: guard.email,
    action: "promo.delete",
    entity: "promo",
    entityId: data.code as string,
  });
  return NextResponse.json({ ok: true });
}
