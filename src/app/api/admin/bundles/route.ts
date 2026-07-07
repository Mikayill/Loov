/**
 * /api/admin/bundles — list / read / create / update / delete. Admin only.
 *
 * Publish rule (server-enforced, the UI mirrors it): a bundle can only be
 * `active` when it has a photo, a description, a price > 0 and at least
 * TWO items. Half-built bundles can never reach the storefront.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

interface BundleItemInput {
  slug: string;
  label: string;
  quantity?: number;
}

/** Which publish requirements a row is missing (empty = publishable). */
function missingForLive(row: {
  image_url?: string | null;
  description?: string | null;
  bundle_price?: number;
  items?: BundleItemInput[] | null;
}): string[] {
  const missing: string[] = [];
  if (!row.image_url) missing.push("photo");
  if (!String(row.description ?? "").trim()) missing.push("description");
  if (!(Number(row.bundle_price) > 0)) missing.push("price");
  if (!Array.isArray(row.items) || row.items.length < 2) missing.push("items");
  return missing;
}

/** Validate + shape a bundle payload. Returns a DB row or an error string. */
function sanitize(body: Record<string, unknown>, partial: boolean): Record<string, unknown> | string {
  const out: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) return "Name is required";
    out.name = body.name.trim().slice(0, 120);
  } else if (!partial) return "Name is required";

  for (const key of ["subtitle", "tagline", "description"] as const) {
    if (body[key] !== undefined) out[key] = String(body[key]).trim().slice(0, 2000) || null;
  }
  if (body.cardColor !== undefined) out.card_color = String(body.cardColor).slice(0, 32) || "#EDE5D8";
  if (body.imageUrl !== undefined) out.image_url = body.imageUrl ? String(body.imageUrl) : null;

  for (const key of ["originalPrice", "bundlePrice"] as const) {
    if (body[key] !== undefined) {
      const n = Number(body[key]);
      if (!Number.isFinite(n) || n < 0 || n > 100000) return `Invalid ${key}`;
      out[key === "originalPrice" ? "original_price" : "bundle_price"] = n;
    }
  }

  if (body.isNew !== undefined) out.is_new = !!body.isNew;
  if (body.active !== undefined) out.active = !!body.active;
  if (body.sort !== undefined) {
    const s = Number(body.sort);
    if (Number.isInteger(s) && s >= 0 && s <= 9999) out.sort = s;
  }

  if (body.features !== undefined && Array.isArray(body.features))
    out.features = body.features.map(String).map((f: string) => f.trim()).filter(Boolean).slice(0, 20);

  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) return "Items must be a list";
    // Merge duplicates: the same product can appear only ONCE — quantities
    // add up. (Duplicate rows caused duplicate React keys on the storefront.)
    const merged = new Map<string, BundleItemInput>();
    for (const raw of body.items.slice(0, 24)) {
      const it = raw as Record<string, unknown>;
      const slug = String(it.slug ?? "").trim().slice(0, 120);
      const label = String(it.label ?? "").trim().slice(0, 120);
      if (!slug) continue; // never store slug-less rows
      const qty = Number(it.quantity);
      const q = Number.isInteger(qty) && qty >= 1 && qty <= 20 ? qty : 1;
      const existing = merged.get(slug);
      if (existing) {
        existing.quantity = Math.min(20, (existing.quantity ?? 1) + q);
      } else {
        merged.set(slug, { slug, label: label || slug, ...(q > 1 ? { quantity: q } : {}) });
      }
    }
    out.items = [...merged.values()].slice(0, 12).map((it) => ({
      ...it,
      ...((it.quantity ?? 1) > 1 ? { quantity: it.quantity } : {}),
    }));
  }

  return out;
}

export async function GET(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const slug = new URL(req.url).searchParams.get("slug");

  if (slug) {
    const { data, error } = await admin.from("bundles").select("*").eq("slug", slug).maybeSingle();
    if (error) return NextResponse.json({ bundle: null, ready: false });
    return NextResponse.json({ bundle: data ?? null, ready: true });
  }

  const { data, error } = await admin.from("bundles").select("*").order("sort").order("created_at");
  if (error) {
    // Table missing → tell the client so it can show the "run bundles.sql" hint.
    return NextResponse.json({ bundles: [], ready: false });
  }
  return NextResponse.json({ bundles: data ?? [], ready: true });
}

export async function POST(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Unique slug from the name.
  const base = slugify(name) || "bundle";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { data } = await admin.from("bundles").select("slug").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }

  // New bundles go to the end of the list and start HIDDEN (drafts).
  const { data: sorts } = await admin.from("bundles").select("sort");
  const nextSort = Math.max(0, ...(sorts ?? []).map((r) => Number(r.sort) || 0)) + 1;

  const { error } = await admin.from("bundles").insert({
    slug,
    name: name.slice(0, 120),
    active: false,
    sort: nextSort,
    items: [],
    features: [],
    original_price: 0,
    bundle_price: 0,
  });
  if (error) {
    if (/relation .*bundles|schema cache/i.test(error.message)) {
      return NextResponse.json({ error: "Bundles table missing — run supabase/bundles.sql first." }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await writeAudit({ actorEmail: guard.email, action: "bundle.create", entity: "bundle", entityId: slug, detail: { name } });
  return NextResponse.json({ ok: true, slug });
}

export async function PATCH(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const slug = String(body?.slug ?? "");
  if (!slug) return NextResponse.json({ error: "Missing bundle slug" }, { status: 400 });
  const clean = sanitize(body, true);
  if (typeof clean === "string") return NextResponse.json({ error: clean }, { status: 400 });
  if (Object.keys(clean).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  // ── Publish gate: turning Live ON requires a COMPLETE bundle ──
  const wantsLive =
    clean.active === true ||
    (clean.active === undefined && Object.keys(clean).length > 0);
  if (wantsLive) {
    const { data: current } = await admin.from("bundles").select("*").eq("slug", slug).maybeSingle();
    if (!current) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    const merged = { ...current, ...clean };
    // Only block when the bundle would END UP live.
    if (merged.active === true) {
      const missing = missingForLive(merged);
      if (missing.length > 0) {
        return NextResponse.json(
          { error: "This bundle can't go live yet — it's incomplete.", missing },
          { status: 400 }
        );
      }
    }
  }

  const { error } = await admin.from("bundles").update(clean).eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit({ actorEmail: guard.email, action: "bundle.update", entity: "bundle", entityId: slug, detail: clean });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing bundle slug" }, { status: 400 });
  const { error } = await admin.from("bundles").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit({ actorEmail: guard.email, action: "bundle.delete", entity: "bundle", entityId: slug });
  return NextResponse.json({ ok: true });
}
