"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import Button from "@/components/ui/Button";
import Wordmark from "@/components/Wordmark";
import Spinner from "@/components/ui/Spinner";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/** Site-wide minimum: at least 8 characters and at least one digit. */
function isValidPassword(password: string): boolean {
  return password.length >= 8 && /\d/.test(password);
}

function PasswordStrength({ password, t }: { password: string; t: (key: TranslationKey) => string }) {
  const strength = password.length === 0 ? 0 : !isValidPassword(password) ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) ? 4 : 3;
  const labels = ["", t("auth.strengthWeak"), t("auth.strengthFair"), t("auth.strengthGood"), t("auth.strengthStrong")];
  const colors = ["", "#EF4444", "#F59E0B", "#3B82F6", "var(--color-accent)"];
  if (!password) return null;
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map((i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-colors" style={{ backgroundColor: i <= strength ? colors[strength] : "var(--color-line)" }} />
        ))}
      </div>
      <p className="text-[10px] font-semibold" style={{ color: colors[strength] }}>{labels[strength]}</p>
    </div>
  );
}

export default function RegisterClient() {
  const router = useRouter();
  const { t } = useLocale();
  const { signUpWithEmail, signInWithGoogle, verifySignupCode, resendSignupCode } = useAuth();

  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [agreed,     setAgreed]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [socialLoad, setSocialLoad] = useState<"google" | null>(null);
  const [error,      setError]      = useState("");
  const [errorCode,  setErrorCode]  = useState<string | undefined>(undefined);
  /* Email confirmation pending — either click the link we sent, or (once the
     Supabase email template includes {{ .Token }}) type the code instead. */
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [signupCode, setSignupCode] = useState("");
  const [codeBusy,   setCodeBusy]   = useState(false);
  const [codeError,  setCodeError]  = useState("");
  const [resendLeft, setResendLeft] = useState(60);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { setError(t("auth.agreeToTermsFirst")); setErrorCode(undefined); return; }
    if (!isValidPassword(password)) { setError(t("auth.passwordMin8Digit")); setErrorCode(undefined); return; }
    if (password !== confirm) { setError(t("auth.passwordsNoMatch")); setErrorCode(undefined); return; }
    setError(""); setErrorCode(undefined); setLoading(true);
    const res = await signUpWithEmail(name, email, password);
    setLoading(false);
    if (res.error) { setError(res.error); setErrorCode(res.errorCode); return; }
    /* Email confirmation required — show the code-entry step instead of redirecting */
    if (res.info) { setPendingConfirm(true); setResendLeft(60); return; }
    router.push("/account");
  }

  /* Resend cooldown countdown (60s matches Supabase's per-user SMTP interval). */
  useEffect(() => {
    if (!pendingConfirm) return;
    const id = setInterval(() => setResendLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [pendingConfirm]);

  async function handleVerifySignupCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(""); setCodeBusy(true);
    const res = await verifySignupCode(email, signupCode);
    setCodeBusy(false);
    if (res.error) { setCodeError(res.error); return; }
    router.push("/account");
  }

  async function handleResendSignupCode() {
    if (resendLeft > 0) return;
    setCodeError(""); setCodeBusy(true);
    const res = await resendSignupCode(email);
    setCodeBusy(false);
    if (res.error) { setCodeError(res.error); return; }
    setResendLeft(60);
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
            <Wordmark className="text-[26px] text-ink" />
          </Link>
          <h1 className="text-2xl font-extrabold text-ink">{t("auth.createAccount")}</h1>
          <p className="text-ink-muted text-sm mt-1">{t("auth.joinFamily")}</p>
        </div>

        <div className="bg-canvas rounded-card border border-line shadow-sm p-7 space-y-5">

          {pendingConfirm ? (
            /* Email confirmation pending — type the code we emailed (or click the link in it) */
            <form onSubmit={handleVerifySignupCode} className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">📬</div>
                <p className="font-extrabold text-ink">{t("auth.confirmEmailTitle")}</p>
                <p className="text-sm text-ink-muted mt-1">{t("auth.confirmEmailBody").replace("{email}", email)}</p>
              </div>
              <input
                value={signupCode}
                onChange={(e) => setSignupCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                placeholder="123456"
                autoFocus
                className="w-full h-12 px-4 rounded-control border border-line text-xl font-extrabold tracking-[0.4em] text-center outline-none focus:border-accent"
              />
              {codeError && <p className="text-red-400 text-xs font-semibold text-center">{codeError}</p>}
              <Button type="submit" disabled={signupCode.length < 6} loading={codeBusy} loadingText={t("auth.verifying")} fullWidth>
                {t("auth.verifyAndSignIn")} →
              </Button>
              <button
                type="button"
                onClick={handleResendSignupCode}
                disabled={resendLeft > 0 || codeBusy}
                className="w-full text-center text-xs font-semibold text-accent hover:underline disabled:text-ink-muted disabled:no-underline disabled:cursor-not-allowed"
              >
                {resendLeft > 0 ? t("auth.emailOtpResendIn").replace("{n}", String(resendLeft)) : t("auth.emailOtpResend")}
              </button>
            </form>
          ) : (
          <>
          {/* Social buttons */}
          <div>
            <button onClick={() => handleSocial("google")} disabled={!!socialLoad}
              className="w-full flex items-center justify-center gap-2.5 h-11 rounded-control border border-line font-semibold text-sm text-ink hover:border-ink-muted hover:bg-[#FAFAFA] transition-all active:scale-95 disabled:opacity-60">
              {socialLoad === "google" ? <Spinner /> : <GoogleIcon />}
              <span>{t("auth.google")}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs font-bold text-ink-muted">{t("auth.or")}</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">{t("auth.fullName")}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ana Beridze" required
                className="w-full h-11 px-4 rounded-control border border-line text-sm font-medium text-ink placeholder:text-ink-muted focus:border-accent outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">{t("auth.emailAddress")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full h-11 px-4 rounded-control border border-line text-sm font-medium text-ink placeholder:text-ink-muted focus:border-accent outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">{t("auth.password")}</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.minChars")} required
                  className="w-full h-11 px-4 pr-11 rounded-control border border-line text-sm font-medium text-ink placeholder:text-ink-muted focus:border-accent outline-none transition-colors" />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-soft transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPass
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
              <PasswordStrength password={password} t={t} />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">{t("auth.confirmPassword")}</label>
              <input type={showPass ? "text" : "password"} value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("auth.repeatPassword")} required
                className={`w-full h-11 px-4 rounded-control border-2 text-sm font-medium text-ink placeholder:text-ink-muted outline-none transition-colors ${
                  confirm && confirm !== password ? "border-red-300 focus:border-red-400" : "border-line focus:border-accent"
                }`} />
              {confirm && confirm !== password && (
                <p className="text-red-400 text-[10px] font-semibold mt-1">{t("auth.passwordsNoMatch")}</p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-accent flex-shrink-0" />
              <span className="text-xs text-ink-soft leading-relaxed">
                {t("auth.agreeTerms")}{" "}
                <a href="/terms" className="text-accent font-semibold hover:underline">{t("footer.terms")}</a>{" "}
                {t("auth.and")}{" "}
                <a href="/privacy" className="text-accent font-semibold hover:underline">{t("footer.privacy")}</a>
              </span>
            </label>

            {error && (
              <p className="text-red-400 text-xs font-semibold">
                {error}
                {errorCode === "already_registered" && (
                  <>
                    {" "}
                    <Link href="/login" className="underline font-bold hover:text-red-500">
                      {t("auth.signIn")}
                    </Link>
                  </>
                )}
              </p>
            )}

            <Button type="submit" loading={loading} loadingText={t("auth.creatingAccount")} fullWidth>
              {t("auth.createAccountBtn")} →
            </Button>
          </form>
          </>
          )}
        </div>

        <p className="text-center text-sm text-ink-muted mt-5">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-bold text-accent hover:underline">{t("auth.signIn")} →</Link>
        </p>
      </div>
    </div>
  );
}
