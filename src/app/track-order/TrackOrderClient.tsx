"use client";

import { useState } from "react";
import Link from "next/link";
import { statusConfig, type MockOrder } from "@/lib/mockOrders";
import { trackOrder } from "@/lib/db/myOrders";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import { fmtDate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { orderStatusLabel, colorLabel, sizeLabel } from "@/lib/i18n/labels";
import Button from "@/components/ui/Button";

type TrackStep = { label: string; date: string; done: boolean; active: boolean };

/**
 * Timeline from REAL signals only: created_at, current status and (when
 * present) delivered_at. Intermediate steps carry no date — inventing
 * estimates here misled customers.
 */
function getTimeline(order: MockOrder, locale: Locale, t: (key: TranslationKey) => string): TrackStep[] {
  const placed = fmtDate(new Date(order.date), locale, "short");

  if (order.status === "Cancelled") {
    return [
      { label: t("track.stepPlaced"),    date: placed, done: true, active: false },
      { label: t("track.stepCancelled"), date: "", done: true, active: true  },
    ];
  }

  const rank = order.status === "Delivered" ? 3 : order.status === "Shipped" ? 2 : 1;
  return [
    { label: t("track.stepPlaced"),     date: placed, done: true, active: false },
    { label: t("track.stepProcessing"), date: "", done: rank >= 1, active: order.status === "Processing" },
    { label: t("track.stepShipped"),    date: "", done: rank >= 2, active: order.status === "Shipped" },
    {
      label: t("track.stepDelivered"),
      date: order.deliveredAt ? fmtDate(new Date(order.deliveredAt), locale, "short") : "",
      done: rank >= 3,
      active: false,
    },
  ];
}

export default function TrackOrderClient() {
  const { locale, t } = useLocale();
  const [input,    setInput]    = useState("");
  const [email,    setEmail]    = useState("");
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [order,    setOrder]    = useState<MockOrder | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const timeline = order ? getTimeline(order, locale, t) : null;

  async function handleTrack() {
    if (!input.trim() || !email.trim()) return;
    setLoading(true);
    setUnavailable(false);
    const result = await trackOrder(input.trim().toUpperCase(), email.trim());
    setLoading(false);
    setSearched(true);
    if (result === "unavailable") { setOrder(null); setUnavailable(true); return; }
    setOrder(result);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("track.breadcrumb")}</span>
      </nav>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">📦</div>
        <h1 className="text-3xl font-extrabold text-ink mb-2">{t("track.title")}</h1>
        <p className="text-ink-soft text-sm">{t("track.subtitle")}</p>
      </div>

      {/* Search */}
      <div className="bg-canvas rounded-card border border-line p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="track-order-no" className="text-sm font-bold text-ink mb-2 block">{t("track.orderNumber")}</label>
            <input
              id="track-order-no"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              placeholder="e.g. LOOV-3V570MU"
              className="w-full h-11 px-4 border border-line rounded-control text-sm font-medium text-ink placeholder-ink-muted focus:outline-none focus:border-accent transition-colors bg-canvas"
            />
          </div>
          <div>
            <label htmlFor="track-email" className="text-sm font-bold text-ink mb-2 block">{t("track.emailUsed")}</label>
            <input
              id="track-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              placeholder="you@example.com"
              className="w-full h-11 px-4 border border-line rounded-control text-sm font-medium text-ink placeholder-ink-muted focus:outline-none focus:border-accent transition-colors bg-canvas"
            />
          </div>
        </div>
        <Button
          onClick={handleTrack}
          disabled={!input.trim() || !email.trim()}
          loading={loading}
          fullWidth
        >
          {t("track.trackBtn")} →
        </Button>
        <p className="text-[10px] text-ink-muted mt-2">
          {t("track.privacyNote")}
        </p>
      </div>

      {/* Result */}
      {searched && (
        <>
          {unavailable ? (
            <div className="bg-canvas rounded-card border border-line p-8 text-center">
              <div className="text-4xl mb-3">🛠️</div>
              <p className="font-bold text-ink mb-2">{t("track.unavailableTitle")}</p>
              <p className="text-sm text-ink-muted">
                {t("track.unavailableBody").split("{link}")[0]}
                <Link href="/contact" className="text-accent font-bold hover:underline">{t("track.contactUs")}</Link>
                {t("track.unavailableBody").split("{link}")[1]}
              </p>
            </div>
          ) : !order ? (
            <div className="bg-canvas rounded-card border border-line p-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-bold text-ink mb-2">{t("track.notFoundTitle")}</p>
              <p className="text-sm text-ink-muted">
                {t("track.notFoundBody").split("{link}")[0]}
                <Link href="/contact" className="text-accent font-bold hover:underline">{t("track.contactUs")}</Link>
                {t("track.notFoundBody").split("{link}")[1]}
              </p>
            </div>
          ) : (
            <div className="bg-canvas rounded-card border border-line overflow-hidden">
              {/* Order header */}
              <div className="px-6 py-4 border-b border-canvas flex items-center justify-between flex-wrap gap-3" style={{ backgroundColor: "#FAFAF8" }}>
                <div>
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">{t("track.orderLabel")}</p>
                  <p className="font-extrabold text-ink font-mono tracking-wide">{order.id}</p>
                </div>
                {(() => {
                  const cfg = statusConfig[order.status];
                  return (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                      {orderStatusLabel(order.status, t)}
                    </div>
                  );
                })()}
              </div>

              {/* Tracking number */}
              {order.trackingNumber && (
                <div className="px-6 py-3 border-b border-canvas flex items-center gap-3">
                  <span className="text-sm">🔢</span>
                  <span className="text-xs text-ink-soft">{t("track.trackingNumber")}</span>
                  <span className="font-bold text-ink text-xs font-mono">{order.trackingNumber}</span>
                </div>
              )}

              {/* Timeline */}
              <div className="px-6 py-6">
                <h3 className="text-sm font-bold text-ink mb-5">{t("track.deliveryProgress")}</h3>
                <div className="space-y-0">
                  {timeline?.map((step, i) => {
                    const isLast = i === (timeline.length - 1);
                    return (
                      <div key={step.label} className="flex items-start gap-4">
                        {/* Dot + line */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            step.active
                              ? "border-accent bg-accent"
                              : step.done
                              ? "border-accent bg-accent"
                              : "border-line bg-canvas"
                          }`}>
                            {step.done && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {step.active && !step.done && (
                              <div className="w-2 h-2 rounded-full bg-canvas animate-pulse" />
                            )}
                          </div>
                          {!isLast && (
                            <div className={`w-0.5 h-8 mt-1 ${step.done ? "bg-accent" : "bg-line"}`} />
                          )}
                        </div>
                        {/* Label */}
                        <div className={`pb-4 ${isLast ? "" : ""}`}>
                          <p className={`text-sm font-bold leading-snug ${step.done || step.active ? "text-ink" : "text-ink-muted"}`}>
                            {step.label}
                          </p>
                          {step.date && <p className="text-[11px] text-ink-muted mt-0.5">{step.date}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items summary */}
              <div className="px-6 pb-6 border-t border-canvas pt-4">
                <h3 className="text-sm font-bold text-ink mb-3">{t("track.itemsInOrder")}</h3>
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-control flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: item.cardColor }}>
                        {item.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink leading-snug truncate">{item.name}</p>
                        <p className="text-[10px] text-ink-muted">{colorLabel(item.color, t)} · {sizeLabel(item.size, t)} · {t("track.qty").replace("{n}", String(item.qty))}</p>
                      </div>
                      <p className="text-xs font-extrabold text-ink">{formatPrice(item.price * item.qty)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-canvas">
                  <span className="text-sm font-extrabold text-ink">{t("cart.total")}</span>
                  <span className="text-sm font-extrabold text-ink">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Help */}
      <div className="mt-8 text-center">
        <p className="text-sm text-ink-muted mb-3">{t("track.needHelp")}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap text-sm font-bold text-accent">
          <Link href="/contact" className="hover:underline">{t("nav.contact")}</Link>
          <span className="text-line">·</span>
          <Link href="/faq" className="hover:underline">FAQ</Link>
          <span className="text-line">·</span>
          <Link href="/account/orders" className="hover:underline">{t("track.myOrders")}</Link>
        </div>
      </div>
    </div>
  );
}
