/**
 * /api/auth/otp-gate — the server side of the mandatory email-OTP step.
 *
 * Supabase's signInWithPassword creates a valid session the moment the
 * password is right, so a purely client-side OTP screen could be skipped by
 * navigating straight to /account. To close that, the client "opens" a gate
 * cookie right after the password check; `proxy.ts` then blocks the protected
 * pages until the OTP is verified, at which point the client "closes" it.
 *
 * The cookie is httpOnly (JS can't delete it from the console) and short-lived.
 * Residual limitation: the underlying session is still valid, so direct API
 * calls aren't gated — this raises the bar on page access, it is not a full
 * cryptographic second factor (that would require Supabase native MFA).
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const OTP_PENDING_COOKIE = "loov-otp-pending";
const MAX_AGE = 15 * 60; // 15 minutes to finish the code step

function crossOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  return !origin || !host || new URL(origin).host !== host;
}

export async function POST(req: NextRequest) {
  if (crossOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const res = NextResponse.json({ ok: true });

  if (action === "open") {
    res.cookies.set(OTP_PENDING_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });
  } else if (action === "close") {
    res.cookies.delete(OTP_PENDING_COOKIE);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  return res;
}
