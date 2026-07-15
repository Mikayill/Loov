"use client";

/**
 * My Reviews — the signed-in user's product reviews (FAZ 7).
 *  · list own reviews (admin-hidden ones flagged), inline edit + delete
 *  · "Awaiting review" — delivered products without a review yet
 */

import { useEffect, useMemo, useState } from "react";
import GhostRows from "@/components/GhostRows";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { fmtDate } from "@/lib/i18n/format";
import { useProductsByIds } from "@/lib/db/useProductsByIds";
import { fetchMyOrders } from "@/lib/db/myOrders";
import type { Product } from "@/types";

interface MyReview {
  id: string;
  productId: string;
  rating: number;
  body: string;
  showName: boolean;
  status: "published" | "hidden";
  createdAt: string;
  adminReply: string | null;
  adminReplyAt: string | null;
}

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function Stars({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={size} viewBox="0 0 20 20" fill={i <= rating ? "#F0B840" : "var(--color-line)"}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

function RatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-1.5 touch-manipulation active:scale-90 transition-transform"
          aria-label={`${i} star${i === 1 ? "" : "s"}`}
        >
          <svg className="w-7 h-7 transition-transform hover:scale-110" viewBox="0 0 20 20" fill={i <= (hover || value) ? "#F0B840" : "var(--color-line)"}>
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  );
}

function ProductThumb({ product }: { product: Product | undefined }) {
  return (
    <div
      className="w-14 h-14 rounded-control flex items-center justify-center text-2xl overflow-hidden flex-shrink-0"
      style={{ backgroundColor: product?.cardColor ?? "#EAE4DC" }}
    >
      {product?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
      ) : (
        <span>{product?.emoji ?? "🍼"}</span>
      )}
    </div>
  );
}

