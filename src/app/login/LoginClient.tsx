"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { PHONE_COUNTRY_CODE, PHONE_LOCAL_PLACEHOLDER, phoneLocalPart, withCountryCode } from "@/lib/georgia";

type Tab = "email" | "phone";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginClient() {
  const router = useRouter();
  const { t } = useLocale();
  const { signInWithEmail, signInWithGoogle, sendPhoneOtp, signInWithPhone,
    sendEmailOtp, verifyEmailOtp, checkTrustedDevice, trustThisDevice, signOut,
    mfaRequired, verifyTotp, sendPhoneFactorCode, verifyPhoneFactor } = useAuth();

  const [tab,        setTab]        = useState<Tab>("email");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [phone,      setPhone]      = useState("");
  const [otp,        setOtp]        = useState("");
  const [otpSent,    setOtpSent]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [socialLoad, setSocialLoad] = useState<"google" | null>(null);
  const [error,      setError]      = useState("");
  /* Mandatory email-OTP step — set once the password was right but this
     browser isn't a trusted device yet. Not shown for Google or phone-OTP
     sign-in (Google is already strongly verified; phone login IS a code). */
  const [emailOtpStep, setEmailOtpStep] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  /* Authenticator-app / SMS 2FA challenge — takes precedence over email-OTP
     when the account has a verified factor (it's the stronger check). */
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<"totp" | "phone">("totp");
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  /* 60s matches Supabase's SMTP "minimum interval per user" — a shorter
     cooldown here would let the shopper hit a rate-limit error on resend. */
  const [resendCooldown, setResendCooldown] = useState(60);

  /* Surface errors from /auth/callback (?error=...) and the OTP-gate bounce
     (?verify=1, when someone opened a protected page before verifying). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(err);
    else if (params.get("verify") === "1") setError(t("auth.verifyNeeded"));
  }, [t]);

  /* Resend cooldown countdown — 60s between sends (matches Supabase's SMTP interval). */
  useEffect(() => {
    if (!emailOtpStep) return;
    const id = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [emailOtpStep]);

  /** Server side of the OTP step — see /api/auth/otp-gate + proxy.ts. */
  function setOtpGate(action: "open" | "close") {
    return fetch("/api/auth/otp-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => {});
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await signInWithEmail(email, password);
    if (res.error) { setLoading(false); setError(res.error); return; }
    /* If the account has a verified authenticator-app (or SMS) factor, that
       stronger check wins over the automatic email code. */
    const mfa = await mfaRequired();
    if (mfa.required && mfa.factorId) {
      setMfaFactorId(mfa.factorId);
      if (mfa.type === "phone") {
        setMfaMethod("phone");
        const ch = await sendPhoneFactorCode(mfa.factorId);
        setLoading(false);
        if (ch.error) { setError(ch.error); return; }
        setMfaChallengeId(ch.challengeId ?? null);
        return;
      }
      setMfaMethod("totp");
      setLoading(false);
      return;
    }
    /* No authenticator factor → automatic email-OTP, skipped on trusted devices. */
    const trusted = await checkTrustedDevice();
    if (trusted) { setLoading(false); router.push("/account"); return; }
    await setOtpGate("open");
    const sendRes = await sendEmailOtp(email);
    setLoading(false);
    if (sendRes.error) { setError(sendRes.error); return; }
    setEmailOtpStep(true);
    setResendCooldown(60);
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId) return;
    setError(""); setLoading(true);
    const res = mfaMethod === "phone" && mfaChallengeId
      ? await verifyPhoneFactor(mfaFactorId, mfaChallengeId, mfaCode)
      : await verifyTotp(mfaFactorId, mfaCode);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    router.push("/account"); // AAL2 elevation — no email-OTP gate needed
  }

  function cancelMfa() {
    signOut();
    setMfaFactorId(null);
    setMfaChallengeId(null);
    setMfaCode("");
    setError("");
  }

  async function handleEmailOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await verifyEmailOtp(email, emailOtpCode);
    if (res.error) { setLoading(false); setError(res.error); return; }
    if (rememberDevice) await trustThisDevice();
    await setOtpGate("close");
    setLoading(false);
    router.push("/account");
  }

  async function handleResendEmailOtp() {
    if (resendCooldown > 0) return;
    setError(""); setLoading(true);
    const res = await sendEmailOtp(email);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setResendCooldown(60);
  }

  function cancelEmailOtp() {
    setOtpGate("close");
    signOut();
    setEmailOtpStep(false);
    setEmailOtpCode("");
    setError("");
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) { setError(t("auth.enterPhone")); return; }
    setError(""); setLoading(true);
    const res = await sendPhoneOtp(phone);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setOtpSent(true);
  }

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await signInWithPhone(phone, otp);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    router.push("/account");
  }

  async function handleSocial(provider: "google") {
    setError(""); setSocialLoad(provider);
    const res = await signInWithGoogle();
    if (res.error) { setSocialLoad(null); setError(res.error); }
    /* On success the browser redirects to the provider — keep the spinner. */
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
          <h1 className="text-2xl font-extrabold text-[#2A2320]">{t("auth.welcomeBack")}</h1>
          <p className="text-[#9A8E88] text-sm mt-1">{t("auth.signInSubtitle")}</p>
        </div>

        <div className="bg-white rounded-3xl border border-[#DDD5CC] shadow-sm p-7 space-y-5">

          {/* ── Authenticator-app / SMS 2FA step (takes precedence over email-OTP) ── */}
          {mfaFactorId ? (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">🛡️</div>
                <p className="font-extrabold text-[#2A2320]">{t("auth.mfaTitle")}</p>
                <p className="text-sm text-[#9A8E88] mt-1">{mfaMethod === "phone" ? t("auth.mfaBodyPhone") : t("auth.mfaBody")}</p>
              </div>
              <input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                autoFocus
                className="w-full h-12 px-4 rounded-xl border-2 border-[#DDD5CC] text-xl font-extrabold tracking-[0.4em] text-center outline-none focus:border-[#5E9E8C]"
              />
              {error && <p className="text-red-400 text-xs font-semibold text-center">{error}</p>}
              <Button type="submit" disabled={mfaCode.length !== 6} loading={loading} loadingText={t("auth.verifying")} fullWidth>
                {t("auth.verifyAndSignIn")} →
              </Button>
              <button type="button" onClick={cancelMfa} className="w-full text-center text-xs font-semibold text-[#9A8E88] hover:text-[#5E5450] transition-colors">
                {t("auth.mfaCancel")}
              </button>
            </form>
          ) : /* ── Mandatory email-OTP step: password accepted, new/unremembered device ── */
          emailOtpStep ? (
            <form onSubmit={handleEmailOtpVerify} className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">📧</div>
                <p className="font-extrabold text-[#2A2320]">{t("auth.emailOtpTitle")}</p>
                <p className="text-sm text-[#9A8E88] mt-1">{t("auth.emailOtpBody").replace("{email}", email)}</p>
              </div>
              <input
                value={emailOtpCode}
                onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                placeholder="123456"
                autoFocus
                className="w-full h-12 px-4 rounded-xl border-2 border-[#DDD5CC] text-xl font-extrabold tracking-[0.4em] text-center outline-none focus:border-[#5E9E8C]"
              />
              <label className="flex items-center gap-2 text-xs text-[#5E5450] font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#5E9E8C]"
                />
                {t("auth.emailOtpRemember")}
              </label>
              {error && <p className="text-red-400 text-xs font-semibold text-center">{error}</p>}
              <Button
                type="submit" disabled={emailOtpCode.length < 6} loading={loading} loadingText={t("auth.verifying")} fullWidth
              >
                {t("auth.verifyAndSignIn")} →
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={cancelEmailOtp}
                  className="text-xs font-semibold text-[#9A8E88] hover:text-[#5E5450] transition-colors"
                >
                  {t("auth.mfaCancel")}
                </button>
                <button
                  type="button"
                  onClick={handleResendEmailOtp}
                  disabled={resendCooldown > 0}
                  className="text-xs font-semibold text-[#5E9E8C] hover:underline disabled:text-[#C8B8B0] disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? t("auth.emailOtpResendIn").replace("{n}", String(resendCooldown)) : t("auth.emailOtpResend")}
                </button>
              </div>
            </form>
          ) : (
          <>
          {/* Social buttons */}
          <div>
            <button
              onClick={() => handleSocial("google")}
              disabled={!!socialLoad}
              className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border-2 border-[#DDD5CC] font-semibold text-sm text-[#2A2320] hover:border-[#9A8E88] hover:bg-[#FAFAFA] transition-all active:scale-95 disabled:opacity-60"
            >
              {socialLoad === "google" ? <Spinner /> : <GoogleIcon />}
              <span>{t("auth.google")}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#DDD5CC]" />
            <span className="text-xs font-bold text-[#9A8E88]">{t("auth.or")}</span>
            <div className="flex-1 h-px bg-[#DDD5CC]" />
          </div>

          {/* Tab switcher */}
          <div className="flex bg-[#F5F0EB] rounded-xl p-1 gap-1">
            {(["email", "phone"] as Tab[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => { setTab(tabKey); setError(""); setOtpSent(false); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  tab === tabKey ? "bg-white text-[#2A2320] shadow-sm" : "text-[#9A8E88] hover:text-[#5E5450]"
                }`}
              >
                {tabKey === "email" ? t("auth.tabEmail") : t("auth.tabPhone")}
              </button>
            ))}
          </div>

          {/* Email form */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("auth.emailAddress")}</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full h-11 px-4 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium text-[#2A2320] placeholder:text-[#C8B8B0] focus:border-[#5E9E8C] outline-none transition-colors"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#2A2320]">{t("auth.password")}</label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-[#5E9E8C] hover:underline">{t("auth.forgotPassword")}</Link>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full h-11 px-4 pr-11 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium text-[#2A2320] placeholder:text-[#C8B8B0] focus:border-[#5E9E8C] outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8E88] hover:text-[#5E5450] transition-colors">
                    {showPass
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>
              {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
              <Button type="submit" loading={loading} loadingText={t("auth.signingIn")} fullWidth>
                {t("auth.signInBtn")} →
              </Button>
            </form>
          )}

          {/* Phone form */}
          {tab === "phone" && (
            <form onSubmit={otpSent ? handlePhoneLogin : handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("auth.phoneNumber")}</label>
                <div className={`flex items-stretch h-11 rounded-xl border-2 border-[#DDD5CC] bg-white overflow-hidden focus-within:border-[#5E9E8C] transition-colors ${otpSent ? "opacity-60" : ""}`}>
                  <span className="flex items-center pl-4 pr-2 text-sm font-bold text-[#5E5450] bg-[#F5F0EB] border-r-2 border-[#DDD5CC] select-none">{PHONE_COUNTRY_CODE}</span>
                  <input
                    type="tel" value={phoneLocalPart(phone)} onChange={(e) => setPhone(withCountryCode(e.target.value))}
                    placeholder={PHONE_LOCAL_PLACEHOLDER} required disabled={otpSent}
                    className="flex-1 min-w-0 h-full px-4 bg-transparent text-sm font-medium text-[#2A2320] placeholder:text-[#C8B8B0] outline-none disabled:bg-[#F5F0EB]"
                  />
                </div>
              </div>
              {otpSent && (
                <div>
                  <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("auth.verificationCode")}</label>
                  <input
                    type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code" maxLength={6} required
                    className="w-full h-11 px-4 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium text-[#2A2320] placeholder:text-[#C8B8B0] focus:border-[#5E9E8C] outline-none transition-colors tracking-widest text-center"
                  />
                  <p className="text-xs text-[#9A8E88] mt-1.5 text-center">
                    {t("auth.codeSentTo").replace("{phone}", phone)}{" "}
                    <button type="button" className="text-[#5E9E8C] font-semibold hover:underline"
                      onClick={() => { setOtpSent(false); setOtp(""); }}>
                      {t("auth.changeNumber")}
                    </button>
                  </p>
                </div>
              )}
              {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
              <Button
                type="submit" loading={loading}
                loadingText={otpSent ? t("auth.verifying") : t("auth.sending")}
                fullWidth
              >
                {otpSent ? `${t("auth.verifyAndSignIn")} →` : `${t("auth.sendCode")} →`}
              </Button>
            </form>
          )}
          </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[#9A8E88] mt-5">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="font-bold text-[#5E9E8C] hover:underline">{t("auth.createOne")} →</Link>
        </p>
      </div>
    </div>
  );
}
