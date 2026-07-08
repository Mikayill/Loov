"use client";

/**
 * Shown instead of the admin panel when the admin has 2FA enrolled but this
 * session is still aal1 (e.g. signed in via Google, which never asks for the
 * code). Verifying elevates the session to aal2, then the layout re-renders
 * into the real panel. Admin UI is English by convention.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminMfaGate() {
  const router = useRouter();
  const { mfaRequired, verifyTotp, signOut } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    mfaRequired().then((res) => {
      if (cancelled) return;
      if (res.required && res.factorId) setFactorId(res.factorId);
      // Session might have been elevated in another tab — just re-render.
      else router.refresh();
    });
    return () => { cancelled = true; };
  }, [mfaRequired, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError("");
    setBusy(true);
    const res = await verifyTotp(factorId, code);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    router.refresh(); // aal2 now → the layout renders the panel
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F5F0EB" }}>
      <div className="bg-white rounded-3xl border border-[#DDD5CC] shadow-sm p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-3">🛡️</div>
        <h1 className="text-xl font-extrabold text-[#2A2320] mb-1">Admin verification</h1>
        <p className="text-sm text-[#9A8E88] mb-5">
          This account has two-factor authentication. Enter the 6-digit code from your
          authenticator app to open the admin panel.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="123456"
            autoFocus
            className="w-full h-12 px-4 rounded-xl border-2 border-[#DDD5CC] text-xl font-extrabold tracking-[0.4em] text-center outline-none focus:border-[#5E9E8C]"
          />
          {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={busy || code.length !== 6 || !factorId}
            className="w-full h-11 rounded-xl font-extrabold text-white text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            {busy ? "…" : "Verify & enter"}
          </button>
        </form>
        <button
          onClick={() => { signOut(); router.push("/login"); }}
          className="mt-4 text-xs font-semibold text-[#9A8E88] hover:text-[#5E5450] transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
