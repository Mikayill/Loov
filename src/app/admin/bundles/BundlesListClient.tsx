"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

export interface BundleItem {
  slug: string;
  label: string;
  quantity?: number;
}

export interface BundleRow {
  slug: string;
  name: string;
  subtitle: string | null;
  tagline: string | null;
  emoji: string | null;
  card_color: string | null;
  description: string | null;
  features: string[] | null;
  items: BundleItem[] | null;
  original_price: number;
  bundle_price: number;
  is_new: boolean | null;
  image_url: string | null;
  active: boolean | null;
  sort: number | null;
}

const MISSING_TR: Record<string, string> = {
  photo: "photo",
  description: "description",
  price: "a price above 0",
  items: "at least 2 products",
};

export default function BundlesListClient() {
  const router = useRouter();
  const [rows, setRows] = useState<BundleRow[] | null>(null);
  const [ready, setReady] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busySlug, setBusySlug] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/bundles")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else { setRows(d.bundles); setReady(d.ready !== false); }
      })
      .catch(() => setError("Could not load bundles"));
  }
  useEffect(load, []);

  async function createBundle() {
    const name = newName.trim();
    if (!name) return;
    setBusySlug("__new__");
    const res = await fetch("/api/admin/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setBusySlug(null);
    if (data.ok) router.push(`/admin/bundles/${data.slug}`);
    else alert(data.error || "Create failed");
  }

  async function patch(slug: string, body: Record<string, unknown>): Promise<boolean> {
    setBusySlug(slug);
    const res = await fetch("/api/admin/bundles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ...body }),
    });
    const data = await res.json();
    setBusySlug(null);
    if (!data.ok) {
      if (Array.isArray(data.missing)) {
        alert(`This bundle can't go live yet. Missing: ${data.missing.map((m: string) => MISSING_TR[m] ?? m).join(", ")}.\n\nOpen the bundle and complete it first.`);
      } else alert(data.error || "Update failed");
      return false;
    }
    return true;
  }

  async function toggleLive(b: BundleRow) {
    const next = !(b.active ?? true);
    const ok = await patch(b.slug, { active: next });
    if (ok) setRows((prev) => prev!.map((x) => x.slug === b.slug ? { ...x, active: next } : x));
  }

  /** Swap sort with the neighbour above/below. */
  async function move(index: number, dir: -1 | 1) {
    if (!rows) return;
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    const sortA = a.sort ?? index;
    const sortB = b.sort ?? index + dir;
    const okA = await patch(a.slug, { sort: sortB });
    const okB = okA && await patch(b.slug, { sort: sortA });
    if (okA && okB) {
      setRows((prev) => {
        const next = [...prev!];
        next[index] = { ...b, sort: sortA };
        next[index + dir] = { ...a, sort: sortB };
        return next;
      });
    }
  }

  async function remove(b: BundleRow) {
    if (!confirm(`Delete bundle "${b.name}"? This cannot be undone.`)) return;
    setBusySlug(b.slug);
    const res = await fetch(`/api/admin/bundles?slug=${encodeURIComponent(b.slug)}`, { method: "DELETE" });
    const data = await res.json();
    setBusySlug(null);
    if (data.ok) setRows((prev) => prev!.filter((x) => x.slug !== b.slug));
    else alert(data.error || "Delete failed");
  }

  if (error) return <p className="text-red-500 font-semibold">{error}</p>;
  if (!rows) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="text-2xl font-extrabold text-ink">Bundles</h1>
        {!creating ? (
          <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-control font-bold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--color-accent)" }}>
            + New bundle
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createBundle(); if (e.key === "Escape") setCreating(false); }}
              placeholder="Bundle name, e.g. Kış Paketi"
              autoFocus
              className="h-10 px-3 rounded-control border-2 border-accent text-sm outline-none w-56"
            />
            <button onClick={createBundle} disabled={busySlug === "__new__" || !newName.trim()} className="h-10 px-4 rounded-control font-bold text-white text-sm disabled:opacity-50" style={{ backgroundColor: "var(--color-accent)" }}>
              {busySlug === "__new__" ? "…" : "Create →"}
            </button>
            <button onClick={() => { setCreating(false); setNewName(""); }} className="h-10 px-3 rounded-control font-bold text-ink-soft text-sm border border-line">✕</button>
          </div>
        )}
      </div>
      <p className="text-ink-muted text-sm mb-5">A bundle opens in its own editor. New bundles start <strong>hidden</strong> and can only go live once they have a photo, a description, a price and at least 2 products.</p>

      {!ready && (
        <div className="mb-5 rounded-control bg-warning-soft border border-warning-border px-4 py-3 text-sm text-warning">
          ⚠️ The <code className="font-mono">bundles</code> table isn&apos;t set up yet — run <code className="font-mono">supabase/bundles.sql</code> in the SQL Editor.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((b, i) => {
          const savings = b.original_price - b.bundle_price;
          const live = b.active ?? true;
          const itemCount = (b.items ?? []).length;
          const busy = busySlug === b.slug;
          return (
            <div key={b.slug} className={`bg-canvas rounded-card border border-line p-3 flex items-center gap-3 flex-wrap ${busy ? "opacity-60" : ""}`}>
              {/* Reorder */}
              <div className="flex flex-col flex-shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-ink-muted hover:text-ink disabled:opacity-20 text-xs leading-none p-0.5" title="Move up">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-ink-muted hover:text-ink disabled:opacity-20 text-xs leading-none p-0.5" title="Move down">▼</button>
              </div>

              {/* Card body → editor */}
              <Link href={`/admin/bundles/${b.slug}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                <div className="w-16 h-16 rounded-control flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden border border-panel" style={{ backgroundColor: b.card_color ?? "#EDE5D8" }}>
                  {b.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                  ) : <span title="No photo yet">📷</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-ink group-hover:text-accent transition-colors truncate">
                    {b.name}
                    {b.is_new && <span className="ml-2 text-[9px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full uppercase align-middle">New</span>}
                  </p>
                  <p className="text-xs text-ink-muted truncate">
                    {itemCount} {itemCount === 1 ? "product" : "products"}
                    {b.original_price > 0 && <> · <span className="line-through">{formatPrice(b.original_price)}</span></>}
                    {" "}<strong className="text-ink">{formatPrice(b.bundle_price)}</strong>
                    {savings > 0 && <span className="text-[#B85C38] font-bold"> · save {formatPrice(savings)}</span>}
                  </p>
                </div>
              </Link>

              {/* Status + actions */}
              <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                <button
                  onClick={() => toggleLive(b)}
                  title={live ? "Visible on the site — click to hide" : "Hidden — click to publish (requires a complete bundle)"}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide transition-colors ${
                    live ? "bg-accent-soft text-accent-deep hover:bg-[#D8EDE9]" : "bg-canvas text-ink-muted hover:bg-panel"
                  }`}
                >
                  {live ? "● Live" : "○ Hidden"}
                </button>
                <Link href={`/admin/bundles/${b.slug}`} className="text-xs font-bold text-accent hover:underline">Edit →</Link>
                <button onClick={() => remove(b)} className="text-xs font-bold text-danger hover:underline">Delete</button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && ready && (
          <p className="text-sm text-ink-muted py-10 text-center bg-canvas rounded-card border border-dashed border-line">No bundles yet — create your first one with <strong>+ New bundle</strong>.</p>
        )}
      </div>
    </div>
  );
}
