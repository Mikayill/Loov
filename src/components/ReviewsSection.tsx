"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/context/LocaleContext";
import { fmtDate } from "@/lib/i18n/format";

interface Review {
  id: string;
  rating: number;
  body: string;
  name: string | null;
  createdAt: string;
  adminReply: string | null;
  adminReplyAt: string | null;
}
interface Stats { avg: number; count: number; breakdown: Record<number, number> }
interface Eligibility {
  signedIn: boolean;
  canReview: boolean;
  alreadyReviewed: boolean;
  myReviewStatus?: "published" | "hidden" | null;
}

function Stars({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={size} viewBox="0 0 20 20" fill={i <= rating ? "#F0B840" : "#DDD5CC"}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* Interactive rating input — generous tap target + instant touch feedback
   (mobile has no hover, so relying on hover alone made taps feel unresponsive). */
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
          <svg className="w-7 h-7 transition-transform hover:scale-110" viewBox="0 0 20 20" fill={i <= (hover || value) ? "#F0B840" : "#DDD5CC"}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ReviewsSection({ productId }: { productId: string }) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats>({ avg: 0, count: 0, breakdown: {} });
  const [elig, setElig] = useState<Eligibility>({ signedIn: false, canReview: false, alreadyReviewed: false });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [showName, setShowName] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setReviews(d.reviews ?? []);
      setStats(d.stats ?? { avg: 0, count: 0, breakdown: {} });
      setElig(d.eligibility ?? { signedIn: false, canReview: false, alreadyReviewed: false });
    } catch {
      // A failed fetch must NOT masquerade as "you can't review" — surface a
      // retry instead of quietly falling back to the signed-out defaults.
      setLoadFailed(true);
    }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    setError("");
    if (text.trim().length < 10) { setError(t("rev.reviewPlaceholder")); return; }
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, body: text.trim(), showName }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (d.ok) { setThanks(true); setText(""); setRating(5); await load(); }
    else if (d.code === "otp_required") {
      router.push("/login?verify=1");
    } else {
      // Server errors carry a `code` → show them in the shopper's language.
      const byCode: Record<string, string> = {
        too_short: t("rev.minChars").replace("{n}", String(Math.max(0, 10 - text.trim().length))),
        too_long: t("rev.reviewPlaceholder"),
        not_eligible: t("rev.onlyBuyers"),
        already_reviewed: t("rev.alreadyReviewed"),
        unavailable: t("rev.loadFailed"),
      };
      setError(byCode[d.code as string] ?? d.error ?? t("rev.loadFailed"));
    }
  }

  const fmtReviewDate = (iso: string) => fmtDate(iso, locale, "short");

  return (
    <section id="reviews" className="mt-16 pt-12 border-t border-line scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-ink mb-1">{t("pdp.reviewsTitle")}</h2>
          {stats.count > 0 ? (
            <div className="flex items-center gap-2">
              <Stars rating={Math.round(stats.avg)} />
              <span className="font-extrabold text-ink">{stats.avg.toFixed(1)}</span>
              <span className="text-sm text-ink-muted">· {t("pdp.reviewsCount").replace("{n}", String(stats.count))}</span>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{t("rev.noReviews")}</p>
          )}
        </div>

        {stats.count > 0 && (
          <div className="space-y-1.5 min-w-[180px]">
            {[5, 4, 3, 2, 1].map((star) => {
              const c = stats.breakdown[star] ?? 0;
              const pct = stats.count ? Math.round((c / stats.count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-ink-soft w-5 text-right">{star}</span>
                  <svg className="w-3 h-3 text-[#F0B840]" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  <div className="flex-1 h-2 bg-canvas rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#F0B840" }} />
                  </div>
                  <span className="text-xs text-ink-muted w-8">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Write-a-review area (purchase-gated) */}
      <div className="mb-8">
        {loading ? (
          /* Don't flash "sign in" / "only buyers" while eligibility is still loading */
          <div className="h-11 w-56 rounded-full bg-panel animate-pulse" />
        ) : loadFailed ? (
          <div className="flex items-center gap-3 text-sm text-ink-muted font-medium">
            <span>{t("rev.loadFailed")}</span>
            <button
              onClick={load}
              className="font-bold text-accent border-2 border-accent px-4 py-1.5 rounded-full hover:bg-accent-soft transition-colors"
            >
              {t("rev.retry")}
            </button>
          </div>
        ) : thanks ? (
          <div className="rounded-card bg-accent-soft border border-[#B9D9CF] p-4 text-sm font-semibold text-accent-deep">✓ {t("rev.thanks")}</div>
        ) : !elig.signedIn ? (
          <Link href="/login" className="inline-block text-sm font-bold text-accent border-2 border-accent px-5 py-2.5 rounded-full hover:bg-accent-soft transition-colors">
            {t("rev.signInToReview")} →
          </Link>
        ) : elig.myReviewStatus === "hidden" ? (
          <div className="rounded-card bg-amber-50 border border-amber-200 p-4 max-w-xl">
            <p className="text-sm font-semibold text-amber-700 mb-1">{t("rev.hiddenNotice")}</p>
            <Link href="/account/reviews" className="text-sm font-bold text-accent hover:underline">
              {t("rev.hiddenManage")} →
            </Link>
          </div>
        ) : elig.alreadyReviewed ? (
          <p className="text-sm text-ink-muted font-medium">{t("rev.alreadyReviewed")}</p>
        ) : elig.canReview ? (
          <div className="bg-white border border-line rounded-card p-5 max-w-xl">
            <p className="font-bold text-ink mb-3">{t("rev.writeReview")}</p>
            <p className="text-xs font-semibold text-ink-muted mb-1">{t("rev.yourRating")}</p>
            <RatingInput value={rating} onChange={setRating} />
            <p className="text-xs font-semibold text-ink-muted mt-4 mb-1">{t("rev.yourReview")}</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={t("rev.reviewPlaceholder")}
              className="w-full px-3 py-2 rounded-control border border-line text-sm outline-none focus:border-accent resize-y"
            />
            {/* Live length hint — the 10-char minimum otherwise looks like a bug */}
            <div className="flex items-center justify-between mt-1">
              <p className={`text-[11px] font-semibold ${text.trim().length > 0 && text.trim().length < 10 ? "text-amber-600" : "text-ink-muted"}`}>
                {text.trim().length < 10
                  ? t("rev.minChars").replace("{n}", String(Math.max(0, 10 - text.trim().length)))
                  : "✓"}
              </p>
              <p className="text-[11px] text-ink-muted">{text.length}/2000</p>
            </div>
            <label className="flex items-center gap-2 mt-3 text-sm text-ink-soft cursor-pointer">
              <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="w-4 h-4 accent-accent" />
              {t("rev.showName")}
            </label>
            {error && <p className="text-red-500 text-xs font-semibold mt-2">{error}</p>}
            <button
              onClick={submit}
              disabled={submitting || text.trim().length < 10}
              className="mt-4 px-6 h-11 rounded-control font-bold text-white text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#5E9E8C" }}
            >
              {submitting ? t("rev.submitting") : t("rev.submit")}
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink-muted font-medium flex items-center gap-2">
            <span>🔒</span>{t("rev.onlyBuyers")}
          </p>
        )}
      </div>

      {/* Review cards */}
      {loading ? (
        <div className="flex items-center justify-center py-10"><div className="w-6 h-6 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reviews.map((r) => {
            const display = r.name ?? t("rev.anon");
            return (
              <div key={r.id} className="bg-white border border-line rounded-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0" style={{ backgroundColor: "#5E9E8C" }}>
                      {display[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-ink text-sm leading-none mb-0.5">{display}</p>
                      <p className="text-[10px] text-ink-muted">{fmtReviewDate(r.createdAt)}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">✓ {t("rev.verified")}</span>
                </div>
                <Stars rating={r.rating} size="w-3.5 h-3.5" />
                <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">{r.body}</p>
                {r.adminReply && (
                  <div className="rounded-control bg-accent-soft border border-sage p-3">
                    <p className="text-xs font-extrabold text-accent-deep mb-1">Loov 🌿</p>
                    <p className="text-sm text-accent-deep whitespace-pre-line">{r.adminReply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
