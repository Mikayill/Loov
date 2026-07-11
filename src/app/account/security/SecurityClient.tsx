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
  const { user, loading, updatePassword, updateProfile, linkPhone, deleteAccount } = useAuth();

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
        <div className="w-8 h-8 rounded-full border-4 border-[#5E9E8C] border-t-transparent animate-spin" />
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
      <nav className="flex items-center gap-2 text-xs text-[#9A8E88] mb-6">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-[#5E9E8C] transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold">{t("sec.breadcrumb")}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2A2320]">{t("sec.title")}</h1>
          <p className="text-[#9A8E88] text-sm mt-0.5">{t("sec.subtitle")}</p>
        </div>
        <Link href="/account" className="flex items-center gap-1.5 text-sm font-semibold text-[#5E9E8C] hover:underline">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("sec.backToAccount")}
        </Link>
      </div>

      <div className="space-y-6">
        {/* Sign-in method */}
        <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
          <h2 className="font-extrabold text-[#2A2320] mb-4 flex items-center gap-2">
            <span>🔗</span> {t("sec.signInMethod")}
          </h2>
          <div className="flex items-center justify-between bg-[#F5F0EB] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#EAF2F0] flex items-center justify-center text-sm">
                {user.provider === "google" ? "G" : user.provider === "facebook" ? "f" : user.provider === "phone" ? "📱" : "✉️"}
              </div>
              <div>
                <p className="font-bold text-[#2A2320] text-sm">{providerLabel[user.provider]}</p>
                {user.email && <p className="text-xs text-[#9A8E88]">{user.email}</p>}
              </div>
            </div>
            <span className="text-[10px] font-bold bg-[#EAF2F0] text-[#5E9E8C] px-2 py-1 rounded-full">{t("sec.active")}</span>
          </div>
        </div>

        {/* Change/add password */}
        {hasPassword ? (
          <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
            <h2 className="font-extrabold text-[#2A2320] mb-5 flex items-center gap-2">
              <span>🔒</span> {isEmailProvider ? t("sec.changePassword") : t("sec.addPassword")}
            </h2>

            {pwSuccess && (
              <div className="mb-4 p-3 bg-[#EAF2F0] border border-[#C8DDD8] rounded-xl flex items-center gap-2 text-sm font-semibold text-[#3A7A68]">
                <span>✓</span> {t("sec.passwordUpdated")}
              </div>
            )}

            <form onSubmit={handleChangePw} className="space-y-4">
              {/* Current password — email accounts only; phone accounts are adding their first one */}
              {isEmailProvider && (
              <div>
                <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("sec.currentPassword")} *</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium focus:border-[#5E9E8C] outline-none transition-colors"
                />
              </div>
              )}

              {/* New password */}
              <div>
                <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("sec.newPassword")} *</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPw} onChange={(e) => setNewPw(e.target.value)}
                    placeholder={t("sec.minChars")}
                    className="w-full h-10 px-3 pr-10 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium focus:border-[#5E9E8C] outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8E88] hover:text-[#5E5450] text-xs font-bold">
                    {showPw ? t("sec.hide") : t("sec.show")}
                  </button>
                </div>
                {newPw && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#F5F0EB] rounded-full overflow-hidden">
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
                <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("sec.confirmNewPassword")} *</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder={t("sec.repeatNewPassword")}
                  className={`w-full h-10 px-3 rounded-xl border-2 text-sm font-medium outline-none transition-colors ${
                    confirmPw && confirmPw !== newPw
                      ? "border-red-300 focus:border-red-400"
                      : "border-[#DDD5CC] focus:border-[#5E9E8C]"
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
          <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
            <h2 className="font-extrabold text-[#2A2320] mb-3 flex items-center gap-2">
              <span>🔒</span> {t("sec.password")}
            </h2>
            <p className="text-sm text-[#5E5450]">
              {t("sec.passwordManagedBy").split("{provider}")[0]}<strong>{providerLabel[user.provider]}</strong>{t("sec.passwordManagedBy").split("{provider}")[1]}
            </p>
          </div>
        )}

        {/* Contact methods — fill in whichever one is missing so both are
            available to log in with / receive account emails. */}
        {(!user.email || !user.phone) && (
          <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6 space-y-5">
            <h2 className="font-extrabold text-[#2A2320] flex items-center gap-2">
              <span>📇</span> {t("sec.contactMethods")}
            </h2>

            {!user.email && (
              <div>
                <p className="text-sm font-semibold text-[#2A2320] mb-2">{t("sec.addEmail")}</p>
                <form onSubmit={handleAddEmail} className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <input
                      type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@example.com" required
                      className="w-full h-10 px-3 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium focus:border-[#5E9E8C] outline-none transition-colors"
                    />
                  </div>
                  <Button type="submit" loading={emailBusy} loadingText={t("sec.updating")} className="!h-10 !w-auto px-5">
                    {t("sec.addEmailBtn")}
                  </Button>
                </form>
                {emailInfo && <p className="text-xs text-[#5E9E8C] font-semibold mt-1.5">{emailInfo}</p>}
                {emailError && <p className="text-xs text-red-400 font-semibold mt-1.5">{emailError}</p>}
              </div>
            )}

            {!user.phone && (
              <div>
                <p className="text-sm font-semibold text-[#2A2320] mb-2">{t("sec.addPhone")}</p>
                {phoneAddDone ? (
                  <p className="text-xs text-[#5E9E8C] font-semibold">✓ {t("sec.addPhoneDone")}</p>
                ) : (
                  <>
                    <form onSubmit={handleAddPhone} className="flex items-end gap-3 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <div className="flex items-stretch h-10 rounded-xl border-2 border-[#DDD5CC] bg-white overflow-hidden focus-within:border-[#5E9E8C] transition-colors">
                          <span className="flex items-center pl-3 pr-2 text-sm font-bold text-[#5E5450] bg-[#F5F0EB] border-r-2 border-[#DDD5CC] select-none">{PHONE_COUNTRY_CODE}</span>
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
        <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
          <h2 className="font-extrabold text-[#2A2320] mb-2 flex items-center gap-2">
            <span>🛡️</span> {t("sec.verification")}
          </h2>
          <p className="text-sm text-[#5E5450]">{t("sec.verificationBody")}</p>
          {deviceTrusted && (
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap bg-[#F5F0EB] rounded-xl p-3">
              <p className="text-xs text-[#5E5450]">✓ {t("sec.deviceTrusted")}</p>
              <button
                onClick={forgetDevice}
                disabled={forgettingDevice}
                className="text-xs font-bold text-red-400 border-2 border-red-200 px-4 py-1.5 rounded-xl hover:bg-red-50 transition-all active:scale-95 disabled:opacity-60"
              >
                {forgettingDevice ? t("sec.updating") : t("sec.forgetDevice")}
              </button>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border-2 border-red-100 p-6">
          <h2 className="font-extrabold text-red-400 mb-3 flex items-center gap-2">
            <span>⚠️</span> {t("sec.dangerZone")}
          </h2>
          {!showDelete ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#2A2320] text-sm">{t("sec.deleteAccount")}</p>
                <p className="text-xs text-[#9A8E88] mt-0.5">{t("sec.deleteAccountBody")}</p>
              </div>
              <button
                onClick={() => setShowDelete(true)}
                className="text-xs font-bold text-red-400 border-2 border-red-200 px-4 py-1.5 rounded-xl hover:bg-red-50 transition-all active:scale-95"
              >
                {t("sec.deleteAccount")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#2A2320] font-semibold">
                {t("sec.typeDeleteConfirm").split("{word}")[0]}<strong>DELETE</strong>{t("sec.typeDeleteConfirm").split("{word}")[1]}
              </p>
              <input
                value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={t("sec.typeDeletePlaceholder")}
                className="w-full h-10 px-3 rounded-xl border-2 border-red-200 text-sm font-medium focus:border-red-400 outline-none transition-colors"
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
