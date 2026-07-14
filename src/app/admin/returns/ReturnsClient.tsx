"use client";

/**
 * Admin — Returns (FAZ 6). Review return requests, move them through
 * requested → approved → received → refunded (or reject with a note).
 * Every status change emails the customer and is written to the audit log.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RETURN_TRANSITIONS,
  reasonMeta,
  returnStatusConfig,
  type ReturnRecord,
  type ReturnStatus,
} from "@/lib/returns";

interface ProductInfo { slug: string; image_url: string | null; emoji: string | null; card_color: string | null }
interface OrderInfo { phone: string | null; street: string | null; city: string | null; district: string | null }

const FILTERS: ("all" | ReturnStatus)[] = ["all", "requested", "approved", "received", "refunded", "rejected", "cancelled"];

function fmt(n: number) {
  return `${Number(n).toFixed(n % 1 === 0 ? 0 : 2)} ₾`;
}

export default function ReturnsClient() {
  const [rows, setRows] = useState<ReturnRecord[] | null>(null);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [orders, setOrders] = useState<Record<string, OrderInfo>>({});
  const [ready, setReady] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | ReturnStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/returns")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setRows(d.returns ?? []);
          setProducts(d.products ?? {});
          setOrders(d.orders ?? {});
          setReady(d.ready !== false);
        }
      })
      .catch(() => setError("Could not load"));
  }
  useEffect(load, []);

  async function move(row: ReturnRecord, status: ReturnStatus) {
    const note = (notes[row.id] ?? "").trim();
    if (status === "rejected" && !note) {
      alert("Write a rejection reason in the note field first — it's emailed to the customer.");
      return;
    }
    if (!confirm(`Move ${row.return_number} to "${status}"? The customer will be emailed.`)) return;
    setSaving(row.id);
    try {
      const res = await fetch("/api/admin/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status, adminNote: note || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setRows((prev) =>
        prev!.map((r) => (r.id === row.id ? { ...r, status, admin_note: note || r.admin_note } : r))
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (error) return <p className="text-red-500 font-semibold">{error}</p>;
  if (!rows) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pending = rows.filter((r) => r.status === "requested").length;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-extrabold text-ink mb-1">Returns</h1>
      <p className="text-ink-muted text-sm mb-5">
        {rows.length} request{rows.length === 1 ? "" : "s"}
        {pending > 0 && <span className="font-bold text-[#A06820]"> · {pending} waiting for review</span>}
        {" · "}refunds are paid by bank transfer to the customer&apos;s IBAN.
      </p>

      {!ready && (
        <div className="mb-5 rounded-control bg-[#FFF4E5] border border-[#F0C85A] px-4 py-3 text-sm text-[#8B6914]">
          ⚠️ The <code className="font-mono">returns</code> table isn&apos;t set up yet. Run{" "}
          <code className="font-mono">supabase/returns.sql</code> in the Supabase SQL Editor.
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => {
          const count = f === "all" ? rows.length : rows.filter((r) => r.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                filter === f ? "bg-accent text-white" : "bg-white border border-line text-ink-soft"
              }`}
            >
              {f === "all" ? "All" : returnStatusConfig[f].label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((row) => {
          const rc = returnStatusConfig[row.status];
          const open = openId === row.id;
          const nextStatuses = (RETURN_TRANSITIONS[row.status] ?? []).filter((s) => s !== "cancelled");
          const contact = orders[row.order_id];
          const itemCount = row.items.reduce((s, it) => s + it.quantity, 0);
          return (
            <div key={row.id} className="bg-white rounded-card border border-line overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => setOpenId(open ? null : row.id)}
                className="w-full px-4 py-3.5 flex items-center gap-3 flex-wrap text-left hover:bg-surface transition-colors"
              >
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0" style={{ backgroundColor: rc.bg, color: rc.text }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rc.dot }} />
                  {rc.label}
                </span>
                <div className="flex-1 min-w-[160px]">
                  <p className="font-mono font-extrabold text-sm text-ink">
                    {row.return_number}
                    <span className="font-sans font-normal text-ink-muted"> · order {row.order_number}</span>
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">
                    {row.email} · {itemCount} item{itemCount === 1 ? "" : "s"} · {reasonMeta(row.reason)?.label ?? row.reason}
                    {row.photos.length > 0 && ` · 📷 ${row.photos.length}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-shrink-0">
                  <div className="text-right">
                    <p className="font-extrabold text-ink text-sm">{fmt(Number(row.refund_amount))}</p>
                    <p className="text-[10px] text-ink-muted">{new Date(row.created_at).toLocaleDateString()}</p>
                  </div>
                  <svg className={`w-4 h-4 text-ink-muted transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {open && (
                <div className="border-t border-canvas p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: items + reason + photos */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">Items coming back</p>
                      <div className="space-y-2">
                        {row.items.map((it, i) => {
                          const p = it.product_id ? products[it.product_id] : undefined;
                          return (
                            <div key={i} className="flex items-center gap-3 bg-surface rounded-control p-2.5">
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: p?.card_color ?? "#EAE4DC" }}>
                                {p?.image_url ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={p.image_url} alt={it.product_name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{p?.emoji ?? "🍼"}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {p?.slug ? (
                                  <Link href={`/products/${p.slug}`} target="_blank" className="font-bold text-ink text-xs hover:text-accent">
                                    {it.product_name} ↗
                                  </Link>
                                ) : (
                                  <p className="font-bold text-ink text-xs">{it.product_name}</p>
                                )}
                                <p className="text-[10px] text-ink-muted">{it.color ?? "—"} · {it.size ?? "—"} · {it.quantity} × {fmt(it.price)}</p>
                              </div>
                              <p className="font-extrabold text-ink text-xs">{fmt(it.price * it.quantity)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-1">Reason</p>
                      <p className="text-sm text-ink font-semibold">{reasonMeta(row.reason)?.label ?? row.reason}</p>
                      {row.description && <p className="text-xs text-ink-soft mt-1 whitespace-pre-line">{row.description}</p>}
                    </div>

                    {row.photos.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">Customer photos</p>
                        <div className="flex gap-2 flex-wrap">
                          {row.photos.map((url, i) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded-control overflow-hidden border border-line hover:opacity-80 transition-opacity">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`Return photo ${i + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: payout + contact + actions */}
                  <div className="space-y-3">
                    <div className="bg-surface rounded-control p-3.5">
                      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">Refund payout</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-extrabold text-lg text-ink">{fmt(Number(row.refund_amount))}</p>
                          <p className="font-mono text-xs text-ink-soft truncate">{row.iban}</p>
                        </div>
                        <button
                          onClick={() => copy(row.iban, `iban-${row.id}`)}
                          className="px-3 py-1.5 rounded-lg border border-line text-xs font-bold text-ink-soft hover:border-accent hover:text-accent transition-colors flex-shrink-0"
                        >
                          {copied === `iban-${row.id}` ? "✓ Copied" : "📋 Copy IBAN"}
                        </button>
                      </div>
                    </div>

                    <div className="bg-surface rounded-control p-3.5">
                      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">Courier pickup</p>
                      <p className="text-xs text-ink font-semibold">
                        {[contact?.street, contact?.district, contact?.city].filter(Boolean).join(", ") || "Address on the order page"}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        {contact?.phone && (
                          <a href={`tel:${contact.phone}`} className="font-bold text-accent hover:underline">📞 {contact.phone}</a>
                        )}
                        <a href={`mailto:${row.email}`} className="font-bold text-accent hover:underline">✉️ {row.email}</a>
                      </div>
                    </div>

                    {row.admin_note && (
                      <div className="bg-[#FFF8E8] border border-[#F0C85A] rounded-control p-3.5">
                        <p className="text-[11px] font-bold text-[#A06820] uppercase tracking-wide mb-1">Note</p>
                        <p className="text-xs text-ink-soft">{row.admin_note}</p>
                      </div>
                    )}

                    {nextStatuses.length > 0 && (
                      <div className="border border-line rounded-control p-3.5">
                        <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">Move to</p>
                        <textarea
                          value={notes[row.id] ?? ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          rows={2}
                          placeholder="Note (required to reject — emailed to the customer)"
                          className="w-full rounded-lg border border-line px-3 py-2 text-xs text-ink focus:outline-none focus:border-accent resize-none mb-2"
                        />
                        <div className="flex gap-2 flex-wrap">
                          {nextStatuses.map((s) => {
                            const sc = returnStatusConfig[s];
                            return (
                              <button
                                key={s}
                                onClick={() => move(row, s)}
                                disabled={saving === row.id}
                                className="px-4 py-2 rounded-full text-xs font-extrabold transition-opacity hover:opacity-85 disabled:opacity-50"
                                style={{ backgroundColor: s === "rejected" ? "#FEF2F2" : sc.dot, color: s === "rejected" ? "#B03A3A" : "#fff", border: s === "rejected" ? "1px solid #F5C6C6" : "none" }}
                              >
                                {saving === row.id ? "…" : `→ ${sc.label}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-muted bg-white rounded-card border border-line">
            No returns{filter !== "all" ? ` (${filter})` : " yet"}.
          </p>
        )}
      </div>
    </div>
  );
}
