"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

interface Item {
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  color: string | null;
  size: string | null;
  bundle_slug?: string | null;
  bundle_name?: string | null;
}
interface Order {
  id: string; order_number: string; status: string;
  first_name: string; last_name: string; email: string; phone: string;
  street: string; city: string; district: string | null; region: string;
  zip: string | null; notes: string | null;
  gift_wrap: boolean | null; gift_message: string | null; locale: string | null;
  total: number; subtotal: number; shipping: number; shipping_method: string; created_at: string;
  promo_code?: string | null; promo_discount?: number;
  order_items: Item[];
}
interface ProductInfo { slug: string; image_url: string | null; emoji: string | null; card_color: string | null }

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#FFF8E8] text-[#A06820] border-[#F0C85A]",
  processing: "bg-[#EAF0F8] text-[#2A5A8E] border-[#A9C5E5]",
  shipped: "bg-[#EAF0F8] text-[#2A5A8E] border-[#A9C5E5]",
  delivered: "bg-accent-soft text-accent-deep border-[#A9D5C8]",
  cancelled: "bg-danger-soft text-danger border-[#E5B0B0]",
};

const LOCALE_FLAGS: Record<string, string> = { en: "🇬🇧", ka: "🇬🇪", ru: "🇷🇺", tr: "🇹🇷" };

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    /* read ?status= from the URL for the dashboard "pending" shortcut */
    const s = new URLSearchParams(window.location.search).get("status") ?? "";
    setFilter(s);
  }, []);

  function load(status: string) {
    setOrders(null);
    const url = status ? `/api/admin/orders?status=${status}` : "/api/admin/orders";
    fetch(url).then((r) => r.json()).then((d) => {
      if (d.error) setError(d.error);
      else { setOrders(d.orders); setProducts(d.products ?? {}); }
    }).catch(() => setError("Could not load"));
  }
  useEffect(() => { load(filter); }, [filter]);

  async function changeStatus(order: Order, status: string) {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, status }),
    });
    const data = await res.json();
    if (data.ok) setOrders((prev) => prev ? prev.map((o) => o.id === order.id ? { ...o, status } : o) : prev);
    else alert(data.error || "Update failed");
  }

  /** Copy everything a shipping label needs in one click. */
  function copyShippingInfo(o: Order) {
    const lines = [
      `${o.first_name} ${o.last_name}`.trim(),
      o.phone,
      [o.street, o.district].filter(Boolean).join(", "),
      [o.city, o.region, o.zip].filter(Boolean).join(", "),
      `Order: ${o.order_number}`,
    ].filter(Boolean);
    navigator.clipboard?.writeText(lines.join("\n")).then(() => {
      setCopied(o.id);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-extrabold text-ink mb-1">Orders</h1>
      <p className="text-ink-muted text-sm mb-5">Change an order&apos;s status with the dropdown — the customer sees it on their tracking page <strong>and gets an email</strong> (processing / shipped / delivered / cancelled).</p>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {["", ...STATUSES].map((s) => (
          <button key={s || "all"} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${filter === s ? "bg-ink text-white" : "bg-white border border-line text-ink-soft hover:border-ink-muted"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 font-semibold">{error}</p>}
      {!orders && !error && <div className="flex items-center justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>}
      {orders && orders.length === 0 && <p className="text-ink-muted text-sm bg-white rounded-card border border-line p-8 text-center">No orders here.</p>}

      <div className="space-y-3">
        {orders?.map((o) => {
          const open = expanded === o.id;
          const itemCount = (o.order_items ?? []).reduce((s, it) => s + it.quantity, 0);
          const freeShipping = Number(o.shipping) === 0;
          const giftWrapCost = o.gift_wrap ? 5 : 0;
          return (
            <div key={o.id} className="bg-white rounded-card border border-line overflow-hidden">
              <div className="flex items-center justify-between gap-4 p-4 flex-wrap">
                <button onClick={() => setExpanded(open ? null : o.id)} className="flex items-center gap-3 text-left min-w-0">
                  <span className="text-ink-muted text-xs">{open ? "▼" : "▶"}</span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-ink font-mono text-sm">
                      {o.order_number}
                      {o.gift_wrap && <span title="Gift wrap requested" className="ml-1.5">🎁</span>}
                    </p>
                    <p className="text-xs text-ink-muted truncate">
                      {`${o.first_name} ${o.last_name}`.trim() || "Guest"} · {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {itemCount} {itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-extrabold text-ink">{formatPrice(o.total)}</span>
                  <select value={o.status} onChange={(e) => changeStatus(o, e.target.value)}
                    className={`px-2 py-1.5 rounded-full text-xs font-bold capitalize border outline-none cursor-pointer ${STATUS_STYLE[o.status] ?? "border-line"}`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {open && (
                <div className="border-t border-canvas p-4 grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm bg-surface">
                  {/* ── Items: photo + link + full config ── */}
                  <div>
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2">What to pack</p>
                    <div className="space-y-2">
                      {o.order_items?.map((it, i) => {
                        const p = it.product_id ? products[it.product_id] : undefined;
                        const thumb = (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0 overflow-hidden border border-panel" style={{ backgroundColor: p?.card_color ?? "#F5F0EB" }}>
                            {p?.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.image_url} alt={it.product_name} className="w-full h-full object-cover" />
                            ) : (p?.emoji ?? "🍼")}
                          </div>
                        );
                        return (
                          <div key={i} className="flex items-center gap-3 bg-white rounded-control border border-panel p-2.5">
                            {p?.slug ? (
                              <a href={`/products/${p.slug}`} target="_blank" rel="noreferrer" title="Open product page" className="hover:opacity-80 transition-opacity">{thumb}</a>
                            ) : thumb}
                            <div className="flex-1 min-w-0">
                              {p?.slug ? (
                                <a href={`/products/${p.slug}`} target="_blank" rel="noreferrer" className="font-bold text-ink hover:text-accent transition-colors leading-snug block truncate">
                                  {it.quantity}× {it.product_name} ↗
                                </a>
                              ) : (
                                <p className="font-bold text-ink leading-snug truncate">{it.quantity}× {it.product_name}</p>
                              )}
                              {it.bundle_name && (
                                <span className="inline-block text-[9px] font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded-full mt-0.5">
                                  🎀 {it.bundle_name}
                                </span>
                              )}
                              <p className="text-xs text-ink-muted">
                                {[it.color, it.size].filter(Boolean).join(" · ") || "—"}
                                <span className="mx-1">·</span>
                                {formatPrice(it.price)} each
                              </p>
                            </div>
                            <span className="font-extrabold text-ink whitespace-nowrap">{formatPrice(it.price * it.quantity)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Money breakdown */}
                    <div className="mt-3 bg-white rounded-control border border-panel p-3 space-y-1 text-xs">
                      <div className="flex justify-between text-ink-soft"><span>Subtotal</span><span className="font-bold">{formatPrice(o.subtotal)}</span></div>
                      <div className="flex justify-between text-ink-soft">
                        <span className="capitalize">{o.shipping_method} shipping{freeShipping ? " (free-shipping threshold)" : ""}</span>
                        <span className="font-bold">{freeShipping ? "Free" : formatPrice(o.shipping)}</span>
                      </div>
                      {o.gift_wrap && (
                        <div className="flex justify-between text-ink-soft"><span>Gift wrap 🎁</span><span className="font-bold">{formatPrice(giftWrapCost)}</span></div>
                      )}
                      {(o.promo_discount ?? 0) > 0 && (
                        <div className="flex justify-between text-accent"><span>Promo{o.promo_code ? ` (${o.promo_code})` : ""}</span><span className="font-bold">−{formatPrice(o.promo_discount ?? 0)}</span></div>
                      )}
                      {(() => {
                        const totalDiscount = o.subtotal + Number(o.shipping) + giftWrapCost - o.total;
                        const pointsDiscount = totalDiscount - (o.promo_discount ?? 0);
                        return pointsDiscount > 0.009 ? (
                          <div className="flex justify-between text-accent"><span>Points redeemed</span><span className="font-bold">−{formatPrice(pointsDiscount)}</span></div>
                        ) : null;
                      })()}
                      <div className="flex justify-between text-ink pt-1 border-t border-canvas text-sm"><span className="font-bold">Total</span><span className="font-extrabold">{formatPrice(o.total)}</span></div>
                    </div>
                  </div>

                  {/* ── Customer & delivery ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Ship to</p>
                      <button
                        onClick={() => copyShippingInfo(o)}
                        className="text-[11px] font-bold text-accent border border-sage rounded-full px-2.5 py-1 hover:bg-accent-soft transition-colors"
                      >
                        {copied === o.id ? "✓ Copied" : "📋 Copy shipping info"}
                      </button>
                    </div>
                    <div className="bg-white rounded-control border border-panel p-3 space-y-1.5">
                      <p className="text-ink font-bold">
                        {o.first_name} {o.last_name}
                        {o.locale && <span className="ml-1.5 text-xs" title={`Site language: ${o.locale}`}>{LOCALE_FLAGS[o.locale] ?? ""}</span>}
                      </p>
                      <p><a href={`tel:${o.phone}`} className="text-accent font-semibold hover:underline">📞 {o.phone}</a></p>
                      <p><a href={`mailto:${o.email}`} className="text-accent font-semibold hover:underline break-all">📧 {o.email}</a></p>
                      <p className="text-ink-soft pt-1 border-t border-canvas">
                        📍 {o.street}{o.district ? `, ${o.district}` : ""}<br />
                        <span className="pl-5">{o.city}, {o.region}{o.zip ? ` · ${o.zip}` : ""}</span>
                      </p>
                      <p className="text-ink-soft capitalize">🚚 {o.shipping_method} delivery {freeShipping ? "· customer paid nothing" : `· ${formatPrice(o.shipping)}`}</p>
                    </div>

                    {(o.gift_wrap || o.notes) && (
                      <div className="mt-3 bg-[#FFF8E8] rounded-control border border-[#F0C85A] p-3 space-y-1.5 text-xs">
                        {o.gift_wrap && (
                          <p className="text-[#8B6914]"><strong>🎁 Gift wrap requested</strong>{o.gift_message ? ` — message: “${o.gift_message}”` : " (no message)"}</p>
                        )}
                        {o.notes && <p className="text-[#8B6914]"><strong>📝 Customer note:</strong> {o.notes}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
