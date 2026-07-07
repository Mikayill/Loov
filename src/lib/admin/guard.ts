/** Shared guard for admin API routes. Returns the admin user, or a 404 Response. */
import { NextResponse } from "next/server";
import { requireAdmin, type AdminUser } from "@/lib/admin/auth";

export async function adminApiGuard(): Promise<AdminUser | NextResponse> {
  const user = await requireAdmin();
  if (!user) {
    // 404 (not 403) so the endpoint's existence isn't disclosed to non-admins.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return user;
}
