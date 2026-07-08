"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

export default function SecurityClient() {
  const router = useRouter();
  const { t } = useLocale();
  const { user, loading, updatePassword, deleteAccount } = useAuth();

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

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

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
    if (newPw.length < 6) { setPwError(t("sec.newPasswordMin6")); return; }
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

  const { score, label: pwLabel, color: pwColor } = pwStrength(newPw);
  const isEmailProvider = user.provider === "email";
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

        {/* Change password */}
        {isEmailProvider ? (
          <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
            <h2 className="font-extrabold text-[#2A2320] mb-5 flex items-center gap-2">
              <span>🔒</span> {t("sec.changePassword")}
            </h2>

            {pwSuccess && (
              <div className="mb-4 p-3 bg-[#EAF2F0] border border-[#C8DDD8] rounded-xl flex items-center gap-2 text-sm font-semibold text-[#3A7A68]">
                <span>✓</span> {t("sec.passwordUpdated")}
              </div>
            )}

            <form onSubmit={handleChangePw} className="space-y-4">
              {/* Current password */}
              <div>
                <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("sec.currentPassword")} *</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium focus:border-[#5E9E8C] outline-none transition-colors"
                />
              </div>

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

              <button
                type="submit" disabled={pwLoading}
                className="w-full h-10 rounded-xl font-extrabold text-white text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#5E9E8C" }}
              >
                {pwLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    {t("sec.updating")}
                  </>
                ) : `${t("sec.updatePasswordBtn")} →`}
              </button>
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

        {/* Two-factor auth */}
        <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-[#2A2320] flex items-center gap-2">
              <span>🛡️</span> {t("sec.twoFactor")}
            </h2>
            <span className="text-[10px] font-bold bg-[#F5F0EB] text-[#9A8E88] px-2.5 py-1 rounded-full">{t("sec.comingSoon")}</span>
          </div>
          <p className="text-sm text-[#5E5450]">
            {t("sec.twoFactorBody")}
          </p>
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
                className="text-xs font-bold text-red-400 border-2 border-red-200 px-4 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
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
                <button
                  onClick={() => { setShowDelete(false); setDeleteInput(""); setDeleteError(""); }}
                  disabled={deleting}
                  className="flex-1 h-9 rounded-xl border-2 border-[#DDD5CC] text-sm font-bold text-[#5E5450] hover:border-[#9A8E88] transition-colors disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteInput !== "DELETE" || deleting}
                  className="flex-1 h-9 rounded-xl text-sm font-bold text-white bg-red-400 hover:bg-red-500 transition-colors disabled:opacity-40"
                >
                  {deleting ? t("sec.deleting") : t("sec.confirmDelete")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
