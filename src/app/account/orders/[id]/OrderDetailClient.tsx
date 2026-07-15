"use client";

import { useEffect, useState } from "react";
import GhostRows from "@/components/GhostRows";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MockOrder, statusConfig } from "@/lib/mockOrders";
import { fetchMyOrder } from "@/lib/db/myOrders";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import { fmtDate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import {
  ACTIVE_RETURN_STATUSES,
  returnWindowEndsAt,
  RETURN_WINDOW_DAYS,
  type ReturnRecord,
  type ReturnStatus,
} from "@/lib/returns";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { orderStatusLabel, returnStatusLabel, returnReasonLabel, colorLabel, sizeLabel } from "@/lib/i18n/labels";
import { returnStatusConfig } from "@/lib/returns";

/**
 * Timeline driven by REAL signals only: created_at (placed date), the current
 * status (which stages were reached) and delivered_at (delivery date, stamped
 * when the admin marks the order delivered). Intermediate steps carry no date
 * — we don't have per-step timestamps, and invented ones mislead customers.
 */
const timelineSteps = (order: MockOrder, locale: Locale, t: (key: TranslationKey) => string) => {
  const placed = fmtDate(new Date(order.date), locale, "short");
  if (order.status === "Cancelled") {
    return [
      { label: t("track.stepPlaced"), date: placed, done: true },
      { label: orderStatusLabel("Cancelled", t), date: "", done: true },
    ];
  }
  const rank = order.status === "Delivered" ? 3 : order.status === "Shipped" ? 2 : 1;
  return [
    { label: t("track.stepPlaced"),     date: placed, done: true },
    { label: t("track.stepProcessing"), date: "", done: rank >= 1 },
    { label: t("track.stepShipped"),    date: "", done: rank >= 2 },
    {
      label: t("track.stepDelivered"),
      date: order.deliveredAt ? fmtDate(new Date(order.deliveredAt), locale, "short") : "",
      done: rank >= 3,
    },
  ];
};

export default function OrderDetailClient({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t } = useLocale();
  const [order, setOrder] = useState<MockOrder | null>(null);
  const [fetching, setFetching] = useState(true);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  /* Load this order from Supabase (RLS: must belong to the signed-in user). */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyOrder(orderNumber).then((data) => {
      if (!cancelled) { setOrder(data); setFetching(false); }
    });
    fetch(`/api/returns?order=${encodeURIComponent(orderNumber)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setReturns(d.returns ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, orderNumber]);

  const cancelReturn = async (id: string) => {
    if (!window.confirm(t("acct.return.confirmCancel"))) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.code === "otp_required") { router.push("/login?verify=1"); return; }
        // `code` → localized message; raw English only as a last resort.
        throw new Error(d.code === "cancel_too_late" ? t("acct.return.cancelTooLate") : d.error || t("checkout.errGeneric"));
      }
      setReturns((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" as ReturnStatus } : r)));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  const cancelOrder = async () => {
    if (!order || !window.confirm(t("acct.orders.cancelConfirm"))) return;
    setCancellingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", orderNumber: order.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.code === "otp_required") { router.push("/login?verify=1"); return; }
        throw new Error(d.error || "Failed");
      }
      setOrder((prev) => (prev ? { ...prev, status: "Cancelled", cancellable: false } : prev));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCancellingOrder(false);
    }
  };

  if (loading || !user || fetching) {
    return <GhostRows variant="orderDetail" />;
  }

  /* Order not found (or belongs to someone else — RLS returns nothing). */
  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <span className="text-5xl block mb-4">🔍</span>
        <h1 className="text-xl font-extrabold text-ink mb-2">{t("acct.orders.notFound")}</h1>
        <p className="text-sm text-ink-soft mb-6">
          {t("acct.orders.notFoundBody").split("{id}")[0]}
          <span className="font-mono font-bold">{orderNumber}</span>
          {t("acct.orders.notFoundBody").split("{id}")[1]}
        </p>
        <Link
          href="/account/orders"
          className="u-btn inline-block font-bold px-7 py-3 rounded-control text-white text-sm transition-colors bg-ink hover:bg-ink/85"
        >
          ← {t("acct.orders.title")}
        </Link>
      </div>
    );
  }

  const cfg = statusConfig[order.status];
  const itemSubtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  // Prefer the shipping cost actually charged (stored in the DB) — recomputing
  // with today's prices would misstate old orders after a settings change.
  const shippingCost = order.shippingCost ?? (itemSubtotal >= 100 ? 0 : order.shipping === "express" ? 25 : 15);
  const steps = timelineSteps(order, locale, t);

  /* Returns — 14-day window from delivery (fallback: order date). */
  const latestReturn = returns[0] ?? null;
  const activeReturn = returns.find((r) => ACTIVE_RETURN_STATUSES.includes(r.status)) ?? null;
  const windowEnd = returnWindowEndsAt(order.deliveredAt, order.date);
  const windowOpen = new Date() <= windowEnd;
  const daysLeft = Math.max(0, Math.ceil((windowEnd.getTime() - Date.now()) / 86400000));
  const canRequestReturn = order.status === "Delivered" && windowOpen && !activeReturn;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-6 flex-wrap">
        <Link href="/" className="hover:text-accent transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-accent transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <Link href="/account/orders" className="hover:text-accent transition-colors">{t("acct.orders.title")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold font-mono">{order.id}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-ink font-mono">{order.id}</h1>
          <p className="text-ink-muted text-sm mt-0.5">
            {t("acct.orders.placedOn").replace("{date}", fmtDate(order.date, locale, "long"))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
            {orderStatusLabel(order.status, t)}
          </div>
          <Link href="/account/orders" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t("acct.orders.allOrders")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items + Timeline */}
        <div className="lg:col-span-2 space-y-5">

          {/* Items */}
          <div className="bg-canvas rounded-card border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-canvas font-bold text-ink flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
              <span>🛍️</span> {t("acct.orders.orderItems")}
            </div>
            <div className="divide-y divide-canvas">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-5">
                  <Link href={`/products/${item.slug}`}>
                    <div className="w-16 h-16 rounded-control flex items-center justify-center text-2xl flex-shrink-0 hover:opacity-80 transition-opacity" style={{ backgroundColor: item.cardColor }}>
                      {item.emoji}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.slug}`}>
                      <p className="font-bold text-ink text-sm leading-snug hover:text-accent transition-colors">{item.name}</p>
                    </Link>
                    <p className="text-xs text-ink-muted mt-0.5">{colorLabel(item.color, t)} · {sizeLabel(item.size, t)}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{t("acct.orders.qtyPrice").replace("{n}", String(item.qty)).replace("{price}", formatPrice(item.price))}</p>
                  </div>
                  <p className="font-extrabold text-ink flex-shrink-0">{formatPrice(item.price * item.qty)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery timeline */}
          <div className="bg-canvas rounded-card border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-canvas font-bold text-ink flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
              <span>📦</span> {t("acct.orders.deliveryTimeline")}
            </div>
            <div className="p-5">
              {order.trackingNumber && (
                <div className="flex items-center gap-2 mb-5 p-3 bg-accent-soft rounded-control">
                  <span className="text-sm">🔢</span>
                  <span className="text-xs text-ink-soft">{t("acct.orders.tracking")}</span>
                  <span className="font-bold text-ink text-xs font-mono">{order.trackingNumber}</span>
                </div>
              )}
              <div className="space-y-0">
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1;
                  return (
                    <div key={step.label} className="flex items-start gap-4">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          step.done ? "border-accent bg-accent" : "border-line bg-canvas"
                        }`}>
                          {step.done && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {!isLast && <div className={`w-0.5 h-8 mt-1 ${step.done ? "bg-accent" : "bg-line"}`} />}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-bold ${step.done ? "text-ink" : "text-ink-muted"}`}>{step.label}</p>
                        {step.date && <p className="text-[11px] text-ink-muted mt-0.5">{step.date}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary + Delivery info */}
        <div className="space-y-5">
          {/* Order summary */}
          <div className="bg-canvas rounded-card border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-canvas font-bold text-ink flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
              <span>💰</span> {t("acct.orders.summary")}
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">{t("cart.subtotal")}</span>
                <span className="font-bold text-ink">{formatPrice(itemSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">{t("cart.shipping")}</span>
                {shippingCost === 0
                  ? <span className="font-bold text-accent">{t("cart.free")} 🎉</span>
                  : <span className="font-bold text-ink">{formatPrice(shippingCost)}</span>}
              </div>
              <div className="h-px bg-line" />
              <div className="flex justify-between font-extrabold text-ink">
                <span>{t("cart.total")}</span>
                <span className="text-lg">{formatPrice(order.total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">{t("acct.orders.payment")}</span>
                <span className="font-semibold text-ink-soft">{order.payment}</span>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="bg-canvas rounded-card border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-canvas font-bold text-ink flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
              <span>📍</span> {t("acct.orders.deliveryAddressHeading")}
            </div>
            <div className="p-5">
              <p className="text-sm text-ink font-semibold">{user.name}</p>
              <p className="text-sm text-ink-soft mt-1">{order.address}</p>
              <p className="text-sm text-ink-soft">{order.city}, {t("acct.orders.countryGeorgia")}</p>
              <p className="text-sm text-ink-soft mt-1">{order.phone}</p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
                {order.shipping === "express" ? <span>⚡</span> : <span>🚀</span>}
                <span className="font-semibold">{order.shipping === "express" ? t("acct.orders.expressDelivery") : t("acct.orders.standardDelivery")}</span>
              </div>
            </div>
          </div>

          {/* Return status card */}
          {latestReturn && (
            <div className="bg-canvas rounded-card border border-line overflow-hidden">
              <div className="px-5 py-4 border-b border-canvas font-bold text-ink flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
                <span>↩️</span> {t("acct.return.title")}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono font-bold text-xs text-ink">{latestReturn.return_number}</span>
                  {(() => {
                    const rc = returnStatusConfig[latestReturn.status];
                    return (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: rc.bg, color: rc.text }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rc.dot }} />
                        {returnStatusLabel(latestReturn.status, t)}
                      </span>
                    );
                  })()}
                </div>
                {/* Mini progress (hidden for rejected/cancelled) */}
                {!["rejected", "cancelled"].includes(latestReturn.status) && (
                  <div className="flex items-center gap-1 mb-3">
                    {(["requested", "approved", "received", "refunded"] as ReturnStatus[]).map((s, i, arr) => {
                      const reached = arr.indexOf(latestReturn.status) >= i;
                      return (
                        <div key={s} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`w-full h-1 rounded-full ${reached ? "bg-accent" : "bg-[#EAE4DC]"}`} />
                          <span className={`text-[9px] font-semibold ${reached ? "text-accent-deep" : "text-ink-muted"}`}>
                            {returnStatusLabel(s, t)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="text-xs text-ink-soft space-y-1">
                  <p>
                    {t("acct.return.itemsCount").replace("{n}", String(latestReturn.items.reduce((s, it) => s + it.quantity, 0)))}{" "}
                    <span className="font-bold text-ink">{formatPrice(Number(latestReturn.refund_amount))}</span> {t("acct.return.refundLabel")}
                  </p>
                  <p className="text-ink-muted">{t("acct.return.reasonLabel").replace("{reason}", returnReasonLabel(latestReturn.reason, t))}</p>
                  {latestReturn.status === "approved" && (
                    <p className="text-[#2A5A8E]">{t("acct.return.packItems")}</p>
                  )}
                  {latestReturn.status === "refunded" && (
                    <p className="text-accent-deep">{t("acct.return.transferred")}</p>
                  )}
                  {latestReturn.status === "rejected" && latestReturn.admin_note && (
                    <p className="text-danger">{t("acct.return.reasonLabel").replace("{reason}", latestReturn.admin_note)}</p>
                  )}
                </div>
                {latestReturn.status === "requested" && (
                  <button
                    onClick={() => cancelReturn(latestReturn.id)}
                    disabled={cancelling}
                    className="mt-3 w-full py-2 rounded-control text-xs font-bold border border-line text-ink-soft hover:border-[#DC4A4A] hover:text-danger transition-colors disabled:opacity-50"
                  >
                    {cancelling ? t("acct.return.cancelling") : t("acct.return.cancelRequest")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {order.cancellable && (
            <div>
              <button
                onClick={cancelOrder}
                disabled={cancellingOrder}
                className="w-full py-3 rounded-card font-bold text-sm border border-line text-ink-soft flex items-center justify-center gap-2 hover:border-[#DC4A4A] hover:text-danger transition-colors disabled:opacity-50"
              >
                {cancellingOrder ? t("acct.orders.cancelling") : `✕ ${t("acct.orders.cancelOrder")}`}
              </button>
              <p className="text-[11px] text-ink-muted text-center mt-1.5">{t("acct.orders.cancelHint")}</p>
            </div>
          )}
          {canRequestReturn && (
            <div>
              <Link
                href={`/account/orders/${order.id}/return`}
                className="w-full py-3 rounded-card font-bold text-sm border-2 border-accent text-accent flex items-center justify-center gap-2 hover:bg-panel transition-colors"
              >
                ↩️ {t("acct.return.requestReturn")}
              </Link>
              <p className="text-[11px] text-ink-muted text-center mt-1.5">
                {daysLeft === 1 ? t("acct.return.windowLeft1") : t("acct.return.windowLeftN").replace("{n}", String(daysLeft))}
              </p>
            </div>
          )}
          {order.status === "Delivered" && !windowOpen && !activeReturn && (
            <p className="text-[11px] text-ink-muted text-center">
              {t("acct.return.windowClosed").replace("{n}", String(RETURN_WINDOW_DAYS))}
            </p>
          )}
          {order.status === "Delivered" && (
            <Link
              href="/products"
              className="u-btn w-full py-3 rounded-card font-extrabold text-white text-sm flex items-center justify-center gap-2 transition-colors shadow-sm bg-ink hover:bg-ink/85"
            >
              {t("acct.orders.buyAgain")} →
            </Link>
          )}
          <Link
            href="/contact"
            className="w-full py-3 rounded-card font-bold text-sm border border-line text-ink-soft flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
          >
            {t("acct.orders.needHelp")}
          </Link>
        </div>
      </div>
    </div>
  );
}
