"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

export default function ForgotPasswordClient() {
  const { t } = useLocale();
  const { sendPasswordReset } = useAuth();
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError(t("auth.validEmail"));
      return;
    }
    setError("");
    setLoading(true);
    const res = await sendPasswordReset(email);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🌿</span>
            <span className="text-2xl font-extrabold text-[#2A2320]">Loov</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-[#2A2320]">{t("auth.resetPassword")}</h1>
          <p className="text-[#9A8E88] text-sm mt-1">
            {submitted
              ? t("auth.checkInbox")
              : t("auth.enterEmailReset")}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#DDD5CC] shadow-sm p-7">
          {submitted ? (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#EAF2F0] flex items-center justify-center text-3xl mx-auto shadow-sm">
                📧
              </div>
              <div>
                <p className="font-extrabold text-[#2A2320] mb-2">{t("auth.emailSent")}</p>
                <p className="text-sm text-[#5E5450] leading-relaxed">
                  {t("auth.resetSentTo").split("{email}")[0]}
                  <span className="font-bold text-[#2A2320]">{email}</span>
                  {t("auth.resetSentTo").split("{email}")[1]}
                </p>
              </div>
              <div className="pt-2 space-y-3">
                <p className="text-xs text-[#9A8E88]">
                  {t("auth.didntReceive")}{" "}
                  <button
                    onClick={() => { setSubmitted(false); setEmail(""); }}
                    className="font-bold text-[#5E9E8C] hover:underline"
                  >
                    {t("auth.tryAgain")}
                  </button>
                </p>
                <Link
                  href="/login"
                  className="block w-full h-11 rounded-xl font-extrabold text-white text-sm transition-all hover:opacity-90 active:scale-95 flex items-center justify-center"
                  style={{ backgroundColor: "#5E9E8C" }}
                >
                  {t("auth.backToSignIn")}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#2A2320] mb-1.5">
                  {t("auth.emailAddress")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  required
                  className="w-full h-11 px-4 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium text-[#2A2320] placeholder:text-[#C8B8B0] focus:border-[#5E9E8C] outline-none transition-colors"
                />
                {error && (
                  <p className="text-red-400 text-xs font-semibold mt-1.5">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-extrabold text-white text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#5E9E8C" }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    {t("auth.sending")}
                  </>
                ) : (
                  `${t("auth.sendResetLink")} →`
                )}
              </button>

              <div className="bg-[#F5F0EB] rounded-xl p-3 flex items-start gap-2">
                <span className="text-sm flex-shrink-0">💡</span>
                <p className="text-xs text-[#5E5450] leading-relaxed">
                  {t("auth.demoModeNote")}
                </p>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[#9A8E88] mt-5">
          {t("auth.rememberPassword")}{" "}
          <Link href="/login" className="font-bold text-[#5E9E8C] hover:underline">
            {t("auth.signIn")} →
          </Link>
        </p>
      </div>
    </div>
  );
}
