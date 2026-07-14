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
import Button from "@/components/ui/Button";

export default function AdminMfaGate() {
  const router = useRouter();
  const { mfaRequired, verifyTotp, sendPhoneFactorCode, verifyPhoneFactor, signOut } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [method, setMethod] = useState<"totp" | "phone">("totp");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    mfaRequired().then(async (res) => {
      if (cancelled) return;
      if (res.required && res.factorId) {
        setFactorId(res.factorId);
        if (res.type === "phone") {
          setMethod("phone");
          // Phone factors don't have a code until challenged — send it now.
          const ch = await sendPhoneFactorCode(res.factorId);
          if (!cancelled) {
            if (ch.error) setError(ch.error);
            else setChallengeId(ch.challengeId ?? null);
          }
        }
      }
      // Session might have been elevated in another tab — just re-render.
      else router.refresh();
    });
    return () => { cancelled = true; };
  }, [mfaRequired, sendPhoneFactorCode, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError("");
    setBusy(true);
    const res = method === "phone" && challengeId
      ? await verifyPhoneFactor(factorId, challengeId, code)
      : await verifyTotp(factorId, code);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    router.refresh(); // aal2 now → the layout renders the panel
  }

  const codeLen = method === "phone" ? code.length >= 4 : code.length === 6;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F5F0EB" }}>
      <div className="bg-white rounded-3xl border border-line shadow-sm p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-3">🛡️</div>
        <h1 className="text-xl font-extrabold text-ink mb-1">Admin verification</h1>
        <p className="text-sm text-ink-muted mb-5">
          {method === "phone"
            ? "This account has two-factor authentication. Enter the code we just texted to your phone to open the admin panel."
            : "This account has two-factor authentication. Enter the 6-digit code from your authenticator app to open the admin panel."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            placeholder={method === "phone" ? "123456" : "123456"}
            autoFocus
            className="w-full h-12 px-4 rounded-control border-2 border-line text-xl font-extrabold tracking-[0.4em] text-center outline-none focus:border-accent"
          />
          {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}
          <Button
            type="submit"
            disabled={!codeLen || !factorId}
            loading={busy}
            fullWidth
          >
            Verify &amp; enter
          </Button>
        </form>
        <button
          onClick={() => { signOut(); router.push("/login"); }}
          className="mt-4 text-xs font-semibold text-ink-muted hover:text-ink-soft transition-all active:scale-95"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
