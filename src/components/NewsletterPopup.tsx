"use client";

/**
 * Sign-up promo popup — offers the first-order promo code to GUESTS and
 * routes them to /register (promo codes are members-only, so collecting
 * bare emails here would just invite abuse).
 *
 * Honesty guard: before showing, it asks the server whether the promised
 * code is still live (active, not expired, limit not reached). If the admin
 * deleted or paused it in /admin/promos, the popup simply never appears.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { useDelayedUnmount } from "@/hooks/useDelayedUnmount";

const STORAGE_KEY = "loov_newsletter_seen";
const PROMO_CODE = "LOOV10"; // the code promised in the copy below
/** Popping this up while someone is mid-login/register is redundant and
 *  annoying — they're already on their way to an account. */
const EXCLUDED_PATHS = ["/login", "/register"];

export default function NewsletterPopup() {
  const { t } = useLocale();
  const { user } = useAuth();
  const pathname = usePathname();
  const excluded = EXCLUDED_PATHS.includes(pathname ?? "");
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user || excluded) return; // members already have access to promo codes
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        // Never promise a dead code — check it's still live first.
        const res = await fetch(`/api/promo?code=${PROMO_CODE}`);
        const d = await res.json().catch(() => ({}));
        if (!d.available) return;
      } catch {
        return; // can't verify → don't promise
      }
      setShow(true);
    }, 45000);
    return () => clearTimeout(timer);
  }, [user, excluded]);

  function close() {
    setShow(false);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* */ }
  }

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  function copyCode() {
    navigator.clipboard?.writeText(PROMO_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const shouldRender = useDelayedUnmount(show, 180);
  if (!shouldRender || user || excluded) return null;

  return (
    <div
      className={`fixed inset-0 z-[600] flex items-center justify-center p-4 ${show ? "animate-fade-in" : "animate-fade-out"}`}
      style={{ backgroundColor: "rgba(42,35,32,0.45)", backdropFilter: "blur(3px)" }}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-popup-title"
        className={`relative bg-white rounded-card max-w-sm w-full overflow-hidden shadow-xl border border-panel ${show ? "animate-pop-in" : "animate-pop-out"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-ink-muted hover:text-ink hover:bg-panel transition-all"
          aria-label="Close popup"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero */}
        <div className="px-6 pt-8 pb-5 text-center bg-canvas">
          <div className="text-4xl mb-2.5">🌿</div>
          <h2 id="newsletter-popup-title" className="text-lg font-extrabold text-ink mb-1.5 leading-tight">
            {t("news.title")}
          </h2>
          <p className="text-ink-soft text-xs leading-relaxed">
            {t("news.body")}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4 text-center">
          <button
            className="bg-accent-soft border-2 border-dashed border-accent rounded-control py-2.5 px-4 font-mono font-extrabold text-accent text-lg tracking-[0.2em] mb-1 w-full hover:bg-[#D8EDE9] transition-colors"
            onClick={copyCode}
            title={t("news.copyHint")}
          >
            {copied ? "✓" : PROMO_CODE}
          </button>
          <p className="text-[10px] text-ink-muted mb-3.5">{t("news.copyHint")}</p>

          <Link
            href="/register"
            onClick={close}
            className="block w-full h-10 rounded-control font-extrabold text-white text-sm leading-[40px] hover:opacity-90 active:scale-95 transition-all"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            {t("news.cta")} →
          </Link>
          <p className="text-xs text-ink-muted mt-2.5">
            <Link href="/login" onClick={close} className="font-bold text-accent hover:underline">
              {t("news.signin")}
            </Link>
          </p>
          <button
            onClick={close}
            className="w-full text-center text-[11px] text-[#C8B8B0] hover:text-ink-muted transition-colors mt-1.5 py-1"
          >
            {t("news.noThanks")}
          </button>
        </div>
      </div>
    </div>
  );
}
