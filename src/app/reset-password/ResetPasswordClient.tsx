"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import Button from "@/components/ui/Button";

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
    if (password.length < 8 || !/\d/.test(password)) { setError(t("auth.passwordMin8Digit")); return; }
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
          <Link href="/" className="inline-flex items-center mb-4" aria-label="Loov — home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Loov" className="h-6 w-auto" />
          </Link>
          <h1 className="text-2xl font-extrabold text-ink">{t("auth.setNewPassword")}</h1>
        </div>

        <div className="bg-canvas rounded-card border border-line shadow-sm p-7">
          {done ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-bold text-ink mb-1">{t("auth.passwordUpdated")}</p>
              <p className="text-sm text-ink-muted">{t("auth.takingToAccount")}</p>
            </div>
          ) : !loading && !user ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">⏳</div>
              <p className="font-bold text-ink mb-1">{t("auth.linkInvalid")}</p>
              <p className="text-sm text-ink-muted mb-4">{t("auth.requestNewOne")}</p>
              <Link href="/forgot-password" className="font-bold text-accent hover:underline">{t("auth.requestNewLink")} →</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">{t("auth.newPassword")}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                  placeholder={t("auth.atLeast6")}
                  className="w-full h-11 px-4 rounded-control border border-line text-sm font-medium text-ink focus:border-accent outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">{t("auth.confirmNewPassword")}</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                  className="w-full h-11 px-4 rounded-control border border-line text-sm font-medium text-ink focus:border-accent outline-none transition-colors" />
              </div>
              {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
              <Button type="submit" loading={busy} loadingText={t("auth.saving")} fullWidth>
                {t("auth.updatePasswordBtn")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
