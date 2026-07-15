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
import { useProductsByIds } from "@/lib/db/useProductsByIds";
import GhostRows from "@/components/GhostRows";

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

  /* Resolve product photos/slugs for every item across every return, so each
     line can show a real thumbnail + a link to the product page (Temu-style),
     not just its name. */
  const allProductIds = [...new Set(returns.flatMap((r) => r.items.map((it) => it.product_id).filter((id): id is string => !!id)))];
  const products = useProductsByIds(allProductIds);
  const productById = new Map(products.map((p) => [p.id, p]));

  if (loading || !user || fetching) {
    return <GhostRows rows={3} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back to account */}
      <Link href="/account" className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted hover:text-ink transition-colors mb-5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        {t("acct.title")}
      </Link>

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
                <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-line bg-panel">
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
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-bold" style={{ backgroundColor: rc.bg, color: rc.text }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rc.dot }} />
                    {returnStatusLabel(ret.status, t)}
                  </span>
                </div>

                {/* Product rows — real photo + name + link to the product page */}
                <div className="divide-y divide-line">
                  {ret.items.map((it, i) => {
                    const product = it.product_id ? productById.get(it.product_id) : undefined;
                    const card = (
                      <>
                        <span
                          className="w-14 h-14 rounded-control flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                          style={{ backgroundColor: product?.cardColor ?? "var(--color-panel)" }}
                        >
                          {product?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            product?.emoji ?? "📦"
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[13.5px] font-semibold text-ink truncate ${product ? "group-hover:underline underline-offset-2" : ""}`}>
                            {it.product_name}
                          </span>
                          <span className="block text-[11.5px] text-ink-muted mt-0.5">
                            {it.color && it.size ? `${it.color} · ${it.size} · ` : ""}
                            {t("acct.returns.itemsN").replace("{n}", String(it.quantity))}
                          </span>
                        </span>
                      </>
                    );
                    return product ? (
                      <Link key={i} href={`/products/${product.slug}`} className="group flex items-center gap-3 px-5 py-3 hover:bg-panel/60 transition-colors">
                        {card}
                        <svg className="w-4 h-4 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    ) : (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">{card}</div>
                    );
                  })}
                </div>

                <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-ink-soft">
                    <p className="text-ink-muted">{t("acct.returns.reason")} {returnReasonLabel(ret.reason, t)}</p>
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
