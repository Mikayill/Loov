/** Shared guard for admin API routes. Returns the admin user, or a 404 Response. */
import { NextResponse } from "next/server";
import { requireAdmin, type AdminUser } from "@/lib/admin/auth";

export async function adminApiGuard(): Promise<AdminUser | NextResponse> {
  const user = await requireAdmin();
  // 404 (not 403) so the endpoint's existence isn't disclosed to non-admins.
  // "mfa-required" is treated the same: no admin API works until the code
  // has been entered for this session (the panel shows the verify screen).
  if (!user || user === "mfa-required") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return user;
}
