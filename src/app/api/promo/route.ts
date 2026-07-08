/**
 * /api/promo — promo-code validation for the storefront.
 *
 *  POST { code }   → full check for the signed-in caller (members only).
 *                    200 { ok, code, type, value } or 4xx { error: PromoError }.
 *  GET  ?code=X    → { available: boolean } only — used by the sign-up popup
 *                    to avoid promising a dead code. No values/list leaked,
 *                    no auth needed (it powers a guest-facing popup).
 *
 * The REAL enforcement lives in /api/orders (same shared validator) — this
 * route only exists so the cart can give instant, honest feedback.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { promoAvailable, validatePromoServer } from "@/lib/promoValidation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  if (!code.trim()) return NextResponse.json({ available: false });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ available: false });
  return NextResponse.json({ available: await promoAvailable(admin, code) });
}

export async function POST(req: NextRequest) {
  // Same-origin (CSRF) guard, matching /api/orders.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json({ error: "invalid" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").slice(0, 40);

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "invalid" }, { status: 500 });

  const res = await validatePromoServer(admin, code, userId);
  if (res.error) {
    const status = res.error === "signin" ? 401 : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  const { promo } = res;
  return NextResponse.json({ ok: true, code: promo!.code, type: promo!.type, value: promo!.value });
}
