/** /api/admin/products — list / create / update / delete. Admin only. */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_TEMPLATES } from "@/lib/catalogTags";
import { notifyBackInStock, rowHasAnyStock } from "@/lib/email/backInStock";
import { deleteStorageUrls, removedUrls } from "@/lib/storageCleanup";

const IMAGE_BUCKET = "product-images";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "body", "blanket", "set", "towel", "romper", "bag",
  "bathrobe", "pajama", "dress", "pants", "outerwear",
  "shoes", "socks", "hat", "bib", "toy", "accessory",
];
const SEASONS = ["all", "spring", "summer", "autumn", "winter"];
const FABRICS = ["cotton", "muslin", "bamboo", "terry", "fleece", "wool", "other"];

/**
 * Category templates — a freshly created product is ALWAYS sellable.
 * (The old add-product flow created rows with colors=[] sizes=[], which
 * rendered an un-buyable product page — the "my product doesn't work" bug.)
 * Templates themselves live in src/lib/catalogTags.ts (single source of
 * truth, shared with the admin UI's canonical color/size pickers).
 */

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Fields a PATCH/POST may set, with light validation. Returns a DB-shaped row or an error string. */
function sanitize(body: Record<string, unknown>, partial: boolean): Record<string, unknown> | string {
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => { out[k] = v; };

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) return "Name is required";
    set("name", body.name.trim());
  } else if (!partial) return "Name is required";

  if (body.price !== undefined) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0 || p > 100000) return "Invalid price";
    set("price", p);
  } else if (!partial) return "Price is required";

  if (body.category !== undefined) {
    if (!CATEGORIES.includes(String(body.category))) return "Invalid category";
    set("category", body.category);
  } else if (!partial) return "Category is required";

  if (body.stock !== undefined) {
    const s = Number(body.stock);
    if (!Number.isInteger(s) || s < 0 || s > 100000) return "Invalid stock";
    set("stock", s);
  }
  if (body.description !== undefined) set("description", String(body.description));
  // ── new: per-locale name/description (blank = falls back to English) ──
  if (body.nameKa !== undefined) set("name_ka", String(body.nameKa).trim().slice(0, 200) || null);
  if (body.nameRu !== undefined) set("name_ru", String(body.nameRu).trim().slice(0, 200) || null);
  if (body.nameTr !== undefined) set("name_tr", String(body.nameTr).trim().slice(0, 200) || null);
  if (body.descriptionKa !== undefined) set("description_ka", String(body.descriptionKa).trim() || null);
  if (body.descriptionRu !== undefined) set("description_ru", String(body.descriptionRu).trim() || null);
  if (body.descriptionTr !== undefined) set("description_tr", String(body.descriptionTr).trim() || null);
  if (body.emoji !== undefined) set("emoji", String(body.emoji).slice(0, 8));
  if (body.cardColor !== undefined) set("card_color", String(body.cardColor).slice(0, 32));
  if (body.imageUrl !== undefined) set("image_url", body.imageUrl ? String(body.imageUrl) : null);
  if (body.isNew !== undefined) set("is_new", !!body.isNew);
  if (body.colors !== undefined && Array.isArray(body.colors))
    set("colors", body.colors.map(String).map((c: string) => c.trim()).filter(Boolean).slice(0, 24));
  if (body.sizes !== undefined && Array.isArray(body.sizes))
    set("sizes", body.sizes.map(String).map((s: string) => s.trim()).filter(Boolean).slice(0, 24));
  if (body.slug !== undefined && typeof body.slug === "string" && body.slug.trim())
    set("slug", slugify(body.slug));

  // ── new: discount ──
  if (body.discountPercent !== undefined) {
    const d = Number(body.discountPercent);
    if (!Number.isInteger(d) || d < 0 || d > 90) return "Discount must be a whole number 0–90";
    set("discount_percent", d);
  }
  // ── new: season ──
  if (body.season !== undefined) {
    if (!SEASONS.includes(String(body.season))) return "Invalid season";
    set("season", body.season);
  }
  // ── new: gallery photos (full array — used for remove/reorder) ──
  if (body.imageUrls !== undefined && Array.isArray(body.imageUrls)) {
    const urls = body.imageUrls.map(String).filter(Boolean).slice(0, 12);
    set("image_urls", urls);
    set("image_url", urls[0] ?? null); // keep primary in sync
  }
  // ── new: editable highlight bullets ──
  if (body.features !== undefined && Array.isArray(body.features))
    set("features", body.features.map(String).map((f: string) => f.trim()).filter(Boolean).slice(0, 20));
  // ── new: Materials & Care tab (empty string clears → falls back to defaults) ──
  if (body.material !== undefined) set("material", String(body.material).trim().slice(0, 120) || null);
  if (body.weight !== undefined) set("weight", String(body.weight).trim().slice(0, 120) || null);
  if (body.certification !== undefined) set("certification", String(body.certification).trim().slice(0, 120) || null);
  if (body.origin !== undefined) set("origin", String(body.origin).trim().slice(0, 120) || null);
  if (body.careInstructions !== undefined && Array.isArray(body.careInstructions))
    set("care_instructions", body.careInstructions.map(String).map((c: string) => c.trim()).filter(Boolean).slice(0, 20));
  // ── new: per-size color availability ──
  if (body.sizeColors !== undefined && body.sizeColors && typeof body.sizeColors === "object") {
    const clean: Record<string, string[]> = {};
    for (const [size, cols] of Object.entries(body.sizeColors as Record<string, unknown>)) {
      if (Array.isArray(cols)) clean[String(size)] = cols.map(String).filter(Boolean);
    }
    set("size_colors", clean);
  }
  // ── new: per-size prices (blank/0 = use base price) ──
  if (body.sizePrices !== undefined && body.sizePrices && typeof body.sizePrices === "object") {
    const clean: Record<string, number> = {};
    for (const [size, price] of Object.entries(body.sizePrices as Record<string, unknown>)) {
      const n = Number(price);
      if (Number.isFinite(n) && n > 0 && n <= 100000) clean[String(size)] = n;
    }
    set("size_prices", clean);
  }
  // ── new: per-(size,color) stock — blank/absent combo falls back to flat `stock` ──
  if (body.stockByVariant !== undefined && body.stockByVariant && typeof body.stockByVariant === "object") {
    const clean: Record<string, Record<string, number>> = {};
    for (const [size, cols] of Object.entries(body.stockByVariant as Record<string, unknown>)) {
      if (!cols || typeof cols !== "object") continue;
      const inner: Record<string, number> = {};
      for (const [color, val] of Object.entries(cols as Record<string, unknown>)) {
        const n = Number(val);
        if (Number.isInteger(n) && n >= 0 && n <= 100000) inner[String(color)] = n;
      }
      if (Object.keys(inner).length > 0) clean[String(size)] = inner;
    }
    set("stock_by_variant", clean);
  }
  // ── new: fabric (normalized slug for the storefront filter) ──
  if (body.fabric !== undefined) {
    const f = String(body.fabric ?? "").trim();
    if (!f) set("fabric", null);
    else if (!FABRICS.includes(f)) return "Invalid fabric";
    else set("fabric", f);
  }

  return out;
}

