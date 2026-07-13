/**
 * /api/auth/trusted-device — "remember this browser" for the mandatory
 * email-OTP step that follows a password sign-in (see AuthContext.tsx /
 * LoginClient.tsx). The cookie is httpOnly and server-set (not the usual
 * client-set `document.cookie` pattern used for `loov-locale`) because this
 * one is a security token, not a display preference.
 *
 * GET    — is this browser already trusted for the signed-in user?
 * POST   — mint a new trusted-device token (called after a fresh OTP verify
 *          + the user checked "remember this device").
 * DELETE — forget this browser.
 */
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "loov-trusted-device";
const TRUST_DAYS = 30;
/** Minted whenever "remember this device" wasn't checked — still lets
 *  requireVerifiedSession() (src/lib/auth/requireVerifiedSession.ts) treat
 *  a JUST-completed email-OTP verification as step-up proof for the rest of
 *  this browsing session, without extending trust for a full month. */
const SHORT_TRUST_HOURS = 4;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Same-origin (CSRF) check, matching /api/orders and /api/reviews. */
function crossOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  return !origin || !host || new URL(origin).host !== host;
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ trusted: false });

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ trusted: false });

  const { data, error } = await supabase
    .from("trusted_devices")
    .select("id")
    .eq("user_id", user.id)
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  // Table missing (migration not run) or no match → not trusted, ask for a code.
  if (error || !data) return NextResponse.json({ trusted: false });

  await supabase.from("trusted_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return NextResponse.json({ trusted: true });
}

export async function POST(req: NextRequest) {
  if (crossOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // `remember: false` (default true) mints a short-lived record instead of a
  // full 30-day one — used to make EVERY successful email-OTP verify count
  // as step-up proof for API-level checks, not just the ones where the
  // shopper explicitly opted into a long-lived "remember me" cookie.
  const body = await req.json().catch(() => ({}));
  const remember = body?.remember !== false;
  const maxAgeSeconds = remember ? TRUST_DAYS * 24 * 60 * 60 : SHORT_TRUST_HOURS * 60 * 60;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

  const { error } = await supabase.from("trusted_devices").insert({
    user_id: user.id,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    // Migration not run yet — fail gracefully, no cookie, OTP will just be asked again next time.
    console.warn("[trusted-device] insert failed (run supabase/trusted-devices.sql?):", error.message);
    return NextResponse.json({ ok: false });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (user && token) {
    await supabase.from("trusted_devices").delete().eq("user_id", user.id).eq("token_hash", hashToken(token));
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
