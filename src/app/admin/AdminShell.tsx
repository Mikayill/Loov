"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Wordmark from "@/components/Wordmark";
import type { AdminUser } from "@/lib/admin/auth";

type Section = "orders" | "returns" | "reviews";

const NAV: { href: string; label: string; icon: string; exact?: boolean; section?: Section }[] = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/products", label: "Products", icon: "🏷️" },
  { href: "/admin/bundles", label: "Bundles", icon: "🎀" },
  { href: "/admin/promos", label: "Promos", icon: "🎟️" },
  { href: "/admin/orders", label: "Orders", icon: "📦", section: "orders" },
  { href: "/admin/returns", label: "Returns", icon: "↩️", section: "returns" },
  { href: "/admin/reviews", label: "Reviews", icon: "⭐", section: "reviews" },
  { href: "/admin/logs", label: "Activity Log", icon: "📜" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

const UNREAD_POLL_MS = 60_000;

export default function AdminShell({ admin, children }: { admin: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState<Record<Section, number>>({ orders: 0, returns: 0, reviews: 0 });

  /* Admin is light-only: the .route-admin class disables every dark-theme
     CSS override while the panel is mounted (storefront keeps the choice). */
  useEffect(() => {
    document.documentElement.classList.add("route-admin");
    return () => document.documentElement.classList.remove("route-admin");
  }, []);
  const seenThisVisit = useRef<Set<Section>>(new Set());

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(href + "/");

  /* Poll unread counts (badge clears itself when the section's own page marks it seen). */
  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/admin/unread")
        .then((r) => r.json())
        .then((d) => { if (!cancelled && d.ready !== false) setUnread({ orders: d.orders, returns: d.returns, reviews: d.reviews }); })
        .catch(() => {});
    }
    load();
    const id = setInterval(load, UNREAD_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  /* Visiting a section's page marks it seen (once per visit) and clears its badge. */
  useEffect(() => {
    const current = NAV.find((n) => n.section && isActive(n.href, n.exact))?.section;
    if (!current || seenThisVisit.current.has(current)) return;
    seenThisVisit.current.add(current);
    setUnread((prev) => ({ ...prev, [current]: 0 }));
    fetch("/api/admin/unread", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: current }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function Badge({ n }: { n: number }) {
    if (n <= 0) return null;
    return (
      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-extrabold leading-none">
        {n > 99 ? "99+" : n}
      </span>
    );
  }

  const nav = (
    <nav className="space-y-1">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-bold transition-colors ${
            isActive(n.href, n.exact)
              ? "bg-accent text-white"
              : "text-ink-soft hover:bg-panel"
          }`}
        >
          <span className="text-base">{n.icon}</span>
          {n.label}
          {n.section && <Badge n={unread[n.section]} />}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-canvas">
      {/* Sidebar (desktop) */}
      <aside className="hidden sm:flex sm:flex-col w-60 flex-shrink-0 bg-canvas border-r border-line p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <Wordmark className="text-[17px] text-ink" />
          <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-0.5">Admin</p>
        </div>
        {nav}
        <div className="mt-auto pt-4 border-t border-canvas">
          <p className="px-3 text-[11px] text-ink-muted truncate mb-2">{admin.email}</p>
          <div className="flex gap-2 px-1">
            <Link href="/" className="flex-1 text-center text-xs font-bold text-accent border border-line rounded-lg py-2 hover:bg-panel transition-colors">
              View site
            </Link>
            <button
              onClick={() => { signOut(); router.push("/"); }}
              className="flex-1 text-xs font-bold text-danger border border-line rounded-lg py-2 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sm:hidden flex items-center justify-between bg-canvas border-b border-line px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Wordmark className="text-[17px] text-ink" />
          <span className="font-extrabold text-accent text-sm">Admin</span>
        </div>
        <button onClick={() => setMobileOpen((v) => !v)} className="text-2xl leading-none px-2" aria-label="Menu">
          {mobileOpen ? "✕" : "☰"}
        </button>
      </header>
      {mobileOpen && (
        <div className="sm:hidden bg-canvas border-b border-line px-4 py-3">
          {nav}
          <div className="flex gap-2 mt-3 pt-3 border-t border-canvas">
            <Link href="/" className="flex-1 text-center text-xs font-bold text-accent border border-line rounded-lg py-2">View site</Link>
            <button onClick={() => { signOut(); router.push("/"); }} className="flex-1 text-xs font-bold text-danger border border-line rounded-lg py-2">Sign out</button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
