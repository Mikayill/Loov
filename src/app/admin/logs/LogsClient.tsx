"use client";

import { useEffect, useMemo, useState } from "react";

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

const TABS = [
  { id: "all", label: "All" },
  { id: "order", label: "🛒 Orders" },
  { id: "review", label: "⭐ Reviews" },
  { id: "admin", label: "⚙️ Admin" },
] as const;

const KIND_STYLE: Record<Event["kind"], string> = {
  order: "bg-accent-soft text-accent-deep",
  review: "bg-[#FFF6E0] text-warning",
  admin: "bg-[#F0EDE8] text-ink-soft",
};

export default function LogsClient() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");

  useEffect(() => {
    fetch("/api/admin/logs").then((r) => r.json()).then((d) => d.error ? setError(d.error) : setEvents(d.events)).catch(() => setError("Could not load"));
  }, []);

  const counts = useMemo(() => {
    const c = { order: 0, review: 0, admin: 0 };
    for (const e of events ?? []) c[e.kind]++;
    return c;
  }, [events]);

  if (error) return <p className="text-red-500 font-semibold">{error}</p>;
  if (!events) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;

  const filtered = tab === "all" ? events : events.filter((e) => e.kind === tab);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-ink mb-1">Activity Log</h1>
      <p className="text-ink-muted text-sm mb-4">Everything happening in your store — purchases, reviews and admin changes, newest first.</p>

      {/* Summary chips */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-accent-soft text-accent-deep">🛒 {counts.order} orders</span>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#FFF6E0] text-warning">⭐ {counts.review} reviews</span>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#F0EDE8] text-ink-soft">⚙️ {counts.admin} admin actions</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${tab === tb.id ? "bg-accent text-white" : "bg-canvas border border-line text-ink-soft"}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-muted text-sm bg-canvas rounded-card border border-line p-8 text-center">No activity yet.</p>
      ) : (
        <div className="bg-canvas rounded-card border border-line divide-y divide-canvas">
          {filtered.map((e) => (
            <div key={e.id} className="flex items-start gap-3 p-4">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${KIND_STYLE[e.kind]}`}>{e.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">{e.title}</p>
                {e.subtitle && <p className="text-xs text-ink-soft truncate">{e.subtitle}</p>}
                {e.body && <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{e.body}</p>}
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {e.actor} · {new Date(e.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
