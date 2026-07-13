/**
 * Step-up verification gate for API routes that touch sensitive/destructive
 * user data (account deletion, returns, order cancellation…). This is the
 * API-level counterpart to proxy.ts's page-level OTP gate — proxy.ts only
 * blocks NAVIGATION to /account and /checkout while `loov-otp-pending` is
 * set; it does nothing for direct fetch()/API calls, and that flag is a bare
 * client-toggled cookie the server never actually verifies (see
 * src/app/api/auth/otp-gate/route.ts). It must not be trusted here.
 *
 * The only two genuinely server-verified "this session passed step-up"
 * signals in the codebase are:
 *   1. AAL2 (the account has a TOTP/phone MFA factor and this session
 *      actually verified it — Supabase's own session claim), or
 *   2. a live, DB-backed `trusted_devices` row matching the
 *      `loov-trusted-device` cookie (SHA-256 hashed, never the raw token) —
 *      minted after every successful email-OTP verify, short-lived (a few
 *      hours) unless the shopper checked "remember this device" (~30 days).
 *
 * NOT gated here on purpose: routine actions already protected by nothing
 * more than a valid session in most stores (e.g. placing an order) — only
 * account-management / high-risk actions get the extra check, matching how
 * major e-commerce sites reserve step-up verification for things like
 * deleting an account or changing payout details, not everyday checkout.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import type { User } from "@supabase/supabase-js";

const TRUSTED_DEVICE_COOKIE = "loov-trusted-device";

/** The full Supabase user (id/email/user_metadata/…) — callers that only
 *  ever needed `getUser()`'s result before can drop that call in favor of
 *  this one without losing any field they were reading. */
export type VerifiedSession = User;

/**
 * Returns the verified user, or a ready-to-return 401 NextResponse (with
 * `code: "otp_required"` so the client can redirect to /login?verify=1
 * instead of showing a raw error — see the `otp_required` handling pattern
 * already used for checkout/return/review errors).
 */
export async function requireVerifiedSession(): Promise<VerifiedSession | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ error: "Not signed in", code: "not_signed_in" }, { status: 401 });

  // Path 1: TOTP/phone MFA already elevated this session to AAL2.
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") {
      return user;
    }
  } catch (e) {
    console.warn("[requireVerifiedSession] AAL check failed:", (e as Error).message);
    // fall through to the trusted-device check rather than hard-denying —
    // AAL lookups failing shouldn't be able to lock every account out.
  }

  // Path 2: a live trusted_devices row for the cookie on this request.
  const jar = await cookies();
  const token = jar.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data, error } = await supabase
      .from("trusted_devices")
      .select("id")
      .eq("user_id", user.id)
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!error && data) {
      return user;
    }
  }

  return NextResponse.json(
    { error: "Please verify your identity again before doing this.", code: "otp_required" },
    { status: 401 }
  );
}
