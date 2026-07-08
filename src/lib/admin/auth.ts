/**
 * Admin authorization gate (server-only).
 *
 * The REAL security boundary for /admin. Every admin page and API route calls
 * `requireAdmin()`. It:
 *   1. reads the signed-in user from the session cookie (not spoofable), then
 *   2. checks the `admins` table with the service-role client.
 *
 * Non-admins get `null` — pages then render notFound() (a plain 404, so the
 * panel's existence isn't even disclosed) and API routes return 404/403.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

/** "mfa-required" = the admin HAS 2FA enrolled but this session hasn't
 *  entered a code yet (aal1) — the panel shows a verify screen, APIs 404. */
export type AdminGate = AdminUser | "mfa-required" | null;

/** Returns the admin user, or null if the caller isn't a signed-in admin. */
export async function requireAdmin(): Promise<AdminGate> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const admin = createSupabaseAdminClient();
  if (!admin) return null; // service key not configured → deny by default

  const { data, error } = await admin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;

  // 2FA enforcement: once the admin account has a verified TOTP factor, the
  // panel demands an aal2 session. This closes the OAuth side door — a Google
  // sign-in lands at aal1 without ever being asked for the code.
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      return "mfa-required";
    }
  } catch (e) {
    console.warn("[admin] AAL check failed:", (e as Error).message);
    return null; // can't verify the assurance level → deny by default
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? "",
    name: (meta.name as string) || user.email?.split("@")[0] || "Admin",
  };
}

/** Append an entry to the audit log. Never throws — logging must not break actions. */
export async function writeAudit(entry: {
  actorEmail: string;
  action: string;
  entity?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    await admin.from("audit_log").insert({
      actor_email: entry.actorEmail,
      action: entry.action,
      entity: entry.entity ?? null,
      entity_id: entry.entityId ?? null,
      detail: entry.detail ?? null,
    });
  } catch (e) {
    console.warn("[audit] write failed:", (e as Error).message);
  }
}
