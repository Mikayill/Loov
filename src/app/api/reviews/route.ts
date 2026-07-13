/**
 * /api/reviews — customer reviews (purchase-gated).
 *
 *  GET  ?productId=…  → published reviews + rating stats + the caller's
 *                       eligibility (signed in? bought & delivered? already reviewed?)
 *  GET  ?mine=1       → the signed-in caller's own reviews (hidden ones included)
 *  POST { productId, rating, body, showName }
 *                     → create a review. ONLY allowed when the signed-in user has a
 *                       DELIVERED order containing the product. Text-only, one per user/product.
 *  PATCH { id, rating?, body?, showName? } → edit OWN review (status untouched —
 *                       an admin-hidden review can't resurface itself via edit)
 *  DELETE ?id=…       → delete OWN review
 *
 * Reviews are inserted with the service role after the eligibility check, so
 * there is no public insert path a client could abuse.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedSession } from "@/lib/auth/requireVerifiedSession";

export const dynamic = "force-dynamic";

interface ReviewRow {
  id: string;
  rating: number;
  body: string;
  show_name: boolean;
  author_name: string | null;
  user_id: string | null;
  created_at: string;
  admin_reply: string | null;
  admin_reply_at: string | null;
}

/** Has this user received (delivered) this product? Uses the SQL helper, with a query fallback. */
async function hasDelivered(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  productId: string
): Promise<boolean> {
  if (!admin) return false;
  const rpc = await admin.rpc("has_delivered_product", { p_user: userId, p_product: productId });
  if (!rpc.error) return !!rpc.data;
  // Fallback if the SQL function isn't installed: query directly.
  const { data } = await admin
    .from("orders")
    .select("id, order_items!inner(product_id)")
    .eq("user_id", userId)
    .eq("status", "delivered")
    .eq("order_items.product_id", productId)
    .limit(1);
  return !!(data && data.length);
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;

  // ── My Reviews (account page): the caller's own rows, hidden included ──
  if (params.get("mine") === "1") {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return NextResponse.json({ reviews: [] });

    // Server client + RLS "reviews_select_own" → only the caller's rows.
    let { data, error } = await supabase
      .from("reviews")
      .select("id, product_id, rating, body, show_name, status, created_at, admin_reply, admin_reply_at")
      .order("created_at", { ascending: false });

    // admin_reply/admin_reply_at need supabase/notifications.sql — retry without
    // them so "My Reviews" still loads if that migration hasn't run yet.
    if (error && /admin_reply/i.test(error.message)) {
      const fallback = await supabase
        .from("reviews")
        .select("id, product_id, rating, body, show_name, status, created_at")
        .order("created_at", { ascending: false });
      data = fallback.data as typeof data;
      error = fallback.error;
    }
    if (error) return NextResponse.json({ reviews: [], ready: false });

    const reviews = (data ?? []).map((r) => ({
      id: r.id as string,
      productId: r.product_id as string,
      rating: r.rating as number,
      body: r.body as string,
      showName: !!r.show_name,
      status: (r.status as string) === "hidden" ? "hidden" : "published",
      createdAt: r.created_at as string,
      adminReply: (r as { admin_reply?: string | null }).admin_reply ?? null,
      adminReplyAt: (r as { admin_reply_at?: string | null }).admin_reply_at ?? null,
    }));
    return NextResponse.json({ reviews, ready: true });
  }

  const productId = params.get("productId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // Who's asking? Resolved FIRST so eligibility (signed in? bought it?) stays
  // correct even when the reviews table doesn't exist yet.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  let { data, error } = await supabase
    .from("reviews")
    .select("id, rating, body, show_name, author_name, user_id, created_at, admin_reply, admin_reply_at")
    .eq("product_id", productId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  // admin_reply/admin_reply_at need supabase/notifications.sql. If the reviews
  // table exists but that migration hasn't run yet, retry without those two
  // columns so reviews still render (just without any reply) instead of
  // vanishing entirely.
  if (error && /admin_reply/i.test(error.message)) {
    const fallback = await supabase
      .from("reviews")
      .select("id, rating, body, show_name, author_name, user_id, created_at")
      .eq("product_id", productId)
      .eq("status", "published")
      .order("created_at", { ascending: false });
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  const rows = (error ? [] : (data ?? [])) as ReviewRow[];

  // Caller eligibility — independent of whether the reviews table exists
  // (delivery check runs against the orders table).
  let eligibility: {
    signedIn: boolean;
    canReview: boolean;
    alreadyReviewed: boolean;
    myReviewStatus: "published" | "hidden" | null;
  } = { signedIn: false, canReview: false, alreadyReviewed: false, myReviewStatus: null };
  if (user) {
    const admin = createSupabaseAdminClient();
    // Look up the caller's own row directly (any status) — a review the admin
    // hid must still count as "already reviewed", otherwise the form reappears
    // and the submit dies on the unique constraint with a confusing 409.
    let myReviewStatus: "published" | "hidden" | null = null;
    if (admin) {
      const { data: mine } = await admin
        .from("reviews")
        .select("status")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (mine) myReviewStatus = mine.status === "hidden" ? "hidden" : "published";
    } else if (rows.some((r) => r.user_id === user.id)) {
      myReviewStatus = "published";
    }
    const alreadyReviewed = myReviewStatus !== null;
    const delivered = admin ? await hasDelivered(admin, user.id, productId) : false;
    eligibility = { signedIn: true, canReview: delivered && !alreadyReviewed, alreadyReviewed, myReviewStatus };
  }

  // Table not created yet → behave as "no reviews" so the page still renders.
  if (error) {
    return NextResponse.json({ reviews: [], stats: { avg: 0, count: 0, breakdown: {} }, eligibility, ready: false });
  }
  const reviews = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    // Only expose the name if the reviewer opted to show it.
    name: r.show_name && r.author_name ? r.author_name : null,
    createdAt: r.created_at,
    adminReply: r.admin_reply ?? null,
    adminReplyAt: r.admin_reply_at ?? null,
  }));

  const count = rows.length;
  const avg = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  const breakdown: Record<number, number> = {};
  for (let s = 5; s >= 1; s--) breakdown[s] = rows.filter((r) => r.rating === s).length;

  return NextResponse.json({ reviews, stats: { avg, count, breakdown }, eligibility, ready: true });
}

