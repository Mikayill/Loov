"use client";

/**
 * /admin/promos — create/manage promo codes.
 * Codes are members-only on the storefront, one use per customer;
 * here the admin sets the code, type, value, expiry and TOTAL usage limit.
 */

import { useEffect, useState } from "react";

interface PromoRow {
  id: string;
  code: string;
  type: "percent" | "shipping";
  value: number;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  active: boolean;
  created_at: string;
}

const EMPTY_FORM = { code: "", type: "percent" as "percent" | "shipping", value: "10", expiresAt: "", usageLimit: "" };

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PromosClient() {
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [ready, setReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/promos")
      .then((r) => r.json())
      .then((d) => {
        setPromos(d.promos ?? []);
        setReady(d.ready !== false);
      })
      .catch(() => setError("Could not load promo codes"))
      .finally(() => setLoading(false));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    const res = await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok || !d.ok) { setError(d.error || "Create failed"); return; }
    setPromos((prev) => [d.promo, ...prev]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    const res = await fetch("/api/admin/promos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) { setError(d.error || "Update failed"); return; }
    setPromos((prev) => prev.map((p) => (p.id === id ? d.promo : p)));
  }

  async function remove(p: PromoRow) {
    if (!confirm(`Delete code "${p.code}"? Customers won't be able to use it anymore.`)) return;
    setError("");
    const res = await fetch(`/api/admin/promos?id=${encodeURIComponent(p.id)}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) { setError(d.error || "Delete failed"); return; }
    setPromos((prev) => prev.filter((x) => x.id !== p.id));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;
  }

  const inputCls = "h-10 px-3 rounded-control border border-line text-sm font-semibold text-ink outline-none focus:border-accent bg-white";

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="text-2xl font-extrabold text-ink">Promo codes</h1>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          className="px-4 h-10 rounded-control font-bold text-white text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#5E9E8C" }}
        >
          {showForm ? "Close" : "+ New code"}
        </button>
      </div>
      <p className="text-ink-muted text-sm mb-6">
        Codes are <strong>members only</strong> (guests can&apos;t apply them) and each customer can use a code <strong>once</strong>.
        The usage limit below is the TOTAL across all customers.
      </p>

      {!ready && (
        <div className="mb-5 rounded-control bg-[#FFF4E5] border border-[#F0C85A] px-4 py-3 text-sm text-[#8B6914]">
          ⚠️ The <code className="font-mono">promo_codes</code> table isn&apos;t set up yet. Run <code className="font-mono">supabase/promos.sql</code> in the SQL Editor.
        </div>
      )}
      {error && <p className="mb-4 text-sm font-semibold text-red-500">{error}</p>}

      {/* Create form */}
      {showForm && (
        <form onSubmit={create} className="bg-white rounded-card border-2 border-accent p-5 mb-5 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) }))}
              placeholder="SUMMER25"
              required
              className={`${inputCls} w-40 font-mono tracking-wider`}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percent" | "shipping" }))}
              className={`${inputCls} w-36 cursor-pointer`}
            >
              <option value="percent">% discount</option>
              <option value="shipping">Free shipping</option>
            </select>
          </div>
          {form.type === "percent" && (
            <div>
              <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1">Percent</label>
              <input
                type="number" min={1} max={90} step={1}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                required
                className={`${inputCls} w-20 text-right`}
              />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1">Expires (optional)</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className={`${inputCls} w-40`}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1">Usage limit (optional)</label>
            <input
              type="number" min={1} step={1}
              value={form.usageLimit}
              onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
              placeholder="∞"
              className={`${inputCls} w-28 text-right`}
            />
          </div>
          <button
            type="submit"
            disabled={creating || !form.code}
            className="h-10 px-5 rounded-control font-bold text-white text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            {creating ? "…" : "Create"}
          </button>
        </form>
      )}

      {/* List */}
      {promos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-card border border-line">
          <div className="text-4xl mb-3">🎟️</div>
          <p className="font-bold text-ink mb-1">No promo codes yet</p>
          <p className="text-sm text-ink-muted">Create one with “+ New code”.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => {
            const expired = !!p.expires_at && new Date(p.expires_at).getTime() < Date.now();
            const limitHit = p.usage_limit !== null && p.times_used >= p.usage_limit;
            const live = p.active && !expired && !limitHit;
            return (
              <div key={p.id} className={`bg-white rounded-card border p-4 flex flex-wrap items-center gap-x-5 gap-y-3 ${live ? "border-line" : "border-panel opacity-80"}`}>
                {/* Code + type */}
                <div className="min-w-[160px]">
                  <p className="font-mono font-extrabold text-ink tracking-wider">{p.code}</p>
                  <p className="text-xs font-bold mt-0.5">
                    {p.type === "shipping"
                      ? <span className="text-[#4A7AC0]">🚀 Free shipping</span>
                      : <span className="text-accent">−{p.value}%</span>}
                  </p>
                </div>

                {/* Usage */}
                <div className="text-xs text-ink-soft">
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Used</p>
                  <p className={`font-bold ${limitHit ? "text-red-500" : "text-ink"}`}>
                    {p.times_used} / {p.usage_limit ?? "∞"}
                  </p>
                </div>

                {/* Expiry — editable */}
                <div className="text-xs text-ink-soft">
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Expires</p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={p.expires_at ? p.expires_at.slice(0, 10) : ""}
                      onChange={(e) => patch(p.id, { expiresAt: e.target.value })}
                      className="h-8 px-2 rounded-lg border border-line text-xs font-semibold outline-none focus:border-accent bg-white"
                    />
                    {expired && <span className="text-[10px] font-bold text-red-500 uppercase">Expired {fmtDate(p.expires_at)}</span>}
                  </div>
                </div>

                {/* Limit — editable */}
                <div className="text-xs text-ink-soft">
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Limit</p>
                  <input
                    type="number" min={1} step={1}
                    defaultValue={p.usage_limit ?? ""}
                    placeholder="∞"
                    onBlur={(e) => {
                      const v = e.target.value;
                      if ((p.usage_limit === null && v === "") || Number(v) === p.usage_limit) return;
                      patch(p.id, { usageLimit: v });
                    }}
                    className="h-8 w-20 px-2 rounded-lg border border-line text-xs font-semibold text-right outline-none focus:border-accent bg-white"
                  />
                </div>

                <div className="flex-1" />

                {/* Active toggle */}
                <button
                  type="button"
                  onClick={() => patch(p.id, { active: !p.active })}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${p.active ? "" : "bg-line"}`}
                  style={p.active ? { backgroundColor: "#5E9E8C" } : {}}
                  title={p.active ? "Active — click to pause" : "Paused — click to activate"}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${p.active ? "translate-x-5" : ""}`} />
                </button>

                <button
                  onClick={() => remove(p)}
                  className="text-xs font-bold text-red-400 border-2 border-red-200 px-3 py-1.5 rounded-control hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
