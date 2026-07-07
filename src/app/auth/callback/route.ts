/**
 * GET /auth/callback — OAuth & email-confirmation landing point.
 *
 * Google/Facebook (and the sign-up confirmation email) redirect here with a
 * one-time `code`. We exchange it for a session (written to cookies by the
 * server client) and send the shopper on their way.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account";
  /* Only allow same-site relative redirects. */
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
    console.error("[auth/callback] code exchange failed:", error.message);
  }

  return NextResponse.redirect(
    new URL("/login?error=Could+not+sign+you+in+—+please+try+again", url.origin)
  );
}
