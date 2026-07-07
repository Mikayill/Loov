"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

export default function ResetPasswordClient() {
  const router = useRouter();
  const { t } = useLocale();
  const { user, loading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError(t("auth.passwordsNoMatch")); return; }
    setError(""); setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setDone(true);
    setTimeout(() => router.push("/account"), 1800);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🌿</span>
            <span className="text-2xl font-extrabold text-[#2A2320]">Loov</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-[#2A2320]">{t("auth.setNewPassword")}</h1>
        </div>

        <div className="bg-white rounded-3xl border border-[#DDD5CC] shadow-sm p-7">
          {done ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-bold text-[#2A2320] mb-1">{t("auth.passwordUpdated")}</p>
              <p className="text-sm text-[#9A8E88]">{t("auth.takingToAccount")}</p>
            </div>
          ) : !loading && !user ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">⏳</div>
              <p className="font-bold text-[#2A2320] mb-1">{t("auth.linkInvalid")}</p>
              <p className="text-sm text-[#9A8E88] mb-4">{t("auth.requestNewOne")}</p>
              <Link href="/forgot-password" className="font-bold text-[#5E9E8C] hover:underline">{t("auth.requestNewLink")} →</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("auth.newPassword")}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  placeholder={t("auth.atLeast6")}
                  className="w-full h-11 px-4 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium text-[#2A2320] focus:border-[#5E9E8C] outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("auth.confirmNewPassword")}</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                  className="w-full h-11 px-4 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium text-[#2A2320] focus:border-[#5E9E8C] outline-none transition-colors" />
              </div>
              {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full h-11 rounded-xl font-extrabold text-white text-sm hover:opacity-90 active:scale-95 disabled:opacity-60 transition-all"
                style={{ backgroundColor: "#5E9E8C" }}>
                {busy ? t("auth.saving") : t("auth.updatePasswordBtn")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
