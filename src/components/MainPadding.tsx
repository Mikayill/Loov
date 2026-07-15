"use client";

import { usePathname } from "next/navigation";

/**
 * Reserves space for the fixed mobile bottom nav (see MobileBottomNav.tsx)
 * everywhere it actually renders — mirrors FooterGate's exact routes so the
 * two never disagree (checkout/admin get neither the nav nor its padding).
 */
export default function MainPadding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navHidden = pathname?.startsWith("/checkout") || pathname?.startsWith("/admin");
  return <main className={`flex-1 ${navHidden ? "" : "pb-16 sm:pb-0"}`}>{children}</main>;
}
