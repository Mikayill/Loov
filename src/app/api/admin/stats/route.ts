/** GET /api/admin/stats — dashboard numbers. Admin only. */
import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const [{ data: orders }, { data: products }, returnsRes] = await Promise.all([
    admin.from("orders").select("order_number, first_name, last_name, status, total, created_at").order("created_at", { ascending: false }),
    admin.from("products").select("id, name, price, stock, emoji").order("id"),
    // Table only exists after supabase/returns.sql — count() errors are treated as 0.
    admin.from("returns").select("id", { count: "exact", head: true }).eq("status", "requested"),
  ]);
  const pendingReturns = returnsRes.error ? 0 : (returnsRes.count ?? 0);

  const allOrders = orders ?? [];
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

  // Cancelled orders don't count toward revenue or order totals
  // (matches the revenue chart, which already excludes them).
  const activeOrders = allOrders.filter((o) => o.status !== "cancelled");
  const cancelledCount = allOrders.length - activeOrders.length;

  const revenue = activeOrders.reduce((s, o) => s + Number(o.total), 0);
  const todayOrders = activeOrders.filter((o) => new Date(o.created_at) >= startOfToday);
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
  const pending = activeOrders.filter((o) => o.status === "pending" || o.status === "processing");
  const lowStock = (products ?? [])
    .filter((p) => p.stock !== null && Number(p.stock) <= 5)
    .sort((a, b) => Number(a.stock) - Number(b.stock));

  return NextResponse.json({
    revenue,
    todayRevenue,
    ordersTotal: activeOrders.length,
    cancelledCount,
    todayOrders: todayOrders.length,
    pendingCount: pending.length,
    pendingReturns,
    productCount: (products ?? []).length,
    lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, emoji: p.emoji })),
    recentOrders: allOrders.slice(0, 6).map((o) => ({
      orderNumber: o.order_number,
      customer: `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim(),
      status: o.status,
      total: Number(o.total),
      createdAt: o.created_at,
    })),
  });
}
