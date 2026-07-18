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
import { rememberAccount } from "@/lib/rememberedAccounts";
import { useLocale } from "@/context/LocaleContext";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  provider: "email" | "google" | "facebook" | "phone";
}

interface AuthResult {
  error?: string;
  /** Non-error notice, e.g. "check your inbox to confirm your email". */
  info?: string;
  /** Machine-readable reason for `error`, so the UI can offer a contextual
   *  action (e.g. a "Sign in" link) without string-matching translated text.
   *  "otp_required" = the API refused because this session hasn't stepped up
   *  verification recently enough (see requireVerifiedSession.ts) — the UI
   *  should redirect to /login?verify=1 rather than show `error` as-is. */
  errorCode?: "already_registered" | "otp_required";
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
  /* ── Two-factor authentication (TOTP authenticator app) — OPTIONAL, opt-in
     from the Security page. When a user has a verified TOTP factor it's used
     at sign-in instead of the automatic email-OTP (it's the stronger factor).
     Also used by the admin AAL2 gate. ── */
  /** The user's verified TOTP factors (empty = authenticator-app 2FA off). */
  listTotpFactors: () => Promise<{ factors: { id: string }[]; error?: string }>;
  /** Start enrolment: returns the QR (SVG data URI) + secret to scan/type. */
  enrollTotp: () => Promise<{ factorId?: string; qr?: string; secret?: string; error?: string }>;
  /** Confirm a 6-digit code (finishes enrolment AND challenges at sign-in). */
  verifyTotp: (factorId: string, code: string) => Promise<AuthResult>;
  /** Turn authenticator-app 2FA off — requires a current code first. */
  unenrollTotp: (factorId: string, code: string) => Promise<AuthResult>;
  /** Admin AAL2 gate (phone factor) — kept for admins who enrolled SMS MFA. */
  sendPhoneFactorCode: (factorId: string) => Promise<{ challengeId?: string; error?: string }>;
  verifyPhoneFactor: (factorId: string, challengeId: string, code: string) => Promise<AuthResult>;
  mfaRequired: () => Promise<{ required: boolean; factorId?: string; type?: "totp" | "phone"; phone?: string }>;
  /* ── Mandatory email-OTP after a password sign-in + "remember this
     device". Deliberately NOT Supabase's mfa.* factor API (no "email"
     factor type exists) — this reuses the same passwordless-OTP primitive
     phone login already uses (signInWithOtp/verifyOtp), just for email. ── */
  /** Sends a one-time code to the given email. */
  sendEmailOtp: (email: string) => Promise<AuthResult>;
  /** Confirms the code sent by sendEmailOtp. */
  verifyEmailOtp: (email: string, token: string) => Promise<AuthResult>;
  /** Is this browser already trusted (skip the OTP step) for the signed-in user? */
  checkTrustedDevice: () => Promise<boolean>;
  /** Mark this browser as trusted (call right after a fresh OTP verify) —
   *  ~30 days when `remember` is true (default), a short few-hour window
   *  otherwise. Always call this after a successful verify, regardless of
   *  the "remember me" checkbox: it's what lets requireVerifiedSession()
   *  treat a just-completed OTP as proof for the rest of this browsing
   *  session, not just for shoppers who opted into long-term remembering. */
  trustThisDevice: (remember?: boolean) => Promise<void>;
  /** Link a phone number to an account that doesn't have one yet (Security page). */
  linkPhone: (phone: string) => Promise<AuthResult>;
  /** Confirm the code emailed at signup (alternative to clicking the link —
   *  requires the "Confirm signup" email template to include {{ .Token }},
   *  see supabase Dashboard → Auth → Email Templates). */
  verifySignupCode: (email: string, token: string) => Promise<AuthResult>;
  /** Re-send the signup confirmation email/code (rate-limited by Supabase). */
  resendSignupCode: (email: string) => Promise<AuthResult>;
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
    phone: u.phone ?? "",
    avatar: (meta.avatar_url as string) || undefined,
    provider: provider === "google" || provider === "facebook" || provider === "phone" ? provider : "email",
  };
}

type TFunc = (key: TranslationKey) => string;

