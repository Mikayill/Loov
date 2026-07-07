/** /api/admin/reviews — list / hide / delete customer reviews. Admin only. */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const { data, error } = await admin
    .from("reviews")
    .select("id, product_id, rating, body, show_name, author_name, status, created_at, admin_reply, admin_reply_at, products(name)")
    .order("created_at", { ascending: false });
  if (error) {
    // Table not created yet → empty list, still 200 so the page renders.
    return NextResponse.json({ reviews: [], ready: false });
  }
  return NextResponse.json({ reviews: data ?? [], ready: true });
}

export async function PATCH(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const { id, status, adminReply } = body ?? {};
  if (!id) return NextResponse.json({ error: "Missing review id" }, { status: 400 });
  if (status !== undefined && status !== "published" && status !== "hidden") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (status === undefined && adminReply === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (adminReply !== undefined) {
    const reply = String(adminReply).trim().slice(0, 1000);
    update.admin_reply = reply || null;
    update.admin_reply_at = reply ? new Date().toISOString() : null;
  }

  const { error } = await admin.from("reviews").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (status !== undefined) {
    await writeAudit({ actorEmail: guard.email, action: "review.status", entity: "review", entityId: String(id), detail: { status } });
  }
  if (adminReply !== undefined) {
    await writeAudit({ actorEmail: guard.email, action: "review.reply", entity: "review", entityId: String(id) });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing review id" }, { status: 400 });
  const { error } = await admin.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit({ actorEmail: guard.email, action: "review.delete", entity: "review", entityId: id });
  return NextResponse.json({ ok: true });
}
