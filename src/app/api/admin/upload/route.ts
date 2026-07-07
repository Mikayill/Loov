/** POST /api/admin/upload — upload a product photo to Storage. Admin only. */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const productId = String(form?.get("productId") ?? "");
  const bundleSlug = String(form?.get("bundleSlug") ?? "");
  const kind = String(form?.get("kind") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Only JPG, PNG, WEBP or AVIF" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Max 5 MB" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");

  // ── Preset avatar (FAZ 7): "avatars" bucket + append to the settings list ──
  if (kind === "avatar") {
    const path = `presets/${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: aErr } = await admin.storage
      .from("avatars")
      .upload(path, buf, { contentType: file.type, upsert: false });
    if (aErr) {
      const msg = /bucket/i.test(aErr.message)
        ? "The avatars bucket is missing — run supabase/profile.sql in the SQL Editor."
        : aErr.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);

    const { data: row } = await admin
      .from("settings").select("value").eq("key", "avatar_presets").maybeSingle();
    const list: string[] = Array.isArray(row?.value) ? row.value : [];
    const { error: sErr } = await admin
      .from("settings")
      .upsert({ key: "avatar_presets", value: [...list, pub.publicUrl], updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (sErr) {
      const msg = /relation .*settings|schema cache/i.test(sErr.message)
        ? "The settings table is missing — run supabase/profile.sql in the SQL Editor."
        : sErr.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    await writeAudit({ actorEmail: guard.email, action: "settings.avatar.add", entity: "settings", entityId: "avatar_presets" });
    return NextResponse.json({ ok: true, imageUrl: pub.publicUrl });
  }
  const path = bundleSlug
    ? `bundles/${bundleSlug}/${Date.now()}.${ext}`
    : `${productId || "misc"}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const imageUrl = pub.publicUrl;

  // ── Bundle photo: set bundles.image_url and return ──
  if (bundleSlug) {
    const { error: bErr } = await admin
      .from("bundles")
      .update({ image_url: imageUrl })
      .eq("slug", bundleSlug);
    if (bErr) {
      const msg = /image_url|schema cache/i.test(bErr.message)
        ? "The bundles.image_url column is missing — re-run supabase/bundles.sql in the SQL Editor."
        : bErr.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    await writeAudit({ actorEmail: guard.email, action: "bundle.image", entity: "bundle", entityId: bundleSlug });
    return NextResponse.json({ ok: true, imageUrl });
  }

  // Append to the product's photo gallery (keep the first photo as the primary).
  let imageUrls: string[] = [imageUrl];
  if (productId) {
    const { data: current } = await admin
      .from("products")
      .select("image_urls, image_url")
      .eq("id", productId)
      .maybeSingle();
    const existing: string[] = (current?.image_urls ?? []).filter(Boolean);
    // Migrate a legacy single image_url into the gallery if present and not already there.
    if (existing.length === 0 && current?.image_url) existing.push(current.image_url);
    imageUrls = [...existing, imageUrl];
    await admin
      .from("products")
      .update({ image_urls: imageUrls, image_url: imageUrls[0] })
      .eq("id", productId);
    await writeAudit({ actorEmail: guard.email, action: "product.image", entity: "product", entityId: productId });
  }

  return NextResponse.json({ ok: true, imageUrl, imageUrls });
}
