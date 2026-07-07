/**
 * GET /api/admin/logs — unified activity feed. Admin only.
 * Merges three streams into one timeline:
 *   • orders   → new purchases (customer, total, status)
 *   • reviews  → new customer reviews
 *   • audit_log→ admin changes (products, settings, order status, etc.)
 */
import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface Event {
  id: string;
  kind: "order" | "review" | "admin";
  icon: string;
  title: string;
  subtitle: string;
  body?: string;
  actor: string;
  created_at: string;
}

const ADMIN_ICON: Record<string, string> = {
  "product.create": "➕",
  "product.update": "✏️",
  "product.delete": "🗑️",
  "product.image": "🖼️",
  "order.status": "🔄",
  "settings.update": "⚙️",
  "review.status": "👁️",
  "review.delete": "🗑️",
};

export async function GET() {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const events: Event[] = [];

  // ── Orders (purchases) ──
  const { data: orders } = await admin
    .from("orders")
    .select("id, order_number, first_name, last_name, email, total, status, created_at")
    .order("created_at", { ascending: false })
    .limit(80);
  for (const o of orders ?? []) {
    events.push({
      id: `order-${o.id}`,
      kind: "order",
      icon: "🛒",
      title: `New order ${o.order_number}`,
      subtitle: `${o.first_name ?? ""} ${o.last_name ?? ""} · ${Number(o.total).toLocaleString()} ₾ · ${o.status}`,
      body: o.email ?? undefined,
      actor: "customer",
      created_at: o.created_at,
    });
  }

  // ── Reviews ── (table may not exist yet)
  const { data: reviews, error: revErr } = await admin
    .from("reviews")
    .select("id, rating, body, author_name, show_name, created_at, products(name)")
    .order("created_at", { ascending: false })
    .limit(80);
  if (!revErr) {
    for (const r of reviews ?? []) {
      const prod = (r.products as { name?: string } | null)?.name;
      const who = r.show_name ? (r.author_name ?? "Customer") : "Anonymous";
      events.push({
        id: `review-${r.id}`,
        kind: "review",
        icon: "⭐",
        title: `New review · ${"★".repeat(r.rating)}`,
        subtitle: `${prod ?? "product"} · ${who}`,
        body: String(r.body ?? "").slice(0, 140),
        actor: who,
        created_at: r.created_at,
      });
    }
  }

  // ── Admin actions ──
  const { data: audits } = await admin
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(120);
  for (const a of audits ?? []) {
    events.push({
      id: `audit-${a.id}`,
      kind: "admin",
      icon: ADMIN_ICON[a.action] ?? "•",
      title: a.action + (a.entity_id ? ` · ${a.entity_id}` : ""),
      subtitle: a.detail ? JSON.stringify(a.detail).slice(0, 160) : "",
      actor: a.actor_email ?? "system",
      created_at: a.created_at,
    });
  }

  // Merge, newest first.
  events.sort((x, y) => +new Date(y.created_at) - +new Date(x.created_at));

  return NextResponse.json({ events: events.slice(0, 200) });
}
