"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { statusConfig, type MockOrder } from "@/lib/mockOrders";
import { fetchMyOrders } from "@/lib/db/myOrders";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import { fmtDate } from "@/lib/i18n/format";
import { orderStatusLabel, colorLabel, sizeLabel } from "@/lib/i18n/labels";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className="w-3 h-3" viewBox="0 0 20 20" fill={i <= count ? "#F0B840" : "#DDD5CC"}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function OrdersClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t } = useLocale();
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  /* Load the user's real orders from Supabase once signed in. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyOrders().then((data) => {
      if (!cancelled) { setOrders(data); setFetching(false); }
    });
    return () => { cancelled = true; };
  }, [user]);

  if (loading || !user || fetching) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-[#5E9E8C] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#9A8E88] mb-6">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-[#5E9E8C] transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold">{t("acct.orders.title")}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2A2320]">{t("acct.orders.title")}</h1>
          <p className="text-[#9A8E88] text-sm mt-0.5">{orders.length === 1 ? t("acct.orders.total1") : t("acct.orders.totalN").replace("{n}", String(orders.length))}</p>
        </div>
        <Link
          href="/account"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#5E9E8C] hover:underline"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("acct.orders.backToAccount")}
        </Link>
      </div>

      {/* Empty state */}
      {orders.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#DDD5CC] p-12 text-center">
          <span className="text-5xl block mb-4">📦</span>
          <p className="font-extrabold text-[#2A2320] text-lg mb-1">{t("acct.orders.empty")}</p>
          <p className="text-sm text-[#5E5450] mb-6">
            {t("acct.orders.emptyBody")}
          </p>
          <Link
            href="/products"
            className="inline-block font-bold px-7 py-3 rounded-full text-white text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            {t("acct.orders.startShopping")} →
          </Link>
        </div>
      )}

      {/* Orders */}
      <div className="space-y-5">
        {orders.map((order) => {
          const style = statusConfig[order.status];
          const itemTotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
          // Prefer the stored (actually charged) shipping cost over recomputing.
          const shipping = order.shippingCost ?? (itemTotal >= 100 ? 0 : order.shipping === "express" ? 25 : 15);

          return (
            <div key={order.id} className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden hover:shadow-md transition-shadow">

              {/* Order header */}
              <div className="flex items-center justify-between p-5 border-b border-[#F5F0EB] flex-wrap gap-4 bg-[#FAFAF8]">
                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-0.5">{t("acct.orders.orderLabel")}</p>
                    <p className="font-extrabold text-[#2A2320] font-mono tracking-wide">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-0.5">{t("acct.orders.placedLabel")}</p>
                    <p className="font-semibold text-[#2A2320] text-sm">
                      {fmtDate(order.date, locale, "short")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-0.5">{t("acct.orders.totalLabel")}</p>
                    <p className="font-extrabold text-[#2A2320]">{formatPrice(order.total)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-0.5">{t("acct.orders.shippingLabel")}</p>
                    <p className="font-semibold text-[#2A2320] text-sm">
                      {shipping === 0 ? <span className="text-[#5E9E8C]">{t("cart.free")} 🎉</span> : formatPrice(shipping)}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: style.bg, color: style.text }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: style.dot }} />
                  {orderStatusLabel(order.status, t)}
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-[#F5F0EB]">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-5">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: item.cardColor }}
                    >
                      {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#2A2320] text-sm leading-tight">{item.name}</p>
                      <p className="text-xs text-[#9A8E88] mt-0.5">
                        {colorLabel(item.color, t)} · {sizeLabel(item.size, t)} · {t("acct.orders.qty").replace("{n}", String(item.qty))}
                      </p>
                      {order.status === "Delivered" && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Stars count={5} />
                          <span className="text-[10px] text-[#9A8E88]">{t("acct.orders.leaveReview")}</span>
                        </div>
                      )}
                    </div>
                    <p className="font-extrabold text-[#2A2320] text-sm flex-shrink-0">
                      {formatPrice(item.price * item.qty)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-[#F8F7F5] border-t border-[#F5F0EB] flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 text-xs text-[#9A8E88] flex-wrap">
                  <span className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{order.address}, {order.city}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>{order.shipping === "express" ? "⚡" : "🚀"}</span>
                    <span>{order.shipping === "express" ? t("acct.orders.expressDelivery") : t("acct.orders.standardDelivery")}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="text-xs font-bold text-[#5E9E8C] border border-[#5E9E8C] px-3 py-1.5 rounded-full hover:bg-[#EAF2F0] transition-colors"
                  >
                    {t("acct.orders.viewDetails")}
                  </Link>
                  {order.status === "Delivered" && (
                    <Link
                      href="/products"
                      className="text-xs font-bold text-white px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: "#5E9E8C" }}
                    >
                      {t("acct.orders.buyAgain")} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-10 p-6 rounded-2xl text-center" style={{ background: "linear-gradient(135deg, #EAF2F0 0%, #E8EEF4 100%)" }}>
        <p className="font-bold text-[#2A2320] mb-1">{t("acct.orders.lookingForNew")}</p>
        <p className="text-sm text-[#5E5450] mb-4">{t("acct.orders.browseLatest")}</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 font-bold text-sm text-white px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-sm"
          style={{ backgroundColor: "#5E9E8C" }}
        >
          {t("acct.orders.browseCollection")} →
        </Link>
      </div>
    </div>
  );
}
