/**
 * POST /api/admin/video-upload-url — signed DIRECT-to-Storage upload for
 * product videos. Vercel route handlers cap request bodies (~4.5MB), so the
 * video never passes through us: the admin browser asks for a signed slot
 * here, then uploads straight to Supabase Storage with it.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";
const ALLOWED_EXT = ["mp4", "webm"] as const;

export async function POST(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId ?? "").trim();
  const ext = String(body.ext ?? "").toLowerCase();
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  if (!ALLOWED_EXT.includes(ext as (typeof ALLOWED_EXT)[number])) {
    return NextResponse.json({ error: "Only .mp4 / .webm videos are supported" }, { status: 400 });
  }

  const path = `videos/${productId}/${Date.now()}.${ext}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create upload slot" }, { status: 500 });
  }
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, path: data.path, token: data.token, publicUrl: pub.publicUrl });
}
