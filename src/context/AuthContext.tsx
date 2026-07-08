"use client";

/**
 * Auth — real Supabase Auth (Phase 2).
 *
 * Email/password, Google OAuth and phone OTP all go through Supabase. The
 * session lives in cookies (via @supabase/ssr), so Server Components and
 * Route Handlers see the same login — orders placed while signed in get
 * their user_id attached automatically in /api/orders.
 *
 * Google must be enabled in the Supabase dashboard (Authentication →
 * Providers) with its own credentials; until then the button surfaces
 * Supabase's "provider is not enabled" error.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "email" | "google" | "facebook" | "phone";
}

interface AuthResult {
  error?: string;
  /** Non-error notice, e.g. "check your inbox to confirm your email". */
  info?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  sendPhoneOtp: (phone: string) => Promise<AuthResult>;
  signInWithPhone: (phone: string, otp: string) => Promise<AuthResult>;
  /** Update the display name and/or email of the signed-in user. */
  updateProfile: (name: string, email: string) => Promise<AuthResult>;
  /** Email a password-reset link. */
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  /** Set a new password for the current (recovery or signed-in) session. */
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  /** Permanently delete the signed-in user's account and data. Refused with
   *  activeOrders/activeReturns counts while anything is still in flight. */
  deleteAccount: () => Promise<AuthResult & { activeOrders?: number; activeReturns?: number }>;
  signOut: () => void;
  /* ── Two-factor authentication (TOTP authenticator app) ── */
  /** The user's verified TOTP factors (empty = 2FA off). */
  listTotpFactors: () => Promise<{ factors: { id: string }[]; error?: string }>;
  /** Start enrolment: returns the QR (SVG data URI) + secret to scan/type. */
  enrollTotp: () => Promise<{ factorId?: string; qr?: string; secret?: string; error?: string }>;
  /** Confirm a 6-digit code (used to finish enrolment AND at sign-in). */
  verifyTotp: (factorId: string, code: string) => Promise<AuthResult>;
  /** Turn 2FA off — requires a current code (verifies, then unenrolls). */
  unenrollTotp: (factorId: string, code: string) => Promise<AuthResult>;
  /** After a password sign-in: does this session still need a TOTP code? */
  mfaRequired: () => Promise<{ required: boolean; factorId?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Supabase user → the app's User shape. */
function mapUser(u: SupabaseUser): User {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const provider = (u.app_metadata?.provider ?? "email") as User["provider"];
  const name =
    (meta.name as string) ||
    (meta.full_name as string) ||
    u.email?.split("@")[0] ||
    u.phone ||
    "Loov Parent";
  return {
    id: u.id,
    name,
    email: u.email ?? "",
    avatar: (meta.avatar_url as string) || undefined,
    provider: provider === "google" || provider === "facebook" || provider === "phone" ? provider : "email",
  };
}

/** Translate Supabase error strings into friendly copy. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox.";
  if (m.includes("already registered")) return "This email is already registered — try signing in.";
  if (m.includes("not enabled") || m.includes("provider"))
    return "This sign-in method isn't enabled yet — please use email for now.";
  if (m.includes("rate limit")) return "Too many attempts — please wait a moment and try again.";
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* One browser client for the provider's lifetime (it's a singleton anyway). */
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null; // env not configured — auth stays signed-out but the site works
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? mapUser(data.session.user) : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapUser(session.user) : null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    if (!email || !password) return { error: "Please fill in all fields." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: friendly(error.message) } : {};
  }, [supabase]);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    if (!name || !email || !password) return { error: "Please fill in all fields." };
    if (password.length < 6) return { error: "Password must be at least 6 characters." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
      },
    });
    if (error) return { error: friendly(error.message) };
    /* "Confirm email" is ON in Supabase → no session until the link is clicked */
    if (!data.session) {
      return { info: "Almost there! Check your inbox and click the confirmation link to activate your account." };
    }
    return {};
  }, [supabase]);

  const oauth = useCallback(async (provider: "google"): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
    });
    /* On success the browser navigates away to the provider — nothing to do. */
    return error ? { error: friendly(error.message) } : {};
  }, [supabase]);

  const signInWithGoogle = useCallback(() => oauth("google"), [oauth]);

  const sendPhoneOtp = useCallback(async (phone: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    if (!phone.trim()) return { error: "Please enter your phone number." };
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.replace(/\s/g, "") });
    return error ? { error: friendly(error.message) } : {};
  }, [supabase]);

  const signInWithPhone = useCallback(async (phone: string, otp: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/\s/g, ""),
      token: otp,
      type: "sms",
    });
    return error ? { error: friendly(error.message) } : {};
  }, [supabase]);

  const updateProfile = useCallback(async (name: string, email: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    if (!name.trim()) return { error: "Name can't be empty." };

    const { data: current } = await supabase.auth.getUser();
    const emailChanged = !!email.trim() && email.trim() !== current?.user?.email;

    const { error } = await supabase.auth.updateUser({
      data: { name: name.trim() },
      ...(emailChanged ? { email: email.trim() } : {}),
    });
    if (error) return { error: friendly(error.message) };

    /* Keep the public profile row in sync (RLS: own row only). */
    if (current?.user?.id) {
      await supabase.from("profiles").upsert({ id: current.user.id, name: name.trim() });
    }
    /* Optimistic local update — onAuthStateChange will confirm. */
    setUser((u) => (u ? { ...u, name: name.trim() } : u));

    if (emailChanged) {
      return { info: "We sent a confirmation link to your new email — the change applies once you click it." };
    }
    return {};
  }, [supabase]);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    if (!email.trim()) return { error: "Please enter your email." };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    return error ? { error: friendly(error.message) } : {};
  }, [supabase]);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    if (newPassword.length < 6) return { error: "Password must be at least 6 characters." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { error: friendly(error.message) } : {};
  }, [supabase]);

  const deleteAccount = useCallback(async (): Promise<AuthResult & { activeOrders?: number; activeReturns?: number }> => {
    if (!supabase) return { error: "Auth is not configured." };
    /* Deletion needs the service role (server-side) — the browser can't delete
       its own auth user. The route authenticates via the session cookie. */
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return {
        error: d.error || "Could not delete account — please contact support.",
        activeOrders: typeof d.activeOrders === "number" ? d.activeOrders : undefined,
        activeReturns: typeof d.activeReturns === "number" ? d.activeReturns : undefined,
      };
    }
    await supabase.auth.signOut();
    setUser(null);
    return {};
  }, [supabase]);

  const signOut = useCallback(() => {
    supabase?.auth.signOut();
    setUser(null);
  }, [supabase]);

  /* ── Two-factor authentication (TOTP) ── */

  const listTotpFactors = useCallback(async () => {
    if (!supabase) return { factors: [], error: "Auth is not configured." };
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return { factors: [], error: friendly(error.message) };
    return { factors: (data?.totp ?? []).filter((f) => f.status === "verified").map((f) => ({ id: f.id })) };
  }, [supabase]);

  const enrollTotp = useCallback(async () => {
    if (!supabase) return { error: "Auth is not configured." };
    // Clear leftovers from abandoned enrolments — a dangling unverified factor
    // makes the next enroll fail with a duplicate-name error.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
    if (error) return { error: friendly(error.message) };
    return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  }, [supabase]);

  const verifyTotp = useCallback(async (factorId: string, code: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    if (!/^\d{6}$/.test(code.trim())) return { error: "Enter the 6-digit code from your authenticator app." };
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr) return { error: friendly(chErr.message) };
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
    return error ? { error: friendly(error.message) } : {};
  }, [supabase]);

  const unenrollTotp = useCallback(async (factorId: string, code: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    // Removing a verified factor needs an aal2 session — verify a code first.
    const verified = await verifyTotp(factorId, code);
    if (verified.error) return verified;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    return error ? { error: friendly(error.message) } : {};
  }, [supabase, verifyTotp]);

  const mfaRequired = useCallback(async () => {
    if (!supabase) return { required: false };
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!data || data.nextLevel !== "aal2" || data.nextLevel === data.currentLevel) {
      return { required: false };
    }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = (factors?.totp ?? []).find((f) => f.status === "verified");
    return totp ? { required: true, factorId: totp.id } : { required: false };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signUpWithEmail,
      signInWithGoogle, sendPhoneOtp, signInWithPhone, updateProfile,
      sendPasswordReset, updatePassword, deleteAccount, signOut,
      listTotpFactors, enrollTotp, verifyTotp, unenrollTotp, mfaRequired }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
