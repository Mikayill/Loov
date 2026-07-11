/**
 * Proxy (Next 16's renamed middleware) — keeps the Supabase auth session
 * fresh. Access tokens expire hourly; this refreshes them on navigation and
 * rewrites the cookies on both the request and the response, so Server
 * Components and Route Handlers always see a valid session.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const OTP_PENDING_COOKIE = "loov-otp-pending";
/** Pages that require a fully verified sign-in (blocked while OTP is pending). */
const OTP_GATED_PREFIXES = ["/account", "/checkout"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next(); // env not set — skip silently

  // Mandatory email-OTP gate: after a password sign-in on a new device the
  // client sets this cookie; block the protected pages until it's cleared by
  // a successful code verification (see /api/auth/otp-gate).
  const path = request.nextUrl.pathname;
  if (
    request.cookies.get(OTP_PENDING_COOKIE)?.value === "1" &&
    OTP_GATED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
  ) {
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("verify", "1");
    return NextResponse.redirect(redirect);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  /* Refreshes the token if expired; result intentionally unused. */
  await supabase.auth.getUser();

  return response;
}

export const config = {
  /* Run on pages & API routes, skip static assets and images. */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