export async function POST(req: NextRequest) {
  // Same-origin (CSRF) guard, matching /api/orders.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const verified = await requireVerifiedSession();
  if (verified instanceof NextResponse) return verified;
  const user = verified;

  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId ?? "");
  const rating = Number(body.rating);
  const text = String(body.body ?? "").trim();
  const showName = !!body.showName;

  // `code` lets the client show these in the shopper's language.
  if (!productId) return NextResponse.json({ error: "Missing product" }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1–5 stars" }, { status: 400 });
  if (text.length < 10) return NextResponse.json({ error: "Please write at least a few words (10+ characters).", code: "too_short" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Review is too long (max 2000 characters).", code: "too_long" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Reviews are temporarily unavailable.", code: "unavailable" }, { status: 500 });

  // Eligibility: must have a DELIVERED order with this product.
  const delivered = await hasDelivered(admin, user.id, productId);
  if (!delivered) {
    return NextResponse.json({ error: "Only customers who have received this product can review it.", code: "not_eligible" }, { status: 403 });
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const authorName = (meta.name as string) || user.email?.split("@")[0] || "Customer";

  const { error } = await admin.from("reviews").insert({
    product_id: productId,
    user_id: user.id,
    rating,
    body: text,
    show_name: showName,
    author_name: authorName,
    status: "published",
  });
  if (error) {
    if (/duplicate key|unique/i.test(error.message)) {
      return NextResponse.json({ error: "You've already reviewed this product.", code: "already_reviewed" }, { status: 409 });
    }
    if (/relation .*reviews.* does not exist|reviews/i.test(error.message) && /exist/i.test(error.message)) {
      return NextResponse.json({ error: "Reviews aren't set up yet. Run supabase/features.sql." }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Same-origin (CSRF) check shared by the write methods. */
function crossOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  return !origin || !host || new URL(origin).host !== host;
}

/**
 * Load a review and verify it belongs to `userId`. Missing OR someone
 * else's → null (the caller answers 404 either way — no existence leak).
 */
async function ownReview(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  id: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await admin
    .from("reviews")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return false;
  return data.user_id === userId;
}

export async function PATCH(req: NextRequest) {
  if (crossOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }
  const verified = await requireVerifiedSession();
  if (verified instanceof NextResponse) return verified;
  const user = verified;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing review id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.rating !== undefined) {
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1–5 stars" }, { status: 400 });
    }
    patch.rating = rating;
  }
  if (body.body !== undefined) {
    const text = String(body.body ?? "").trim();
    if (text.length < 10) return NextResponse.json({ error: "Please write at least a few words (10+ characters).", code: "too_short" }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: "Review is too long (max 2000 characters).", code: "too_long" }, { status: 400 });
    patch.body = text;
  }
  if (body.showName !== undefined) patch.show_name = !!body.showName;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Reviews are temporarily unavailable." }, { status: 500 });
  if (!(await ownReview(admin, id, user.id))) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // NOTE: `status` is deliberately never part of the patch — editing an
  // admin-hidden review must not put it back on the product page.
  const { error } = await admin.from("reviews").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (crossOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }
  const verified = await requireVerifiedSession();
  if (verified instanceof NextResponse) return verified;
  const user = verified;

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Missing review id" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Reviews are temporarily unavailable." }, { status: 500 });
  if (!(await ownReview(admin, id, user.id))) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const { error } = await admin.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
