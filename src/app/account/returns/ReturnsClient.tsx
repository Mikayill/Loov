"use client";

/** My Returns — every return request of the signed-in user (FAZ 6). */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { fmtDate } from "@/lib/i18n/format";
import { formatPrice } from "@/lib/format";
import { returnStatusConfig, type ReturnRecord } from "@/lib/returns";
import { returnStatusLabel, returnReasonLabel } from "@/lib/i18n/labels";

export default function ReturnsClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t } = useLocale();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/returns?mine=1")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setReturns(d.returns ?? []); setFetching(false); } })
      .catch(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [user]);

  if (loading || !user || fetching) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-accent transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("acct.returns.title")}</span>
      </nav>

      <h1 className="text-2xl font-extrabold text-ink mb-1">{t("acct.returns.title")}</h1>
      <p className="text-sm text-ink-muted mb-8">{t("acct.returns.subtitle")}</p>

      {returns.length === 0 ? (
        <div className="bg-canvas rounded-card border border-line p-12 text-center">
          <span className="text-5xl block mb-4">↩️</span>
          <h2 className="text-lg font-extrabold text-ink mb-2">{t("acct.returns.empty")}</h2>
          <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">
            {t("acct.returns.emptyBody")}
          </p>
          <Link
            href="/account/orders"
            className="u-btn inline-block font-bold px-7 py-3 rounded-control text-white text-sm transition-colors bg-ink hover:bg-ink/85"
          >
            {t("acct.returns.viewMyOrders")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((ret) => {
            const rc = returnStatusConfig[ret.status];
            const itemCount = ret.items.reduce((s, it) => s + it.quantity, 0);
            return (
              <div key={ret.id} className="bg-canvas rounded-card border border-line overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-canvas" style={{ backgroundColor: "#FAFAF8" }}>
                  <div>
                    <p className="font-mono font-extrabold text-sm text-ink">{ret.return_number}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {fmtDate(ret.created_at, locale, "long")}
                      {" · "}
                      {t("acct.returns.order")}{" "}
                      <Link href={`/account/orders/${ret.order_number}`} className="font-mono font-semibold text-accent hover:underline">
                        {ret.order_number}
                      </Link>
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: rc.bg, color: rc.text }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rc.dot }} />
                    {returnStatusLabel(ret.status, t)}
                  </span>
                </div>
                <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-ink-soft">
                    <p className="font-semibold text-ink">
                      {itemCount === 1 ? t("acct.returns.item1") : t("acct.returns.itemsN").replace("{n}", String(itemCount))} · {ret.items.map((it) => it.product_name).join(", ")}
                    </p>
                    <p className="text-ink-muted mt-0.5">{t("acct.returns.reason")} {returnReasonLabel(ret.reason, t)}</p>
                    {ret.status === "rejected" && ret.admin_note && (
                      <p className="text-danger mt-0.5">{t("acct.returns.note")} {ret.admin_note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-ink-muted font-semibold">{ret.status === "refunded" ? t("acct.returns.refunded") : t("acct.returns.refund")}</p>
                    <p className="font-extrabold text-ink">{formatPrice(Number(ret.refund_amount))}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
