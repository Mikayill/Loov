"use client";

/**
 * Return request wizard (FAZ 6) — 3 steps, Temu-style:
 *   1. Select items (+ quantity)   2. Reason, photos, IBAN   3. Review & submit
 * Server-side validation in POST /api/returns is the real gate; this UI
 * mirrors those rules so customers rarely hit an API error.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { fmtDate } from "@/lib/i18n/format";
import { MockOrder } from "@/lib/mockOrders";
import { fetchMyOrder } from "@/lib/db/myOrders";
import { formatPrice } from "@/lib/format";
import {
  ACTIVE_RETURN_STATUSES,
  RETURN_REASONS,
  RETURN_WINDOW_DAYS,
  isValidGeorgianIban,
  reasonMeta,
  returnWindowEndsAt,
  type ReturnRecord,
} from "@/lib/returns";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { returnReasonLabel, colorLabel, sizeLabel } from "@/lib/i18n/labels";

const MAX_PHOTOS = 3;

/** Friendly full-page notice used for every "can't return this" case. */
function Blocked({ orderNumber, emoji, title, body, t }: { orderNumber: string; emoji: string; title: string; body: string; t: (key: TranslationKey) => string }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <span className="text-5xl block mb-4">{emoji}</span>
      <h1 className="text-xl font-extrabold text-ink mb-2">{title}</h1>
      <p className="text-sm text-ink-soft mb-6">{body}</p>
      <Link
        href={`/account/orders/${orderNumber}`}
        className="inline-block font-bold px-7 py-3 rounded-control text-white text-sm hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        ← {t("acct.return.backToOrder")}
      </Link>
    </div>
  );
}

