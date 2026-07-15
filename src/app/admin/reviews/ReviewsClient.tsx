"use client";

import { useEffect, useState } from "react";

interface Row {
  id: string;
  product_id: string;
  rating: number;
  body: string;
  show_name: boolean;
  author_name: string | null;
  status: string;
  created_at: string;
  admin_reply: string | null;
  admin_reply_at: string | null;
  products: { name: string } | null;
}

function Stars({ n }: { n: number }) {
  return <span className="text-[#F0B840]">{"★".repeat(n)}<span className="text-line">{"★".repeat(5 - n)}</span></span>;
}

export default function ReviewsClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "hidden">("all");
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/reviews").then((r) => r.json()).then((d) => {
      if (d.error) setError(d.error);
      else { setRows(d.reviews); setReady(d.ready !== false); }
    }).catch(() => setError("Could not load"));
  }
  useEffect(load, []);

  async function setStatus(id: string, status: string) {
    setRows((prev) => prev!.map((r) => r.id === id ? { ...r, status } : r));
    await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
  }
  async function remove(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    setRows((prev) => prev!.filter((r) => r.id !== id));
    await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
  }
  function openReply(r: Row) {
    setReplyDraft((prev) => ({ ...prev, [r.id]: r.admin_reply ?? "" }));
    setReplyOpen((prev) => ({ ...prev, [r.id]: true }));
  }
  async function saveReply(id: string, overrideText?: string) {
    const adminReply = (overrideText ?? replyDraft[id] ?? "").trim();
    setReplyBusy(id);
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, adminReply }),
    });
    const data = await res.json();
    setReplyBusy(null);
    if (data.ok) {
      setRows((prev) => prev!.map((r) => r.id === id ? { ...r, admin_reply: adminReply || null, admin_reply_at: adminReply ? new Date().toISOString() : null } : r));
      setReplyOpen((prev) => ({ ...prev, [id]: false }));
    } else alert(data.error || "Could not save reply");
  }
  async function removeReply(id: string) {
    await saveReply(id, "");
  }

  if (error) return <p className="text-red-500 font-semibold">{error}</p>;
  if (!rows) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold text-ink mb-1">Reviews</h1>
      <p className="text-ink-muted text-sm mb-5">{rows.length} reviews · only customers who received a product can post one.</p>

      {!ready && (
        <div className="mb-5 rounded-control bg-warning-soft border border-warning-border px-4 py-3 text-sm text-warning">
          ⚠️ The <code className="font-mono">reviews</code> table isn&apos;t set up yet. Run <code className="font-mono">supabase/features.sql</code>.
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(["all", "published", "hidden"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === f ? "bg-accent text-white" : "bg-canvas border border-line text-ink-soft"}`}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className={`bg-canvas rounded-card border p-4 ${r.status === "hidden" ? "border-red-200 opacity-70" : "border-line"}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Stars n={r.rating} />
                  <span className="font-bold text-ink text-sm">{r.products?.name ?? `#${r.product_id}`}</span>
                  {r.status === "hidden" && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Hidden</span>}
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {r.show_name ? (r.author_name ?? "—") : `${r.author_name ?? "—"} (posted anonymously)`} · {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setStatus(r.id, r.status === "hidden" ? "published" : "hidden")} className="text-xs font-bold text-accent hover:underline">
                  {r.status === "hidden" ? "Publish" : "Hide"}
                </button>
                <button onClick={() => remove(r.id)} className="text-xs font-bold text-danger hover:underline">Delete</button>
              </div>
            </div>
            <p className="text-sm text-ink-soft mt-2 whitespace-pre-line">{r.body}</p>

            {r.admin_reply && !replyOpen[r.id] && (
              <div className="mt-3 rounded-control bg-accent-soft border border-sage p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-extrabold text-accent-deep">Loov 🌿 replied</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openReply(r)} className="text-[11px] font-bold text-accent hover:underline">Edit</button>
                    <button onClick={() => removeReply(r.id)} className="text-[11px] font-bold text-danger hover:underline">Remove</button>
                  </div>
                </div>
                <p className="text-sm text-accent-deep whitespace-pre-line">{r.admin_reply}</p>
              </div>
            )}
            {!r.admin_reply && !replyOpen[r.id] && (
              <button onClick={() => openReply(r)} className="mt-2 text-xs font-bold text-accent hover:underline">+ Reply as Loov</button>
            )}
            {replyOpen[r.id] && (
              <div className="mt-3 rounded-control border border-accent p-3 bg-[#F5FBF9]">
                <textarea
                  value={replyDraft[r.id] ?? ""}
                  onChange={(e) => setReplyDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  rows={2}
                  placeholder="Write a public reply as Loov…"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent resize-y"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => saveReply(r.id)}
                    disabled={replyBusy === r.id}
                    className="text-xs font-bold text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  >
                    {replyBusy === r.id ? "Saving…" : "Save reply"}
                  </button>
                  <button
                    onClick={() => setReplyOpen((prev) => ({ ...prev, [r.id]: false }))}
                    className="text-xs font-bold text-ink-soft px-3 py-1.5 rounded-lg border border-line"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-ink-muted bg-canvas rounded-card border border-line">No reviews {filter !== "all" ? `(${filter})` : "yet"}.</p>}
      </div>
    </div>
  );
}
