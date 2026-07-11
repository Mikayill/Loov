"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";

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
          <Link href="/" className="inline-flex items-center mb-4" aria-label="Loov — home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Loov" className="h-6 w-auto" />
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
                <LinkButton href="/login" fullWidth>
                  {t("auth.backToSignIn")}
                </LinkButton>
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

              <Button type="submit" loading={loading} loadingText={t("auth.sending")} fullWidth>
                {t("auth.sendResetLink")} →
              </Button>
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
