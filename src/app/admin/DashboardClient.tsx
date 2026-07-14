"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import RevenueChart from "./RevenueChart";

interface Stats {
  revenue: number;
  todayRevenue: number;
  ordersTotal: number;
  cancelledCount: number;
  todayOrders: number;
  pendingCount: number;
  pendingReturns: number;
  productCount: number;
  lowStock: { id: string; name: string; stock: number; emoji: string }[];
  recentOrders: { orderNumber: string; customer: string; status: string; total: number; createdAt: string }[];
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#FFF8E8] text-[#A06820]",
  processing: "bg-[#EAF0F8] text-[#2A5A8E]",
  shipped: "bg-[#EAF0F8] text-[#2A5A8E]",
  delivered: "bg-accent-soft text-accent-deep",
  cancelled: "bg-danger-soft text-danger",
};

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setStats(d)))
      .catch(() => setError("Could not load stats"));
  }, []);

  if (error) return <p className="text-red-500 font-semibold">{error}</p>;
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: "Revenue today", value: formatPrice(stats.todayRevenue), sub: `${stats.todayOrders} orders`, icon: "💰" },
    { label: "All-time orders", value: String(stats.ordersTotal), sub: `${formatPrice(stats.revenue)} total${stats.cancelledCount ? ` · ${stats.cancelledCount} cancelled` : ""}`, icon: "📈" },
    { label: "Pending orders", value: String(stats.pendingCount), sub: "need action", icon: "⏳", href: "/admin/orders?status=pending" },
    // Only shown when a return is actually waiting — keeps the row at 4 cards otherwise.
    ...(stats.pendingReturns > 0
      ? [{ label: "Return requests", value: String(stats.pendingReturns), sub: "waiting for review", icon: "↩️", href: "/admin/returns" }]
      : []),
    { label: "Products", value: String(stats.productCount), sub: "in catalog", icon: "🏷️", href: "/admin/products" },
  ];

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-extrabold text-ink mb-1">Dashboard</h1>
      <p className="text-ink-muted text-sm mb-6">Store overview at a glance</p>

      {/* Revenue chart — hero */}
      <div className="mb-6">
        <RevenueChart />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => {
          const inner = (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{c.icon}</span>
              </div>
              <p className="text-2xl font-extrabold text-ink leading-none">{c.value}</p>
              <p className="text-xs text-ink-muted font-semibold mt-1">{c.label} · {c.sub}</p>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="bg-canvas rounded-card border border-line p-5 hover:shadow-md transition-shadow">{inner}</Link>
          ) : (
            <div key={c.label} className="bg-canvas rounded-card border border-line p-5">{inner}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-canvas rounded-card border border-line overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-canvas">
            <h2 className="font-extrabold text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-bold text-accent hover:underline">View all →</Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No orders yet.</p>
          ) : (
            <div className="divide-y divide-canvas">
              {stats.recentOrders.map((o) => (
                <div key={o.orderNumber} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink text-sm font-mono">{o.orderNumber}</p>
                    <p className="text-xs text-ink-muted truncate">{o.customer || "Guest"}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_STYLE[o.status] ?? ""}`}>{o.status}</span>
                    <span className="font-extrabold text-ink text-sm">{formatPrice(o.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="bg-canvas rounded-card border border-line overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-canvas">
            <h2 className="font-extrabold text-ink">Low stock ⚠️</h2>
            <Link href="/admin/products" className="text-xs font-bold text-accent hover:underline">Manage →</Link>
          </div>
          {stats.lowStock.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">Everything is well stocked 🎉</p>
          ) : (
            <div className="divide-y divide-canvas">
              {stats.lowStock.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xl">{p.emoji}</span>
                  <p className="flex-1 text-sm font-bold text-ink truncate">{p.name}</p>
                  <span className={`text-xs font-extrabold px-2 py-1 rounded-lg ${p.stock <= 0 ? "bg-danger-soft text-danger" : "bg-[#FFF4E8] text-[#A06820]"}`}>
                    {p.stock <= 0 ? "Out" : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
