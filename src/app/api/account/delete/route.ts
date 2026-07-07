/**
 * POST /api/account/delete — permanently delete the signed-in user's account.
 *
 * The browser can't delete its own auth user, so this runs server-side with
 * the service role. Identity comes from the session cookie (not the body), so
 * a caller can only ever delete THEIR OWN account.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Deletion is unavailable right now." }, { status: 500 });

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
