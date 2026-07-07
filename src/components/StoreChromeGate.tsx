"use client";

import { usePathname } from "next/navigation";

/** Hides storefront chrome (navbar, floating widgets) on /admin, which has its own shell. */
export default function StoreChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