export async function GET() {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const { data, error } = await admin.from("products").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const products = (data ?? []).sort((a, b) => Number(a.id) - Number(b.id));
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const clean = sanitize(body, false);
  if (typeof clean === "string") return NextResponse.json({ error: clean }, { status: 400 });

  // Next numeric id + a unique slug.
  const { data: ids } = await admin.from("products").select("id");
  const nextId = String(Math.max(0, ...(ids ?? []).map((r) => Number(r.id) || 0)) + 1);
  const baseSlug = (clean.slug as string) || slugify(clean.name as string);
  clean.slug = `${baseSlug}-${nextId}`;
  clean.id = nextId;
  if (clean.emoji === undefined) clean.emoji = "🍼";
  if (clean.card_color === undefined) clean.card_color = "#EAE4DC";
  if (clean.stock === undefined) clean.stock = 0;

  // Category template: never create an unsellable product (no colors/sizes).
  const tpl = CATEGORY_TEMPLATES[clean.category as string];
  if (tpl) {
    if (!Array.isArray(clean.colors) || (clean.colors as string[]).length === 0) clean.colors = tpl.colors;
    if (!Array.isArray(clean.sizes) || (clean.sizes as string[]).length === 0) clean.sizes = tpl.sizes;
    if (clean.fabric === undefined || clean.fabric === null) clean.fabric = tpl.fabric;
  }

  let { error } = await admin.from("products").insert(clean);
  // If the size-prices migration hasn't been run yet, retry without the new
  // columns so creating a product NEVER fails because of a missing migration.
  if (error && /column|schema cache/i.test(error.message) && /fabric|size_prices/i.test(error.message)) {
    console.warn("[admin/products] fabric/size_prices columns missing — run supabase/size-prices.sql. Creating without them.");
    delete clean.fabric;
    delete clean.size_prices;
    ({ error } = await admin.from("products").insert(clean));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit({ actorEmail: guard.email, action: "product.create", entity: "product", entityId: nextId, detail: { name: clean.name } });
  return NextResponse.json({ ok: true, id: nextId });
}

export async function PATCH(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  const clean = sanitize(body, true);
  if (typeof clean === "string") return NextResponse.json({ error: clean }, { status: 400 });
  if (Object.keys(clean).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  // Snapshot stock BEFORE the edit so we can fire the back-in-stock waitlist
  // only on a real out-of-stock → in-stock transition.
  let wasOutOfStock = false;
  const touchesStock = clean.stock !== undefined || clean.stock_by_variant !== undefined;
  if (touchesStock) {
    const { data: before } = await admin
      .from("products")
      .select("stock, stock_by_variant, colors, sizes")
      .eq("id", String(id))
      .maybeSingle();
    if (before) wasOutOfStock = !rowHasAnyStock(before);
  }

  // Snapshot the gallery BEFORE the edit — any photo dropped from the new
  // `image_urls` array gets deleted from Storage after the write succeeds
  // (best-effort; every upload so far only ever added files and left the
  // replaced/removed ones behind).
  let oldImageUrls: string[] = [];
  if (clean.image_urls !== undefined) {
    const { data: before } = await admin
      .from("products")
      .select("image_urls, image_url")
      .eq("id", String(id))
      .maybeSingle();
    oldImageUrls = [...(before?.image_urls ?? []), before?.image_url].filter(Boolean) as string[];
  }

  let { error } = await admin.from("products").update(clean).eq("id", String(id));
  // If supabase/product-i18n.sql hasn't been run yet, retry without those
  // columns so unrelated edits (price, stock, colors…) never fail because of it.
  if (error && /column|schema cache/i.test(error.message) && /name_ka|name_ru|name_tr|description_ka|description_ru|description_tr/i.test(error.message)) {
    console.warn("[admin/products] name_*/description_* columns missing — run supabase/product-i18n.sql. Updating without them.");
    const i18nKeys = ["name_ka", "name_ru", "name_tr", "description_ka", "description_ru", "description_tr"];
    for (const k of i18nKeys) delete clean[k];
    ({ error } = await admin.from("products").update(clean).eq("id", String(id)));
  }
  // Same for supabase/variant-stock.sql (stock_by_variant column).
  if (error && /column|schema cache/i.test(error.message) && /stock_by_variant/i.test(error.message)) {
    console.warn("[admin/products] stock_by_variant column missing — run supabase/variant-stock.sql. Updating without it.");
    delete clean.stock_by_variant;
    ({ error } = await admin.from("products").update(clean).eq("id", String(id)));
  }
  if (Object.keys(clean).length === 0) return NextResponse.json({ error: "Required migration hasn't been run yet — nothing else to update" }, { status: 400 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit({ actorEmail: guard.email, action: "product.update", entity: "product", entityId: String(id), detail: clean });

  // Restock just happened → email the back-in-stock waitlist (non-blocking).
  if (touchesStock && wasOutOfStock) {
    const { data: after } = await admin
      .from("products")
      .select("stock, stock_by_variant, colors, sizes")
      .eq("id", String(id))
      .maybeSingle();
    if (after && rowHasAnyStock(after)) {
      await notifyBackInStock(admin, String(id));
    }
  }

  // Clean up any photo that just fell out of the gallery (removed, or
  // replaced as the primary) — best-effort, never blocks the response.
  if (clean.image_urls !== undefined && oldImageUrls.length > 0) {
    const newUrls = clean.image_urls as string[];
    await deleteStorageUrls(admin, IMAGE_BUCKET, removedUrls(oldImageUrls, newUrls));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });

  // Snapshot the gallery so its Storage files can be cleaned up once the row
  // is gone (best-effort — a failed delete just leaves the row gone as before).
  const { data: before } = await admin
    .from("products")
    .select("image_urls, image_url")
    .eq("id", id)
    .maybeSingle();
  const imageUrls = [...(before?.image_urls ?? []), before?.image_url].filter(Boolean) as string[];

  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit({ actorEmail: guard.email, action: "product.delete", entity: "product", entityId: id });
  await deleteStorageUrls(admin, IMAGE_BUCKET, imageUrls);
  return NextResponse.json({ ok: true });
}
