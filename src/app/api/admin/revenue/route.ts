/** GET /api/admin/revenue?range=today|week|month|year|all — time-bucketed sales. Admin only. */
import { NextRequest, NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Range = "today" | "week" | "month" | "year" | "all";
interface Bucket { start: number; end: number; label: string }

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfMonth(d: Date) { const x = new Date(d); x.setDate(1); x.setHours(0, 0, 0, 0); return x; }

/** Build the bucket edges for a range, plus the matching previous period. */
function plan(range: Range, now: Date, firstOrder: Date): { buckets: Bucket[]; prevStart: number; prevEnd: number } {
  const B: Bucket[] = [];
  if (range === "today") {
    const base = startOfDay(now);
    for (let h = 0; h < 24; h++) {
      const s = new Date(base); s.setHours(h);
      const e = new Date(base); e.setHours(h + 1);
      B.push({ start: +s, end: +e, label: String(h).padStart(2, "0") });
    }
    const prevStart = +startOfDay(new Date(+base - 86400000));
    return { buckets: B, prevStart, prevEnd: +base };
  }
  if (range === "week" || range === "month") {
    const days = range === "week" ? 7 : 30;
    const base = startOfDay(now);
    for (let i = days - 1; i >= 0; i--) {
      const s = new Date(+base - i * 86400000);
      const e = new Date(+s + 86400000);
      B.push({ start: +s, end: +e, label: s.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) });
    }
    const rangeStart = B[0].start;
    return { buckets: B, prevStart: rangeStart - days * 86400000, prevEnd: rangeStart };
  }
  if (range === "year") {
    const base = startOfMonth(now);
    for (let i = 11; i >= 0; i--) {
      const s = new Date(base); s.setMonth(base.getMonth() - i);
      const e = new Date(s); e.setMonth(s.getMonth() + 1);
      B.push({ start: +s, end: +e, label: s.toLocaleDateString("en-GB", { month: "short" }) });
    }
    const prevEnd = B[0].start;
    const prevStartD = new Date(B[0].start); prevStartD.setMonth(prevStartD.getMonth() - 12);
    return { buckets: B, prevStart: +prevStartD, prevEnd };
  }
  // all — monthly from the first order to now
  const start = startOfMonth(firstOrder);
  const end = startOfMonth(now);
  const cur = new Date(start);
  while (cur <= end) {
    const s = new Date(cur);
    const e = new Date(cur); e.setMonth(e.getMonth() + 1);
    B.push({ start: +s, end: +e, label: s.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) });
    cur.setMonth(cur.getMonth() + 1);
  }
  if (B.length === 0) B.push({ start: +start, end: +now, label: start.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) });
  return { buckets: B, prevStart: 0, prevEnd: 0 };
}

export async function GET(req: NextRequest) {
  const guard = await adminApiGuard();
  if (guard instanceof NextResponse) return guard;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const rangeParam = (new URL(req.url).searchParams.get("range") ?? "week") as Range;
  const range: Range = ["today", "week", "month", "year", "all"].includes(rangeParam) ? rangeParam : "week";

  // Cancelled orders don't count as revenue.
  const { data, error } = await admin
    .from("orders")
    .select("total, created_at, status")
    .neq("status", "cancelled")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []).map((o) => ({ t: +new Date(o.created_at), v: Number(o.total) }));
  const now = new Date();
  const firstOrder = orders.length ? new Date(orders[0].t) : now;

  const { buckets, prevStart, prevEnd } = plan(range, now, firstOrder);
  const series = buckets.map((b) => {
    const inBucket = orders.filter((o) => o.t >= b.start && o.t < b.end);
    return { label: b.label, value: inBucket.reduce((s, o) => s + o.v, 0), orders: inBucket.length, ts: b.start };
  });

  const rangeTotal = series.reduce((s, p) => s + p.value, 0);
  const rangeOrders = series.reduce((s, p) => s + p.orders, 0);
  const prevTotal = prevEnd > prevStart
    ? orders.filter((o) => o.t >= prevStart && o.t < prevEnd).reduce((s, o) => s + o.v, 0)
    : null;
  const deltaPct = prevTotal && prevTotal > 0 ? ((rangeTotal - prevTotal) / prevTotal) * 100 : null;

  const peak = series.reduce((m, p) => (p.value > m.value ? p : m), { label: "", value: 0, orders: 0, ts: 0 });

  return NextResponse.json({
    range,
    series,
    rangeTotal,
    rangeOrders,
    prevTotal,
    deltaPct,
    avgOrder: rangeOrders > 0 ? rangeTotal / rangeOrders : 0,
    peak: peak.value > 0 ? { label: peak.label, value: peak.value } : null,
  });
}