export default function ReturnRequestClient({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t } = useLocale();

  const [order, setOrder] = useState<MockOrder | null>(null);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [fetching, setFetching] = useState(true);

  const [step, setStep] = useState(1);
  /** item index in order.items → quantity to return (0 / absent = not selected) */
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [iban, setIban] = useState("GE");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ returnNumber: string; refundAmount: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      fetchMyOrder(orderNumber),
      fetch(`/api/returns?order=${encodeURIComponent(orderNumber)}`).then((r) => r.json()).catch(() => ({ returns: [] })),
    ]).then(([ord, ret]) => {
      if (cancelled) return;
      setOrder(ord);
      setReturns(ret.returns ?? []);
      setFetching(false);
    });
    return () => { cancelled = true; };
  }, [user, orderNumber]);

  const meta = reasonMeta(reason);
  const selectedEntries = useMemo(
    () => Object.entries(selected).filter(([, q]) => q > 0).map(([i, q]) => ({ index: Number(i), qty: q })),
    [selected]
  );
  const refundItems = useMemo(() => {
    if (!order) return 0;
    return selectedEntries.reduce((s, e) => s + order.items[e.index].price * e.qty, 0);
  }, [order, selectedEntries]);
  const isFullReturn = useMemo(() => {
    if (!order) return false;
    return order.items.every((it, i) => (selected[i] ?? 0) === it.qty);
  }, [order, selected]);
  const refundTotal = refundItems + (isFullReturn ? (order?.shippingCost ?? 0) : 0);

  if (loading || !user || fetching) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!order) {
    return <Blocked orderNumber={orderNumber} emoji="🔍" title={t("acct.orders.notFound")} body={t("acct.orders.notFoundBody").replace("{id}", orderNumber)} t={t} />;
  }

  /* ── Eligibility guards (the API enforces these too) ── */
  const activeReturn = returns.find((r) => ACTIVE_RETURN_STATUSES.includes(r.status));
  if (activeReturn) {
    return (
      <Blocked
        orderNumber={orderNumber}
        emoji="↩️"
        title={t("acct.return.alreadyInProgress")}
        body={t("acct.return.alreadyInProgressBody").replace("{num}", activeReturn.return_number).replace("{status}", activeReturn.status)}
        t={t}
      />
    );
  }
  if (order.status !== "Delivered") {
    return (
      <Blocked
        orderNumber={orderNumber}
        emoji="🚚"
        title={t("acct.return.notDeliveredYet")}
        body={t("acct.return.notDeliveredBody")}
        t={t}
      />
    );
  }
  const windowEnd = returnWindowEndsAt(order.deliveredAt, order.date);
  if (new Date() > windowEnd) {
    return (
      <Blocked
        orderNumber={orderNumber}
        emoji="⏰"
        title={t("acct.return.windowClosedTitle")}
        body={t("acct.return.windowClosedBody").replace("{days}", String(RETURN_WINDOW_DAYS)).replace("{date}", fmtDate(windowEnd, locale, "long"))}
        t={t}
      />
    );
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <span className="text-5xl block mb-4">✅</span>
        <h1 className="text-2xl font-extrabold text-ink mb-2">{t("acct.return.submitted")}</h1>
        <p className="text-sm text-ink-soft mb-1">
          {t("acct.return.yourReturnNumber")} <span className="font-mono font-bold text-ink">{success.returnNumber}</span>
        </p>
        <p className="text-sm text-ink-soft mb-6">
          {t("acct.return.willReview")}{" "}
          <span className="font-bold text-ink">{formatPrice(success.refundAmount)}</span>
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href={`/account/orders/${orderNumber}`}
            className="font-bold px-7 py-3 rounded-control text-white text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            {t("acct.return.viewOrder")}
          </Link>
          <Link
            href="/account/returns"
            className="font-bold px-7 py-3 rounded-control text-sm border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
          >
            {t("acct.return.myReturns")}
          </Link>
        </div>
      </div>
    );
  }

  /* ── Step validation ── */
  const step1Ok = selectedEntries.length > 0;
  const descriptionRequired = reason === "other";
  const step2Ok =
    !!meta &&
    (!meta.photoRequired || photos.length > 0) &&
    (!descriptionRequired || description.trim().length >= 10) &&
    isValidGeorgianIban(iban);

  const next = () => {
    setError("");
    if (step === 1 && !step1Ok) { setError(t("acct.return.selectAtLeastOne")); return; }
    if (step === 2) {
      if (!meta) { setError(t("acct.return.chooseReason")); return; }
      if (meta.photoRequired && photos.length === 0) { setError(t("acct.return.addPhoto")); return; }
      if (descriptionRequired && description.trim().length < 10) { setError(t("acct.return.describeIssue")); return; }
      if (!isValidGeorgianIban(iban)) { setError(t("acct.return.validIban")); return; }
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const uploadPhoto = async (file: File) => {
    if (photos.length >= MAX_PHOTOS) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/returns/upload", { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) {
        if (d.code === "otp_required") { router.push("/login?verify=1"); return; }
        throw new Error(d.error || t("acct.return.uploadFailed"));
      }
      setPhotos((prev) => [...prev, d.url]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          reason,
          description: description.trim(),
          photos,
          iban: iban.replace(/\s/g, "").toUpperCase(),
          items: selectedEntries.map((e) => {
            const it = order.items[e.index];
            return { productId: it.productId ?? null, color: it.color === "—" ? null : it.color, size: it.size === "—" ? null : it.size, quantity: e.qty };
          }),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.code === "otp_required") { router.push("/login?verify=1"); return; }
        // Server errors carry a `code` → show them in the shopper's language.
        const byCode: Record<string, string> = {
          iban_invalid: t("acct.return.validIban"),
          photo_required: t("acct.return.addPhoto"),
          not_delivered: t("acct.return.notDeliveredYet"),
          window_closed: t("acct.return.windowClosedTitle"),
          active_exists: t("acct.return.alreadyInProgress"),
        };
        throw new Error(byCode[d.code as string] ?? d.error ?? t("checkout.errGeneric"));
      }
      setSuccess({ returnNumber: d.returnNumber, refundAmount: d.refundAmount });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [t("acct.return.stepSelectItems"), t("acct.return.stepReasonDetails"), t("acct.return.stepReview")];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-6 flex-wrap">
        <Link href="/account/orders" className="hover:text-accent transition-colors">{t("acct.orders.title")}</Link>
        <span>›</span>
        <Link href={`/account/orders/${orderNumber}`} className="hover:text-accent transition-colors font-mono">{orderNumber}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("acct.return.title")}</span>
      </nav>

      <h1 className="text-2xl font-extrabold text-ink mb-1">{t("acct.return.pageTitle")}</h1>
      <p className="text-sm text-ink-muted mb-6">
        {t("acct.return.orderFreeCourier").split("{num}")[0]}
        <span className="font-mono font-semibold">{orderNumber}</span>
        {t("acct.return.orderFreeCourier").split("{num}")[1]}
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                  done ? "bg-accent text-white" : active ? "bg-ink text-white" : "bg-[#EAE4DC] text-ink-muted"
                }`}
              >
                {done ? "✓" : n}
              </div>
              <span className={`text-xs font-bold hidden sm:block ${active || done ? "text-ink" : "text-ink-muted"}`}>{label}</span>
              {n < 3 && <div className={`flex-1 h-0.5 rounded ${done ? "bg-accent" : "bg-[#EAE4DC]"}`} />}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: select items ── */}
      {step === 1 && (
        <div className="bg-canvas rounded-card border border-line overflow-hidden">
          <div className="px-5 py-4 border-b border-canvas text-sm font-bold text-ink" style={{ backgroundColor: "#FAFAF8" }}>
            {t("acct.return.whichItems")}
          </div>
          <div className="divide-y divide-canvas">
            {order.items.map((item, i) => {
              const qty = selected[i] ?? 0;
              const checked = qty > 0;
              return (
                <div key={i} className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => setSelected((prev) => ({ ...prev, [i]: checked ? 0 : item.qty }))}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checked ? "border-accent bg-accent" : "border-line bg-canvas"
                    }`}
                    aria-label={checked ? "Deselect" : "Select"}
                  >
                    {checked && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="w-12 h-12 rounded-control flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: item.cardColor }}>
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm leading-snug">{item.name}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{colorLabel(item.color, t)} · {sizeLabel(item.size, t)} · {t("acct.return.boughtQty").replace("{n}", String(item.qty)).replace("{price}", formatPrice(item.price))}</p>
                  </div>
                  {checked && item.qty > 1 && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setSelected((prev) => ({ ...prev, [i]: Math.max(1, qty - 1) }))}
                        className="w-7 h-7 rounded-control border border-line text-ink-soft font-bold hover:border-accent transition-colors"
                      >
                        −
                      </button>
                      <span className="text-sm font-extrabold text-ink w-5 text-center">{qty}</span>
                      <button
                        onClick={() => setSelected((prev) => ({ ...prev, [i]: Math.min(item.qty, qty + 1) }))}
                        className="w-7 h-7 rounded-control border border-line text-ink-soft font-bold hover:border-accent transition-colors disabled:opacity-40"
                        disabled={qty >= item.qty}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: reason, photos, IBAN ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-canvas rounded-card border border-line p-5">
            <label className="block text-sm font-bold text-ink mb-2">{t("acct.return.whyReturning")}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RETURN_REASONS.map((r) => (
                <button
                  key={r.code}
                  onClick={() => setReason(r.code)}
                  className={`text-left px-4 py-3 rounded-control border-2 text-sm font-semibold transition-colors ${
                    reason === r.code
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-[#EAE4DC] text-ink-soft hover:border-line"
                  }`}
                >
                  {returnReasonLabel(r.code, t)}
                  {r.photoRequired && <span className="block text-[10px] font-normal text-ink-muted mt-0.5">{t("acct.return.photoRequiredHint")}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-canvas rounded-card border border-line p-5">
            <label className="block text-sm font-bold text-ink mb-2">
              {t("acct.return.tellUsMore")} {descriptionRequired ? <span className="text-danger">{t("acct.return.required")}</span> : <span className="text-ink-muted font-normal">{t("acct.return.optionalParen")}</span>}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder={t("acct.return.describePlaceholder")}
              className="w-full rounded-control border border-line px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="bg-canvas rounded-card border border-line p-5">
            <label className="block text-sm font-bold text-ink mb-1">
              {t("acct.return.photosLabel")} {meta?.photoRequired ? <span className="text-danger">{t("acct.return.atLeast1Required")}</span> : <span className="text-ink-muted font-normal">{t("acct.return.optionalParen")}</span>}
            </label>
            <p className="text-xs text-ink-muted mb-3">{t("acct.return.upToPhotos").replace("{n}", String(MAX_PHOTOS))}</p>
            <div className="flex items-center gap-3 flex-wrap">
              {photos.map((url, i) => (
                <div key={url} className="relative w-20 h-20 rounded-control overflow-hidden border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Return photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center hover:bg-black/80"
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className={`w-20 h-20 rounded-control border-2 border-dashed border-line flex flex-col items-center justify-center text-ink-muted cursor-pointer hover:border-accent hover:text-accent transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploading ? (
                    <div className="w-5 h-5 rounded-control border-2 border-accent border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <span className="text-xl leading-none">＋</span>
                      <span className="text-[10px] font-bold mt-1">{t("acct.return.add")}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPhoto(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="bg-canvas rounded-card border border-line p-5">
            <label className="block text-sm font-bold text-ink mb-1">{t("acct.return.ibanLabel")}</label>
            <p className="text-xs text-ink-muted mb-3">{t("acct.return.ibanHint")}</p>
            <input
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="GE29TB7777777777777777"
              maxLength={30}
              className={`w-full rounded-control border px-4 py-3 text-sm font-mono text-ink focus:outline-none transition-colors ${
                iban.replace(/\s/g, "").length > 2 && !isValidGeorgianIban(iban)
                  ? "border-[#DC4A4A]"
                  : "border-line focus:border-accent"
              }`}
            />
          </div>
        </div>
      )}

      {/* ── STEP 3: review ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-canvas rounded-card border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-canvas text-sm font-bold text-ink" style={{ backgroundColor: "#FAFAF8" }}>
              {t("acct.return.returningItems").replace("{n}", String(selectedEntries.reduce((s, e) => s + e.qty, 0)))}
            </div>
            <div className="divide-y divide-canvas">
              {selectedEntries.map((e) => {
                const it = order.items[e.index];
                return (
                  <div key={e.index} className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: it.cardColor }}>
                      {it.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink text-sm">{it.name}</p>
                      <p className="text-xs text-ink-muted">{colorLabel(it.color, t)} · {sizeLabel(it.size, t)} · {e.qty} × {formatPrice(it.price)}</p>
                    </div>
                    <p className="font-extrabold text-ink text-sm">{formatPrice(it.price * e.qty)}</p>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-canvas space-y-2" style={{ backgroundColor: "#FAFAF8" }}>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">{t("acct.return.itemsLabel")}</span>
                <span className="font-bold text-ink">{formatPrice(refundItems)}</span>
              </div>
              {isFullReturn && (order.shippingCost ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">{t("acct.return.shippingFullOrder")}</span>
                  <span className="font-bold text-ink">{formatPrice(order.shippingCost ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-ink pt-1 border-t border-[#EAE4DC]">
                <span>{t("acct.return.estimatedRefund")}</span>
                <span>{formatPrice(refundTotal)}</span>
              </div>
              {!isFullReturn && (
                <p className="text-[11px] text-ink-muted">{t("acct.return.shippingNote")}</p>
              )}
            </div>
          </div>

          <div className="bg-canvas rounded-card border border-line p-5 text-sm space-y-2">
            <p><span className="font-bold text-ink">{t("acct.return.reasonColon")}</span> <span className="text-ink-soft">{meta ? returnReasonLabel(meta.code, t) : ""}</span></p>
            {description.trim() && <p><span className="font-bold text-ink">{t("acct.return.detailsColon")}</span> <span className="text-ink-soft">{description.trim()}</span></p>}
            {photos.length > 0 && <p><span className="font-bold text-ink">{t("acct.return.photosColon")}</span> <span className="text-ink-soft">{t("acct.return.attached").replace("{n}", String(photos.length))}</span></p>}
            <p><span className="font-bold text-ink">{t("acct.return.refundToColon")}</span> <span className="font-mono text-ink-soft">{iban}</span></p>
          </div>

          <div className="rounded-card bg-accent-soft border border-sage p-4 flex items-start gap-3">
            <span className="text-lg">🚚</span>
            <p className="text-xs text-accent-deep leading-relaxed">
              {t("acct.return.courierNote")}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-control bg-danger-soft border border-[#F5C6C6] px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-6">
        {step > 1 ? (
          <button
            onClick={() => { setError(""); setStep((s) => s - 1); }}
            className="px-6 py-3 rounded-control text-sm font-bold border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
          >
            ← {t("common.back")}
          </button>
        ) : (
          <Link
            href={`/account/orders/${orderNumber}`}
            className="px-6 py-3 rounded-control text-sm font-bold border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
          >
            {t("common.cancel")}
          </Link>
        )}
        {step < 3 ? (
          <button
            onClick={next}
            disabled={(step === 1 && !step1Ok) || (step === 2 && !step2Ok)}
            className="flex-1 py-3 rounded-full text-sm font-extrabold text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            {t("acct.return.continueBtn")} →
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-3 rounded-full text-sm font-extrabold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            {submitting ? t("acct.return.submitting") : t("acct.return.submitRequest")}
          </button>
        )}
      </div>
    </div>
  );
}
