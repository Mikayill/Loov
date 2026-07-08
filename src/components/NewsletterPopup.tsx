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
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

const STORAGE_KEY = "loov_newsletter_seen";
const PROMO_CODE = "LOOV10"; // the code promised in the copy below

export default function NewsletterPopup() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) return; // members already have access to promo codes
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
  }, [user]);

  function close() {
    setShow(false);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* */ }
  }

  function copyCode() {
    navigator.clipboard?.writeText(PROMO_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!show || user) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(42,35,32,0.65)", backdropFilter: "blur(6px)" }}
      onClick={close}
    >
      <div
        className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#9A8E88] hover:text-[#2A2320] hover:bg-white transition-all shadow-sm"
          aria-label="Close popup"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero */}
        <div
          className="px-8 pt-10 pb-7 text-center"
          style={{ background: "linear-gradient(135deg, #EAF2F0 0%, #F0E6F4 50%, #FFF5E8 100%)" }}
        >
          <div className="text-6xl mb-4">🌿</div>
          <h2 className="text-2xl font-extrabold text-[#2A2320] mb-2 leading-tight">
            {t("news.title")}
          </h2>
          <p className="text-[#5E5450] text-sm leading-relaxed">
            {t("news.body")}
          </p>
        </div>

        {/* Content */}
        <div className="px-7 pb-6 pt-5 text-center">
          <button
            className="bg-[#EAF2F0] border-2 border-dashed border-[#5E9E8C] rounded-2xl py-4 px-6 font-mono font-extrabold text-[#5E9E8C] text-2xl tracking-[0.2em] mb-1 w-full hover:bg-[#D8EDE9] transition-colors"
            onClick={copyCode}
            title={t("news.copyHint")}
          >
            {copied ? "✓" : PROMO_CODE}
          </button>
          <p className="text-[10px] text-[#9A8E88] mb-4">{t("news.copyHint")}</p>

          <Link
            href="/register"
            onClick={close}
            className="block w-full h-12 rounded-xl font-extrabold text-white text-sm leading-[48px] hover:opacity-90 active:scale-95 transition-all shadow-sm"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            {t("news.cta")} →
          </Link>
          <p className="text-xs text-[#9A8E88] mt-3">
            <Link href="/login" onClick={close} className="font-bold text-[#5E9E8C] hover:underline">
              {t("news.signin")}
            </Link>
          </p>
          <button
            onClick={close}
            className="w-full text-center text-xs text-[#C8B8B0] hover:text-[#9A8E88] transition-colors mt-2 py-1"
          >
            {t("news.noThanks")}
          </button>
        </div>

        {/* Social proof strip */}
        <div className="bg-[#F5F0EB] px-7 py-2.5 text-center border-t border-[#DDD5CC]">
          <p className="text-[10px] text-[#9A8E88] font-semibold">
            ⭐⭐⭐⭐⭐ {t("news.socialProof")}
          </p>
        </div>
      </div>
    </div>
  );
}
