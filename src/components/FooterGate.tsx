"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the site footer on focused flows (checkout) to reduce distraction and
 * cart abandonment — standard e-commerce practice. Everywhere else it renders
 * the footer normally.
 */
export default function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/checkout")) return null;
  if (pathname?.startsWith("/admin")) return null; // admin panel has its own shell
  return <>{children}</>;
}
