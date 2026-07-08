"use client";

import { useEffect, useState } from "react";
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
      if (!res.ok) throw new Error(d.error || "Failed");
      setReturns((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" as ReturnStatus } : r)));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !user || fetching) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-[#5E9E8C] border-t-transparent animate-spin" />
      </div>
    );
  }

  /* Order not found (or belongs to someone else — RLS returns nothing). */
  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <span className="text-5xl block mb-4">🔍</span>
        <h1 className="text-xl font-extrabold text-[#2A2320] mb-2">{t("acct.orders.notFound")}</h1>
        <p className="text-sm text-[#5E5450] mb-6">
          {t("acct.orders.notFoundBody").split("{id}")[0]}
          <span className="font-mono font-bold">{orderNumber}</span>
          {t("acct.orders.notFoundBody").split("{id}")[1]}
        </p>
        <Link
          href="/account/orders"
          className="inline-block font-bold px-7 py-3 rounded-full text-white text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#5E9E8C" }}
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
      <nav className="flex items-center gap-2 text-xs text-[#9A8E88] mb-6 flex-wrap">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-[#5E9E8C] transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <Link href="/account/orders" className="hover:text-[#5E9E8C] transition-colors">{t("acct.orders.title")}</Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold font-mono">{order.id}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2A2320] font-mono">{order.id}</h1>
          <p className="text-[#9A8E88] text-sm mt-0.5">
            {t("acct.orders.placedOn").replace("{date}", fmtDate(order.date, locale, "long"))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
            {orderStatusLabel(order.status, t)}
          </div>
          <Link href="/account/orders" className="flex items-center gap-1.5 text-sm font-semibold text-[#5E9E8C] hover:underline">
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
          <div className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F5F0EB] font-bold text-[#2A2320] flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
              <span>🛍️</span> {t("acct.orders.orderItems")}
            </div>
            <div className="divide-y divide-[#F5F0EB]">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-5">
                  <Link href={`/products/${item.slug}`}>
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 hover:opacity-80 transition-opacity" style={{ backgroundColor: item.cardColor }}>
                      {item.emoji}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.slug}`}>
                      <p className="font-bold text-[#2A2320] text-sm leading-snug hover:text-[#5E9E8C] transition-colors">{item.name}</p>
                    </Link>
                    <p className="text-xs text-[#9A8E88] mt-0.5">{colorLabel(item.color, t)} · {sizeLabel(item.size, t)}</p>
                    <p className="text-xs text-[#5E5450] mt-0.5">{t("acct.orders.qtyPrice").replace("{n}", String(item.qty)).replace("{price}", formatPrice(item.price))}</p>
                  </div>
                  <p className="font-extrabold text-[#2A2320] flex-shrink-0">{formatPrice(item.price * item.qty)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery timeline */}
          <div className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F5F0EB] font-bold text-[#2A2320] flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
              <span>📦</span> {t("acct.orders.deliveryTimeline")}
            </div>
            <div className="p-5">
              {order.trackingNumber && (
                <div className="flex items-center gap-2 mb-5 p-3 bg-[#EAF2F0] rounded-xl">
                  <span className="text-sm">🔢</span>
                  <span className="text-xs text-[#5E5450]">{t("acct.orders.tracking")}</span>
                  <span className="font-bold text-[#2A2320] text-xs font-mono">{order.trackingNumber}</span>
                </div>
              )}
              <div className="space-y-0">
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1;
                  return (
                    <div key={step.label} className="flex items-start gap-4">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          step.done ? "border-[#5E9E8C] bg-[#5E9E8C]" : "border-[#DDD5CC] bg-white"
                        }`}>
                          {step.done && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {!isLast && <div className={`w-0.5 h-8 mt-1 ${step.done ? "bg-[#5E9E8C]" : "bg-[#DDD5CC]"}`} />}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-bold ${step.done ? "text-[#2A2320]" : "text-[#9A8E88]"}`}>{step.label}</p>
                        {step.date && <p className="text-[11px] text-[#9A8E88] mt-0.5">{step.date}</p>}
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
          <div className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F5F0EB] font-bold text-[#2A2320] flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
              <span>💰</span> {t("acct.orders.summary")}
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#5E5450]">{t("cart.subtotal")}</span>
                <span className="font-bold text-[#2A2320]">{formatPrice(itemSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5E5450]">{t("cart.shipping")}</span>
                {shippingCost === 0
                  ? <span className="font-bold text-[#5E9E8C]">{t("cart.free")} 🎉</span>
                  : <span className="font-bold text-[#2A2320]">{formatPrice(shippingCost)}</span>}
              </div>
              <div className="h-px bg-[#DDD5CC]" />
              <div className="flex justify-between font-extrabold text-[#2A2320]">
                <span>{t("cart.total")}</span>
                <span className="text-lg">{formatPrice(order.total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9A8E88]">{t("acct.orders.payment")}</span>
                <span className="font-semibold text-[#5E5450]">{order.payment}</span>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F5F0EB] font-bold text-[#2A2320] flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
              <span>📍</span> {t("acct.orders.deliveryAddressHeading")}
            </div>
            <div className="p-5">
              <p className="text-sm text-[#2A2320] font-semibold">{user.name}</p>
              <p className="text-sm text-[#5E5450] mt-1">{order.address}</p>
              <p className="text-sm text-[#5E5450]">{order.city}, {t("acct.orders.countryGeorgia")}</p>
              <p className="text-sm text-[#5E5450] mt-1">{order.phone}</p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#5E5450]">
                {order.shipping === "express" ? <span>⚡</span> : <span>🚀</span>}
                <span className="font-semibold">{order.shipping === "express" ? t("acct.orders.expressDelivery") : t("acct.orders.standardDelivery")}</span>
              </div>
            </div>
          </div>

          {/* Return status card */}
          {latestReturn && (
            <div className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F5F0EB] font-bold text-[#2A2320] flex items-center gap-2" style={{ backgroundColor: "#FAFAF8" }}>
                <span>↩️</span> {t("acct.return.title")}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono font-bold text-xs text-[#2A2320]">{latestReturn.return_number}</span>
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
                          <div className={`w-full h-1 rounded-full ${reached ? "bg-[#5E9E8C]" : "bg-[#EAE4DC]"}`} />
                          <span className={`text-[9px] font-semibold ${reached ? "text-[#3A7A68]" : "text-[#9A8E88]"}`}>
                            {returnStatusLabel(s, t)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="text-xs text-[#5E5450] space-y-1">
                  <p>
                    {t("acct.return.itemsCount").replace("{n}", String(latestReturn.items.reduce((s, it) => s + it.quantity, 0)))}{" "}
                    <span className="font-bold text-[#2A2320]">{formatPrice(Number(latestReturn.refund_amount))}</span> {t("acct.return.refundLabel")}
                  </p>
                  <p className="text-[#9A8E88]">{t("acct.return.reasonLabel").replace("{reason}", returnReasonLabel(latestReturn.reason, t))}</p>
                  {latestReturn.status === "approved" && (
                    <p className="text-[#2A5A8E]">{t("acct.return.packItems")}</p>
                  )}
                  {latestReturn.status === "refunded" && (
                    <p className="text-[#3A7A68]">{t("acct.return.transferred")}</p>
                  )}
                  {latestReturn.status === "rejected" && latestReturn.admin_note && (
                    <p className="text-[#B03A3A]">{t("acct.return.reasonLabel").replace("{reason}", latestReturn.admin_note)}</p>
                  )}
                </div>
                {latestReturn.status === "requested" && (
                  <button
                    onClick={() => cancelReturn(latestReturn.id)}
                    disabled={cancelling}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-bold border border-[#DDD5CC] text-[#5E5450] hover:border-[#DC4A4A] hover:text-[#B03A3A] transition-colors disabled:opacity-50"
                  >
                    {cancelling ? t("acct.return.cancelling") : t("acct.return.cancelRequest")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {canRequestReturn && (
            <div>
              <Link
                href={`/account/orders/${order.id}/return`}
                className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-[#5E9E8C] text-[#5E9E8C] flex items-center justify-center gap-2 hover:bg-[#EAF2F0] transition-colors"
              >
                ↩️ {t("acct.return.requestReturn")}
              </Link>
              <p className="text-[11px] text-[#9A8E88] text-center mt-1.5">
                {daysLeft === 1 ? t("acct.return.windowLeft1") : t("acct.return.windowLeftN").replace("{n}", String(daysLeft))}
              </p>
            </div>
          )}
          {order.status === "Delivered" && !windowOpen && !activeReturn && (
            <p className="text-[11px] text-[#9A8E88] text-center">
              {t("acct.return.windowClosed").replace("{n}", String(RETURN_WINDOW_DAYS))}
            </p>
          )}
          {order.status === "Delivered" && (
            <Link
              href="/products"
              className="w-full py-3 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
              style={{ backgroundColor: "#5E9E8C" }}
            >
              {t("acct.orders.buyAgain")} →
            </Link>
          )}
          <Link
            href="/contact"
            className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-[#DDD5CC] text-[#5E5450] flex items-center justify-center hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-colors"
          >
            {t("acct.orders.needHelp")}
          </Link>
        </div>
      </div>
    </div>
  );
}
