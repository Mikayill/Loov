/**
 * POST /api/account/delete — permanently delete the signed-in user's account.
 *
 * The browser can't delete its own auth user, so this runs server-side with
 * the service role. Identity comes from the session cookie (not the body), so
 * a caller can only ever delete THEIR OWN account.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedSession } from "@/lib/auth/requireVerifiedSession";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // ── CSRF: only accept same-origin requests — this is the single most
  // destructive action in the app, so it gets the same explicit check every
  // other state-changing route has (defense-in-depth on top of the auth
  // cookie's own SameSite protection). ──
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  // Highest-risk action in the app — permanently deletes the account.
  // Requires a recently-verified session (AAL2 or a live trusted-device),
  // not just any valid cookie.
  const verified = await requireVerifiedSession();
  if (verified instanceof NextResponse) return verified;
  const user = verified;

  const supabase = await createSupabaseServerClient();

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Deletion is unavailable right now." }, { status: 500 });

  // Block deletion while orders are still on their way — otherwise the
  // customer loses all access to track/return a parcel that's mid-delivery.
  const { count: activeOrders, error: activeErr } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["pending", "processing", "shipped"]);
  if (activeErr) {
    console.error("[account/delete] active-order check failed:", activeErr.message);
    return NextResponse.json({ error: "Could not verify your orders — try again later." }, { status: 500 });
  }
  if ((activeOrders ?? 0) > 0) {
    return NextResponse.json(
      { error: "You still have active orders.", activeOrders },
      { status: 409 }
    );
  }

  // Also refuse while a return is being processed (money on its way back).
  const { count: activeReturns } = await admin
    .from("returns")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["requested", "approved", "received"]);
  if ((activeReturns ?? 0) > 0) {
    return NextResponse.json(
      { error: "You still have an active return request.", activeReturns },
      { status: 409 }
    );
  }

  // Detach the user from their orders (keep the orders for bookkeeping, but
  // scrub the link). profiles/addresses cascade on auth user delete.
  await admin.from("orders").update({ user_id: null }).eq("user_id", user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account/delete] failed:", error.message);
    return NextResponse.json({ error: "Could not delete account." }, { status: 500 });
  }
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
