import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import AdminShell from "./AdminShell";
import AdminMfaGate from "./AdminMfaGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Loov",
  robots: { index: false, follow: false }, // never index the admin panel
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  // Non-admins (and guests) get a plain 404 — the panel's existence isn't disclosed.
  if (!admin) notFound();
  // Admin with 2FA enrolled but no code entered this session → verify first.
  if (admin === "mfa-required") return <AdminMfaGate />;

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
