"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "loov_newsletter_seen";
const PROMO_CODE = "LOOV10";

export default function NewsletterPopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setShow(true), 45000);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setShow(false);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* */ }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitted(true);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* */ }
  }

  if (!show) return null;

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
          aria-label="Close newsletter popup"
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
            10% off your<br />first order
          </h2>
          <p className="text-[#5E5450] text-sm leading-relaxed">
            Join thousands of happy parents. Get exclusive deals,<br />
            parenting tips, and early access to new arrivals.
          </p>
        </div>

        {/* Content */}
        <div className="px-7 pb-6 pt-5">
          {!submitted ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="your@email.com"
                    className={`w-full h-12 px-4 rounded-xl border-2 text-sm font-medium outline-none transition-colors ${
                      error
                        ? "border-red-400 focus:border-red-400"
                        : "border-[#DDD5CC] focus:border-[#5E9E8C]"
                    }`}
                  />
                  {error && <p className="text-xs text-red-400 font-semibold mt-1.5">{error}</p>}
                </div>
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl font-extrabold text-white text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  style={{ backgroundColor: "#5E9E8C" }}
                >
                  Get My 10% Off →
                </button>
              </form>
              <p className="text-center text-[10px] text-[#9A8E88] mt-3">
                No spam. Unsubscribe anytime.
              </p>
              <button
                onClick={close}
                className="w-full text-center text-xs text-[#C8B8B0] hover:text-[#9A8E88] transition-colors mt-1.5 py-1"
              >
                No thanks, I&apos;ll pay full price
              </button>
            </>
          ) : (
            <div className="text-center py-3">
              <div className="text-5xl mb-4">🎉</div>
              <p className="font-extrabold text-[#2A2320] text-xl mb-1">Welcome to the family!</p>
              <p className="text-sm text-[#5E5450] mb-4">Your exclusive discount code:</p>
              <button
                className="bg-[#EAF2F0] border-2 border-dashed border-[#5E9E8C] rounded-2xl py-4 px-6 font-mono font-extrabold text-[#5E9E8C] text-2xl tracking-[0.2em] mb-1 w-full hover:bg-[#D8EDE9] transition-colors"
                onClick={() => navigator.clipboard?.writeText(PROMO_CODE)}
                title="Click to copy"
              >
                {PROMO_CODE}
              </button>
              <p className="text-[10px] text-[#9A8E88] mb-5">Click to copy · Valid for 30 days</p>
              <button
                onClick={close}
                className="w-full h-11 rounded-xl font-extrabold text-white text-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#5E9E8C" }}
              >
                Start Shopping →
              </button>
            </div>
          )}
        </div>

        {/* Social proof strip */}
        {!submitted && (
          <div className="bg-[#F5F0EB] px-7 py-2.5 text-center border-t border-[#DDD5CC]">
            <p className="text-[10px] text-[#9A8E88] font-semibold">
              ⭐⭐⭐⭐⭐ Loved by{" "}
              <strong className="text-[#5E5450]">1,200+ families</strong> across Georgia
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
