/**
 * GET  /api/admin/unread — counts of orders/returns/reviews created since this
 *      admin last visited that section (sidebar badge). Admin only.
 * PATCH /api/admin/unread — mark a section as seen (resets its badge to 0).
 *
 * Needs supabase/notifications.sql (admins.last_seen_*). Degrades to all-zero
 * with `ready: false` if the columns aren't there yet — never breaks the panel.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SECTIONS = ["orders", "returns", "reviews"] as const;
type Section = (typeof SECTIONS)[number];
const LAST_SEEN_COLUMN: Record<Section, string> = {
  orders: "last_seen_orders_at",
  returns: "last_seen_returns_at",
  reviews: "last_seen_reviews_at",
};

export async function GET() {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const { data: row, error } = await admin
    .from("admins")
    .select("last_seen_orders_at, last_seen_returns_at, last_seen_reviews_at")
    .eq("user_id", guard.id)
    .maybeSingle();

  // supabase/notifications.sql not run yet — no badges, but the panel still works.
  if (error) return NextResponse.json({ ready: false, orders: 0, returns: 0, reviews: 0 });

  async function countSince(table: string, since: string | null) {
    let q = admin!.from(table).select("id", { count: "exact", head: true });
    if (since) q = q.gt("created_at", since);
    const { count, error } = await q;
    return error ? 0 : (count ?? 0);
  }

  const [orders, returnsCount, reviews] = await Promise.all([
    countSince("orders", row?.last_seen_orders_at ?? null),
    countSince("returns", row?.last_seen_returns_at ?? null),
    countSince("reviews", row?.last_seen_reviews_at ?? null),
  ]);

  return NextResponse.json({ ready: true, orders, returns: returnsCount, reviews });
}

export async function PATCH(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const section = body.section as Section;
  if (!SECTIONS.includes(section)) return NextResponse.json({ error: "Invalid section" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const { error } = await admin
    .from("admins")
    .update({ [LAST_SEEN_COLUMN[section]]: new Date().toISOString() })
    .eq("user_id", guard.id);

  // Column may not exist yet (migration not run) — never break the UI over this.
  return NextResponse.json({ ok: !error });
}