export default function MyReviewsClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t } = useLocale();

  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [awaiting, setAwaiting] = useState<string[]>([]); // productIds without a review
  const [fetching, setFetching] = useState(true);

  /* Edit state */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");
  const [editShowName, setEditShowName] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  /* Delete state (two-step inline confirm) */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/reviews?mine=1").then((r) => r.json()).catch(() => ({ reviews: [] })),
      fetchMyOrders().catch(() => []),
    ]).then(([revData, orders]) => {
      if (cancelled) return;
      const mine: MyReview[] = revData.reviews ?? [];
      setReviews(mine);
      /* Delivered products the user hasn't reviewed yet. */
      const reviewedIds = new Set(mine.map((r) => r.productId));
      const deliveredIds: string[] = [];
      for (const order of orders) {
        if (order.status !== "Delivered") continue;
        for (const item of order.items) {
          if (item.productId && !reviewedIds.has(item.productId) && !deliveredIds.includes(item.productId)) {
            deliveredIds.push(item.productId);
          }
        }
      }
      setAwaiting(deliveredIds);
      setFetching(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  // Only the ids that actually appear in this user's reviews/awaiting list —
  // typically a handful, never the whole catalog.
  const neededIds = useMemo(
    () => [...new Set([...reviews.map((r) => r.productId), ...awaiting])],
    [reviews, awaiting]
  );
  const relatedProducts = useProductsByIds(neededIds);
  const productMap = new Map(relatedProducts.map((p) => [p.id, p]));

  function startEdit(r: MyReview) {
    setEditingId(r.id);
    setEditRating(r.rating);
    setEditText(r.body);
    setEditShowName(r.showName);
    setEditError("");
    setConfirmDeleteId(null);
  }

  async function saveEdit(id: string) {
    setEditError("");
    setSaving(true);
    const res = await fetch("/api/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, rating: editRating, body: editText.trim(), showName: editShowName }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!d.ok) {
      if (d.code === "otp_required") { router.push("/login?verify=1"); return; }
      setEditError(d.error || t("checkout.errGeneric")); return;
    }
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rating: editRating, body: editText.trim(), showName: editShowName } : r))
    );
    setEditingId(null);
  }

  async function deleteReview(id: string) {
    setDeleting(true);
    const res = await fetch(`/api/reviews?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setDeleting(false);
    setConfirmDeleteId(null);
    if (d.code === "otp_required") { router.push("/login?verify=1"); return; }
    if (!d.ok) return;
    const removed = reviews.find((r) => r.id === id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    /* The product becomes reviewable again. */
    if (removed && !awaiting.includes(removed.productId)) {
      setAwaiting((prev) => [removed.productId, ...prev]);
    }
  }

  if (loading || !user || fetching) {
    return (
      <GhostRows variant="list" rows={3} listHeader={false} />
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
        <span className="text-ink font-semibold">{t("acct.reviews.title")}</span>
      </nav>

      <h1 className="text-2xl font-extrabold text-ink mb-1">{t("acct.reviews.title")}</h1>
      <p className="text-sm text-ink-muted mb-8">
        {t("acct.reviews.subtitle")}
      </p>

      {/* ── My reviews ── */}
      {reviews.length === 0 ? (
        <div className="bg-canvas rounded-card border border-line p-12 text-center">
          <span className="text-5xl block mb-4">⭐</span>
          <h2 className="text-lg font-extrabold text-ink mb-2">{t("acct.reviews.empty")}</h2>
          <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">
            {t("acct.reviews.emptyBody")}
          </p>
          <Link
            href="/account/orders"
            className="u-btn inline-block font-bold px-7 py-3 rounded-control text-white text-sm transition-colors bg-ink hover:bg-ink/85"
          >
            {t("acct.reviews.viewOrders")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const product = productMap.get(r.productId);
            const isEditing = editingId === r.id;
            return (
              <div key={r.id} className="bg-canvas rounded-card border border-line p-5">
                <div className="flex items-start gap-4">
                  <ProductThumb product={product} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        {product?.slug ? (
                          <Link href={`/products/${product.slug}`} className="font-bold text-ink text-sm hover:text-accent transition-colors">
                            {product.name}
                          </Link>
                        ) : (
                          <p className="font-bold text-ink text-sm">{t("acct.reviews.productFallback")}</p>
                        )}
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          {fmtDate(r.createdAt, locale, "long")}
                          {" · "}
                          {r.showName ? t("acct.reviews.nameShown") : t("acct.reviews.anonymous")}
                        </p>
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {confirmDeleteId === r.id ? (
                            <>
                              <span className="text-xs font-semibold text-danger">{t("acct.reviews.confirmDelete")}</span>
                              <button
                                onClick={() => deleteReview(r.id)}
                                disabled={deleting}
                                className="text-xs font-bold text-white px-3 py-1.5 rounded-lg bg-danger hover:opacity-90 disabled:opacity-60 transition-opacity"
                              >
                                {deleting ? t("acct.reviews.deleting") : t("acct.reviews.delete")}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs font-bold text-ink-soft px-3 py-1.5 rounded-lg border border-line hover:border-ink-muted transition-colors"
                              >
                                {t("acct.reviews.cancel")}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(r)}
                                className="text-xs font-bold text-accent px-3 py-1.5 rounded-lg border border-accent hover:bg-panel transition-colors"
                              >
                                {t("acct.reviews.edit")}
                              </button>
                              <button
                                onClick={() => { setConfirmDeleteId(r.id); setEditingId(null); }}
                                className="text-xs font-bold text-danger px-3 py-1.5 rounded-lg border border-[#E8C4C4] hover:bg-[#FBF0F0] transition-colors"
                              >
                                {t("acct.reviews.delete")}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {r.status === "hidden" && (
                      <div className="mt-2 rounded-lg bg-warning-soft border border-warning-border px-3 py-2 text-xs text-warning font-semibold">
                        ⚠️ {t("acct.reviews.hiddenNotice")}
                      </div>
                    )}

                    {isEditing ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-ink-muted mb-1">{t("rev.yourRating")}</p>
                        <RatingInput value={editRating} onChange={setEditRating} />
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={4}
                          maxLength={2000}
                          className="mt-3 w-full px-3 py-2 rounded-control border border-line text-sm outline-none focus:border-accent resize-y"
                        />
                        <label className="flex items-center gap-2 mt-2 text-sm text-ink-soft cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editShowName}
                            onChange={(e) => setEditShowName(e.target.checked)}
                            className="w-4 h-4 accent-accent"
                          />
                          {t("acct.reviews.showNameCheckbox")}
                        </label>
                        {editError && <p className="text-danger text-xs font-semibold mt-2">{editError}</p>}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => saveEdit(r.id)}
                            disabled={saving || editText.trim().length < 10}
                            className="u-btn px-5 h-10 rounded-control font-bold text-white text-sm disabled:opacity-50 transition-colors bg-ink hover:bg-ink/85"
                          >
                            {saving ? t("acct.reviews.saving") : t("acct.reviews.saveChanges")}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-5 h-10 rounded-control font-bold text-sm text-ink-soft border border-line hover:border-ink-muted transition-colors"
                          >
                            {t("acct.reviews.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-2"><Stars rating={r.rating} /></div>
                        <p className="mt-2 text-sm text-ink-soft leading-relaxed whitespace-pre-line">{r.body}</p>
                        {r.adminReply && (
                          <div className="mt-3 rounded-control bg-accent-soft border border-sage p-3">
                            <p className="text-xs font-extrabold text-accent-deep mb-1">Loov 🌿</p>
                            <p className="text-sm text-accent-deep whitespace-pre-line">{r.adminReply}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Awaiting review ── */}
      {awaiting.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-ink mb-1">{t("acct.reviews.awaitingTitle")}</h2>
          <p className="text-sm text-ink-muted mb-4">{t("acct.reviews.awaitingSubtitle")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {awaiting.map((pid) => {
              const product = productMap.get(pid);
              if (!product) return null;
              return (
                <div key={pid} className="bg-canvas rounded-card border border-line p-4 flex items-center gap-3">
                  <ProductThumb product={product} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm truncate">{product.name}</p>
                    <Link
                      href={`/products/${product.slug}#reviews`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline mt-1"
                    >
                      {t("acct.reviews.writeReview")} →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
