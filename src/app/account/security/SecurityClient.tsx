"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import Button from "@/components/ui/Button";
import { PHONE_COUNTRY_CODE, PHONE_LOCAL_PLACEHOLDER, phoneLocalPart, withCountryCode } from "@/lib/georgia";

export default function SecurityClient() {
  const router = useRouter();
  const { t } = useLocale();
  const { user, loading, updatePassword, updateProfile, linkPhone, deleteAccount,
    listTotpFactors, enrollTotp, verifyTotp, unenrollTotp } = useAuth();

  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [pwLoading,  setPwLoading]  = useState(false);
  const [pwSuccess,  setPwSuccess]  = useState(false);
  const [pwError,    setPwError]    = useState("");

  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /* ── Add a missing email/phone (Security page lets an account fill in
     whichever contact method it doesn't already have). ── */
  const [emailInput, setEmailInput]   = useState("");
  const [emailBusy, setEmailBusy]     = useState(false);
  const [emailError, setEmailError]   = useState("");
  const [emailInfo, setEmailInfo]     = useState("");
  const [phoneAddInput, setPhoneAddInput] = useState("");
  const [phoneAddBusy, setPhoneAddBusy]   = useState(false);
  const [phoneAddError, setPhoneAddError] = useState("");
  const [phoneAddDone, setPhoneAddDone]   = useState(false);

  /* Trusted-device (this browser skips the sign-in code for 30 days). */
  const [deviceTrusted, setDeviceTrusted] = useState(false);
  const [forgettingDevice, setForgettingDevice] = useState(false);

  /* ── Authenticator-app 2FA (optional, stronger than the automatic email code) ── */
  const [totpOn, setTotpOn]           = useState(false);   // verified factor exists
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpLoaded, setTotpLoaded]   = useState(false);
  const [enrolling, setEnrolling]     = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [totpCode, setTotpCode]       = useState("");
  const [totpBusy, setTotpBusy]       = useState(false);
  const [totpError, setTotpError]     = useState("");
  const [showDisableTotp, setShowDisableTotp] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/auth/trusted-device")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setDeviceTrusted(!!d.trusted); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listTotpFactors().then(({ factors }) => {
      if (cancelled) return;
      setTotpOn(factors.length > 0);
      setTotpFactorId(factors[0]?.id ?? null);
      setTotpLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, listTotpFactors]);

  async function startEnrollTotp() {
    setTotpError(""); setTotpBusy(true); setTotpCode("");
    const res = await enrollTotp();
    setTotpBusy(false);
    if (res.error || !res.factorId) { setTotpError(res.error || t("auth.notConfigured")); return; }
    setEnrolling({ factorId: res.factorId, qr: res.qr ?? "", secret: res.secret ?? "" });
  }

  async function confirmEnrollTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setTotpError(""); setTotpBusy(true);
    const res = await verifyTotp(enrolling.factorId, totpCode);
    setTotpBusy(false);
    if (res.error) { setTotpError(res.error); return; }
    setTotpOn(true);
    setTotpFactorId(enrolling.factorId);
    setEnrolling(null);
    setTotpCode("");
  }

  async function disableTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!totpFactorId) return;
    setTotpError(""); setTotpBusy(true);
    const res = await unenrollTotp(totpFactorId, totpCode);
    setTotpBusy(false);
    if (res.error) { setTotpError(res.error); return; }
    setTotpOn(false);
    setTotpFactorId(null);
    setShowDisableTotp(false);
    setTotpCode("");
  }

  async function forgetDevice() {
    setForgettingDevice(true);
    try {
      await fetch("/api/auth/trusted-device", { method: "DELETE" });
      setDeviceTrusted(false);
    } catch { /* */ } finally {
      setForgettingDevice(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  function pwStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ["", t("sec.strengthWeak"), t("sec.strengthFair"), t("sec.strengthGood"), t("sec.strengthStrong")];
    const colors = ["", "#DC4A4A", "#E8A820", "#5E9E8C", "#3A7A68"];
    return { score, label: labels[score], color: colors[score] };
  }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (newPw.length < 8 || !/\d/.test(newPw)) { setPwError(t("sec.newPasswordMin8Digit")); return; }
    if (newPw !== confirmPw) { setPwError(t("sec.passwordsNoMatch")); return; }
    setPwLoading(true);
    const res = await updatePassword(newPw);
    setPwLoading(false);
    if (res.error) { setPwError(res.error); return; }
    setPwSuccess(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwSuccess(false), 3000);
  }

  async function handleDelete() {
    setDeleteError(""); setDeleting(true);
    const res = await deleteAccount();
    setDeleting(false);
    if (res.error) {
      if (res.errorCode === "otp_required") { router.push("/login?verify=1"); return; }
      // Localized messages for the "still have active orders/returns" blocks.
      if (res.activeOrders !== undefined) {
        setDeleteError(t("sec.activeOrdersBlock").replace("{n}", String(res.activeOrders)));
      } else if (res.activeReturns !== undefined) {
        setDeleteError(t("sec.activeReturnBlock"));
      } else {
        setDeleteError(res.error);
      }
      return;
    }
    router.push("/");
  }

  async function handleAddEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(""); setEmailInfo(""); setEmailBusy(true);
    const res = await updateProfile(user!.name, emailInput);
    setEmailBusy(false);
    if (res.error) { setEmailError(res.error); return; }
    if (res.info) setEmailInfo(res.info);
    setEmailInput("");
  }

  async function handleAddPhone(e: React.FormEvent) {
    e.preventDefault();
    setPhoneAddError(""); setPhoneAddBusy(true);
    const res = await linkPhone(phoneAddInput);
    setPhoneAddBusy(false);
    if (res.error) { setPhoneAddError(res.error); return; }
    setPhoneAddDone(true);
    setPhoneAddInput("");
  }

  const { score, label: pwLabel, color: pwColor } = pwStrength(newPw);
  const isEmailProvider = user.provider === "email";
  const isPhoneProvider = user.provider === "phone";
  const hasPassword = isEmailProvider || isPhoneProvider;
  const providerLabel: Record<string, string> = {
    google: t("sec.providerGoogle"), facebook: t("sec.providerFacebook"), phone: t("sec.providerPhone"), email: t("sec.providerEmail"),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-accent transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("sec.breadcrumb")}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{t("sec.title")}</h1>
          <p className="text-ink-muted text-sm mt-0.5">{t("sec.subtitle")}</p>
        </div>
        <Link href="/account" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("sec.backToAccount")}
        </Link>
      </div>

      <div className="space-y-6">
        {/* Sign-in method */}
        <div className="bg-white rounded-card border border-line p-6">
          <h2 className="font-extrabold text-ink mb-4 flex items-center gap-2">
            <span>🔗</span> {t("sec.signInMethod")}
          </h2>
          <div className="flex items-center justify-between bg-canvas rounded-control p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-sm">
                {user.provider === "google" ? "G" : user.provider === "facebook" ? "f" : user.provider === "phone" ? "📱" : "✉️"}
              </div>
              <div>
                <p className="font-bold text-ink text-sm">{providerLabel[user.provider]}</p>
                {user.email && <p className="text-xs text-ink-muted">{user.email}</p>}
              </div>
            </div>
            <span className="text-[10px] font-bold bg-accent-soft text-accent px-2 py-1 rounded-full">{t("sec.active")}</span>
          </div>
        </div>

        {/* Change/add password */}
        {hasPassword ? (
          <div className="bg-white rounded-card border border-line p-6">
            <h2 className="font-extrabold text-ink mb-5 flex items-center gap-2">
              <span>🔒</span> {isEmailProvider ? t("sec.changePassword") : t("sec.addPassword")}
            </h2>

            {pwSuccess && (
              <div className="mb-4 p-3 bg-accent-soft border border-sage rounded-control flex items-center gap-2 text-sm font-semibold text-accent-deep">
                <span>✓</span> {t("sec.passwordUpdated")}
              </div>
            )}

            <form onSubmit={handleChangePw} className="space-y-4">
              {/* Current password — email accounts only; phone accounts are adding their first one */}
              {isEmailProvider && (
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">{t("sec.currentPassword")} *</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors"
                />
              </div>
              )}

              {/* New password */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">{t("sec.newPassword")} *</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPw} onChange={(e) => setNewPw(e.target.value)}
                    placeholder={t("sec.minChars")}
                    className="w-full h-10 px-3 pr-10 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-soft text-xs font-bold">
                    {showPw ? t("sec.hide") : t("sec.show")}
                  </button>
                </div>
                {newPw && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${score * 25}%`, backgroundColor: pwColor }}
                      />
                    </div>
                    <span className="text-xs font-bold" style={{ color: pwColor }}>{pwLabel}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">{t("sec.confirmNewPassword")} *</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder={t("sec.repeatNewPassword")}
                  className={`w-full h-10 px-3 rounded-control border-2 text-sm font-medium outline-none transition-colors ${
                    confirmPw && confirmPw !== newPw
                      ? "border-red-300 focus:border-red-400"
                      : "border-line focus:border-accent"
                  }`}
                />
                {confirmPw && confirmPw !== newPw && (
                  <p className="text-xs text-red-400 font-semibold mt-1">{t("sec.passwordsNoMatch")}</p>
                )}
              </div>

              {pwError && <p className="text-red-400 text-xs font-semibold">{pwError}</p>}

              <Button type="submit" loading={pwLoading} loadingText={t("sec.updating")} className="!h-10" fullWidth>
                {isEmailProvider ? t("sec.updatePasswordBtn") : t("sec.addPasswordBtn")} →
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-card border border-line p-6">
            <h2 className="font-extrabold text-ink mb-3 flex items-center gap-2">
              <span>🔒</span> {t("sec.password")}
            </h2>
            <p className="text-sm text-ink-soft">
              {t("sec.passwordManagedBy").split("{provider}")[0]}<strong>{providerLabel[user.provider]}</strong>{t("sec.passwordManagedBy").split("{provider}")[1]}
            </p>
          </div>
        )}

        {/* Contact methods — fill in whichever one is missing so both are
            available to log in with / receive account emails. */}
        {(!user.email || !user.phone) && (
          <div className="bg-white rounded-card border border-line p-6 space-y-5">
            <h2 className="font-extrabold text-ink flex items-center gap-2">
              <span>📇</span> {t("sec.contactMethods")}
            </h2>

            {!user.email && (
              <div>
                <p className="text-sm font-semibold text-ink mb-2">{t("sec.addEmail")}</p>
                <form onSubmit={handleAddEmail} className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <input
                      type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@example.com" required
                      className="w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors"
                    />
                  </div>
                  <Button type="submit" loading={emailBusy} loadingText={t("sec.updating")} className="!h-10 !w-auto px-5">
                    {t("sec.addEmailBtn")}
                  </Button>
                </form>
                {emailInfo && <p className="text-xs text-accent font-semibold mt-1.5">{emailInfo}</p>}
                {emailError && <p className="text-xs text-red-400 font-semibold mt-1.5">{emailError}</p>}
              </div>
            )}

            {!user.phone && (
              <div>
                <p className="text-sm font-semibold text-ink mb-2">{t("sec.addPhone")}</p>
                {phoneAddDone ? (
                  <p className="text-xs text-accent font-semibold">✓ {t("sec.addPhoneDone")}</p>
                ) : (
                  <>
                    <form onSubmit={handleAddPhone} className="flex items-end gap-3 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <div className="flex items-stretch h-10 rounded-control border-2 border-line bg-white overflow-hidden focus-within:border-accent transition-colors">
                          <span className="flex items-center pl-3 pr-2 text-sm font-bold text-ink-soft bg-canvas border-r-2 border-line select-none">{PHONE_COUNTRY_CODE}</span>
                          <input
                            type="tel" value={phoneLocalPart(phoneAddInput)} onChange={(e) => setPhoneAddInput(withCountryCode(e.target.value))}
                            placeholder={PHONE_LOCAL_PLACEHOLDER} required
                            className="flex-1 min-w-0 h-full px-3 bg-transparent text-sm font-medium outline-none"
                          />
                        </div>
                      </div>
                      <Button type="submit" loading={phoneAddBusy} loadingText={t("sec.updating")} className="!h-10 !w-auto px-5">
                        {t("sec.addPhoneBtn")}
                      </Button>
                    </form>
                    {phoneAddError && <p className="text-xs text-red-400 font-semibold mt-1.5">{phoneAddError}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sign-in verification — automatic, no setup needed */}
        <div className="bg-white rounded-card border border-line p-6">
          <h2 className="font-extrabold text-ink mb-2 flex items-center gap-2">
            <span>🛡️</span> {t("sec.verification")}
          </h2>
          <p className="text-sm text-ink-soft">{t("sec.verificationBody")}</p>
          {deviceTrusted && (
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap bg-canvas rounded-control p-3">
              <p className="text-xs text-ink-soft">✓ {t("sec.deviceTrusted")}</p>
              <button
                onClick={forgetDevice}
                disabled={forgettingDevice}
                className="text-xs font-bold text-red-400 border-2 border-red-200 px-4 py-1.5 rounded-control hover:bg-red-50 transition-all active:scale-95 disabled:opacity-60"
              >
                {forgettingDevice ? t("sec.updating") : t("sec.forgetDevice")}
              </button>
            </div>
          )}
        </div>

        {/* Authenticator-app 2FA (optional, stronger than the email code) */}
        <div className="bg-white rounded-card border border-line p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-ink flex items-center gap-2">
              <span>🔐</span> {t("sec.twoFactor")}
            </h2>
            {totpLoaded && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${totpOn ? "bg-accent-soft text-accent" : "bg-canvas text-ink-muted"}`}>
                {totpOn ? t("sec.mfaOn") : t("sec.mfaOff")}
              </span>
            )}
          </div>
          <p className="text-sm text-ink-soft mb-4">{t("sec.twoFactorBody")}</p>

          {!totpLoaded ? null : enrolling ? (
            /* Step 2: scan QR + confirm a code */
            <form onSubmit={confirmEnrollTotp} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                {enrolling.qr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={enrolling.qr} alt="2FA QR code" className="w-40 h-40 rounded-control border border-line bg-white p-2" />
                )}
                <div className="flex-1 space-y-2 text-sm text-ink-soft">
                  <p className="font-semibold text-ink">{t("sec.mfaScanQr")}</p>
                  <p className="text-xs">{t("sec.mfaManualKey")}</p>
                  <code className="block bg-canvas border border-line rounded-lg px-3 py-2 text-[11px] font-mono break-all select-all">{enrolling.secret}</code>
                </div>
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">{t("sec.mfaEnterCode")}</label>
                  <input value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="123456"
                    className="w-36 h-11 px-4 rounded-control border-2 border-line text-lg font-extrabold tracking-[0.3em] outline-none focus:border-accent" />
                </div>
                <button type="submit" disabled={totpBusy || totpCode.length !== 6} className="h-11 px-6 rounded-control font-bold text-white text-sm disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all" style={{ backgroundColor: "#5E9E8C" }}>
                  {totpBusy ? "…" : t("sec.mfaActivate")}
                </button>
                <button type="button" onClick={() => { setEnrolling(null); setTotpCode(""); setTotpError(""); }} className="h-11 px-4 rounded-control border-2 border-line text-sm font-bold text-ink-soft transition-all active:scale-95">
                  {t("addr.cancel")}
                </button>
              </div>
              {totpError && <p className="text-red-500 text-xs font-semibold">{totpError}</p>}
            </form>
          ) : totpOn ? (
            showDisableTotp ? (
              <form onSubmit={disableTotp} className="space-y-3">
                <p className="text-sm font-semibold text-ink">{t("sec.mfaDisableConfirm")}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <input value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="123456"
                    className="w-36 h-11 px-4 rounded-control border-2 border-line text-lg font-extrabold tracking-[0.3em] outline-none focus:border-accent" />
                  <button type="submit" disabled={totpBusy || totpCode.length !== 6} className="h-11 px-5 rounded-control font-bold text-white text-sm bg-red-500 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all">
                    {totpBusy ? "…" : t("sec.mfaDisable")}
                  </button>
                  <button type="button" onClick={() => { setShowDisableTotp(false); setTotpCode(""); setTotpError(""); }} className="h-11 px-4 rounded-control border-2 border-line text-sm font-bold text-ink-soft transition-all active:scale-95">
                    {t("addr.cancel")}
                  </button>
                </div>
                {totpError && <p className="text-red-500 text-xs font-semibold">{totpError}</p>}
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-semibold text-accent">✓ {t("sec.mfaEnabledNote")}</p>
                <button onClick={() => { setShowDisableTotp(true); setTotpError(""); }} className="text-xs font-bold text-red-400 border-2 border-red-200 px-4 py-1.5 rounded-control hover:bg-red-50 transition-all active:scale-95">
                  {t("sec.mfaDisable")}
                </button>
              </div>
            )
          ) : (
            <div>
              <button onClick={startEnrollTotp} disabled={totpBusy} className="font-bold px-5 py-2.5 rounded-control text-white text-sm disabled:opacity-60 hover:opacity-90 active:scale-95 transition-all" style={{ backgroundColor: "#5E9E8C" }}>
                {totpBusy ? "…" : `${t("sec.mfaEnable")} →`}
              </button>
              {totpError && <p className="text-red-500 text-xs font-semibold mt-2">{totpError}</p>}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-card border-2 border-red-100 p-6">
          <h2 className="font-extrabold text-red-400 mb-3 flex items-center gap-2">
            <span>⚠️</span> {t("sec.dangerZone")}
          </h2>
          {!showDelete ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink text-sm">{t("sec.deleteAccount")}</p>
                <p className="text-xs text-ink-muted mt-0.5">{t("sec.deleteAccountBody")}</p>
              </div>
              <button
                onClick={() => setShowDelete(true)}
                className="text-xs font-bold text-red-400 border-2 border-red-200 px-4 py-1.5 rounded-control hover:bg-red-50 transition-all active:scale-95"
              >
                {t("sec.deleteAccount")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink font-semibold">
                {t("sec.typeDeleteConfirm").split("{word}")[0]}<strong>DELETE</strong>{t("sec.typeDeleteConfirm").split("{word}")[1]}
              </p>
              <input
                value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={t("sec.typeDeletePlaceholder")}
                className="w-full h-10 px-3 rounded-control border-2 border-red-200 text-sm font-medium focus:border-red-400 outline-none transition-colors"
              />
              {deleteError && <p className="text-red-500 text-xs font-semibold">{deleteError}</p>}
              <div className="flex gap-3">
                <Button
                  onClick={() => { setShowDelete(false); setDeleteInput(""); setDeleteError(""); }}
                  disabled={deleting}
                  variant="secondary"
                  className="flex-1 !h-9"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleteInput !== "DELETE"}
                  loading={deleting}
                  loadingText={t("sec.deleting")}
                  variant="danger"
                  className="flex-1 !h-9"
                >
                  {t("sec.confirmDelete")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
