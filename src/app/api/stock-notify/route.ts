/**
 * POST /api/stock-notify — join the back-in-stock waitlist for a product.
 * Body: { productId, email, locale? }. Same-origin + rate-limited + email-
 * validated. Stored via the service role (the table has no public policies).
 * When the admin restocks the product, /api/admin/products emails everyone
 * waiting (see notifyBackInStock in src/lib/email/backInStock.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverRateLimited } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (await serverRateLimited(`stock-notify:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const productId = String(body?.productId ?? "").trim();
  const email = String(body?.email ?? "").trim().slice(0, 200);
  const locale = String(body?.locale ?? "en").trim().slice(0, 5);
  if (!productId) return NextResponse.json({ error: "Missing product" }, { status: 400 });
  if (!emailRe.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  const { error } = await admin
    .from("stock_notifications")
    .upsert(
      { product_id: productId, email, locale, notified_at: null },
      { onConflict: "product_id, lower(email)", ignoreDuplicates: true }
    );
  // Table not migrated yet → tell the client to hide the box gracefully.
  if (error && /stock_notifications|relation|schema cache/i.test(error.message)) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  if (error) {
    // Duplicate (already waiting) is fine — treat as success.
    if (/duplicate|unique/i.test(error.message)) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