/** Translate Supabase error strings into friendly, localized copy. */
function friendly(message: string, t: TFunc): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return t("auth.errWrongCredentials");
  if (m.includes("email not confirmed")) return t("auth.errEmailNotConfirmed");
  if (m.includes("already registered")) return t("auth.emailAlreadyRegistered");
  // Supabase's own password-policy rejections come back as raw, technical
  // text (e.g. "Password should contain at least one character of each...")
  // that doesn't tell the shopper what to actually type. Always replace with
  // our one clear rule, whatever the exact reason Supabase gave.
  if (m.includes("password") && (m.includes("should") || m.includes("weak") || m.includes("character") || m.includes("requirement") || m.includes("least")))
    return t("auth.passwordMin8Digit");
  if (m.includes("not enabled") || m.includes("provider"))
    return t("auth.errProviderNotEnabled");
  if (m.includes("rate limit")) return t("auth.errRateLimit");
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
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

  /* Remember this account on the device (token-free) so /account can offer a
     quick switch back to it later. Runs whenever a real user is present. */
  useEffect(() => {
    if (!user) return;
    rememberAccount({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
    });
  }, [user]);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (!email || !password) return { error: t("auth.fillAllFields") };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (!name || !email || !password) return { error: t("auth.fillAllFields") };
    if (password.length < 8 || !/\d/.test(password)) return { error: t("auth.passwordMin8Digit") };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
      },
    });
    if (error) return { error: friendly(error.message, t) };
    /* Supabase never errors here for an email that's already registered —
       to prevent account enumeration it silently returns a "success" with no
       new identity created instead. The one visible tell is an empty
       `identities` array. Without this check the shopper lands on a code
       screen that will never receive a code and has no idea why. */
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: t("auth.emailAlreadyRegistered"), errorCode: "already_registered" };
    }
    /* "Confirm email" is ON in Supabase → no session until the link is clicked */
    if (!data.session) {
      return { info: t("auth.confirmEmailCheckInbox") };
    }
    return {};
  }, [supabase, t]);

  const oauth = useCallback(async (provider: "google"): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
    });
    /* On success the browser navigates away to the provider — nothing to do. */
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const signInWithGoogle = useCallback(() => oauth("google"), [oauth]);

  const sendPhoneOtp = useCallback(async (phone: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (!phone.trim()) return { error: t("auth.enterPhone") };
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.replace(/\s/g, "") });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const signInWithPhone = useCallback(async (phone: string, otp: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/\s/g, ""),
      token: otp,
      type: "sms",
    });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const updateProfile = useCallback(async (name: string, email: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (!name.trim()) return { error: t("auth.nameCantBeEmpty") };

    const { data: current } = await supabase.auth.getUser();
    const emailChanged = !!email.trim() && email.trim() !== current?.user?.email;

    const { error } = await supabase.auth.updateUser({
      data: { name: name.trim() },
      ...(emailChanged ? { email: email.trim() } : {}),
    });
    if (error) return { error: friendly(error.message, t) };

    /* Keep the public profile row in sync (RLS: own row only). */
    if (current?.user?.id) {
      await supabase.from("profiles").upsert({ id: current.user.id, name: name.trim() });
    }
    /* Optimistic local update — onAuthStateChange will confirm. */
    setUser((u) => (u ? { ...u, name: name.trim() } : u));

    if (emailChanged) {
      return { info: t("auth.emailChangeConfirmSent") };
    }
    return {};
  }, [supabase, t]);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (!email.trim()) return { error: t("auth.validEmail") };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (newPassword.length < 8 || !/\d/.test(newPassword)) return { error: t("auth.passwordMin8Digit") };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const deleteAccount = useCallback(async (): Promise<AuthResult & { activeOrders?: number; activeReturns?: number }> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    /* Deletion needs the service role (server-side) — the browser can't delete
       its own auth user. The route authenticates via the session cookie. */
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return {
        error: d.error || t("auth.deleteAccountFailed"),
        errorCode: d.code === "otp_required" ? "otp_required" : undefined,
        activeOrders: typeof d.activeOrders === "number" ? d.activeOrders : undefined,
        activeReturns: typeof d.activeReturns === "number" ? d.activeReturns : undefined,
      };
    }
    await supabase.auth.signOut();
    setUser(null);
    return {};
  }, [supabase, t]);

  const signOut = useCallback(() => {
    supabase?.auth.signOut();
    setUser(null);
  }, [supabase]);

  /* ── Authenticator-app (TOTP) 2FA — opt-in from Security, and the admin gate ── */

  const listTotpFactors = useCallback(async () => {
    if (!supabase) return { factors: [], error: t("auth.notConfigured") };
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return { factors: [], error: friendly(error.message, t) };
    return { factors: (data?.totp ?? []).filter((f) => f.status === "verified").map((f) => ({ id: f.id })) };
  }, [supabase, t]);

  const enrollTotp = useCallback(async () => {
    if (!supabase) return { error: t("auth.notConfigured") };
    // Clear a dangling unverified factor from an abandoned attempt (else the
    // next enroll fails with a duplicate-name error).
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
    if (error) return { error: friendly(error.message, t) };
    return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  }, [supabase, t]);

  const verifyTotp = useCallback(async (factorId: string, code: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (!/^\d{6}$/.test(code.trim())) return { error: t("auth.mfaEnterTotpCode") };
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr) return { error: friendly(chErr.message, t) };
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const unenrollTotp = useCallback(async (factorId: string, code: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    // Removing a verified factor needs an aal2 session — verify a code first.
    const verified = await verifyTotp(factorId, code);
    if (verified.error) return verified;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t, verifyTotp]);

  const sendPhoneFactorCode = useCallback(async (factorId: string) => {
    if (!supabase) return { error: t("auth.notConfigured") };
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) return { error: friendly(error.message, t) };
    return { challengeId: data.id };
  }, [supabase, t]);

  const verifyPhoneFactor = useCallback(async (factorId: string, challengeId: string, code: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (!/^\d{4,8}$/.test(code.trim())) return { error: t("auth.mfaEnterPhoneCode") };
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: code.trim() });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const mfaRequired = useCallback(async () => {
    if (!supabase) return { required: false };
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!data || data.nextLevel !== "aal2" || data.nextLevel === data.currentLevel) {
      return { required: false };
    }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = (factors?.totp ?? []).find((f) => f.status === "verified");
    if (totp) return { required: true, factorId: totp.id, type: "totp" as const };
    const phone = (factors?.phone ?? []).find((f) => f.status === "verified");
    if (phone) return { required: true, factorId: phone.id, type: "phone" as const, phone: phone.friendly_name };
    return { required: false };
  }, [supabase]);

  /* ── Mandatory email-OTP after password sign-in + "remember this device".
     Uses the same passwordless-OTP primitive as phone login (signInWithOtp/
     verifyOtp), just for email — Supabase's mfa.* API has no email factor. ── */

  const sendEmailOtp = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const verifyEmailOtp = useCallback(async (email: string, token: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (!/^\d{4,8}$/.test(token.trim())) return { error: t("auth.mfaEnterEmailCode") };
    const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: "email" });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const checkTrustedDevice = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/trusted-device");
      const d = await res.json().catch(() => ({}));
      return !!d.trusted;
    } catch {
      return false;
    }
  }, []);

  const trustThisDevice = useCallback(async (remember: boolean = true): Promise<void> => {
    try {
      await fetch("/api/auth/trusted-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remember }),
      });
    } catch {
      /* best-effort — worst case the OTP is asked again next time */
    }
  }, []);

  const linkPhone = useCallback(async (phone: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    const digits = phone.replace(/\s/g, "");
    if (!digits) return { error: t("auth.enterPhone") };
    const { error } = await supabase.auth.updateUser({ phone: digits });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const verifySignupCode = useCallback(async (email: string, token: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    if (!/^\d{4,8}$/.test(token.trim())) return { error: t("auth.mfaEnterEmailCode") };
    const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: "signup" });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  const resendSignupCode = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.notConfigured") };
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
    });
    return error ? { error: friendly(error.message, t) } : {};
  }, [supabase, t]);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signUpWithEmail,
      signInWithGoogle, sendPhoneOtp, signInWithPhone, updateProfile,
      sendPasswordReset, updatePassword, deleteAccount, signOut,
      listTotpFactors, enrollTotp, verifyTotp, unenrollTotp,
      sendPhoneFactorCode, verifyPhoneFactor, mfaRequired,
      sendEmailOtp, verifyEmailOtp, checkTrustedDevice, trustThisDevice, linkPhone, verifySignupCode, resendSignupCode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
