"use client";

/**
 * Persistent thumb-zone navigation — every major mobile commerce app
 * (Amazon, Zara, Shein…) keeps Home/Shop/Wishlist/Cart/Account one tap away
 * at the bottom of the screen, since that's the zone a thumb reaches without
 * re-gripping the phone. The top navbar's icons stay too (informational at
 * a glance); this is what you actually tap while scrolling one-handed.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[9px] font-extrabold text-white flex items-center justify-center leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { count: wCount, hasUrgency } = useWishlist();
  const { user } = useAuth();
  const { t } = useLocale();

  const tabs = [
    {
      href: "/",
      label: t("nav.home"),
      active: pathname === "/",
      badge: 0,
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
        </svg>
      ),
    },
    {
      href: "/products",
      label: t("nav.products"),
      active: pathname.startsWith("/products"),
      badge: 0,
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25c-.67 0-1.19-.578-1.119-1.243l1.263-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
      ),
    },
    {
      href: "/wishlist",
      label: t("nav.wishlist"),
      active: pathname === "/wishlist",
      badge: wCount,
      urgent: hasUrgency,
      icon: (
        <svg className="w-[22px] h-[22px]" fill={pathname === "/wishlist" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      href: "/cart",
      label: t("nav.cart"),
      active: pathname === "/cart",
      badge: totalItems,
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      href: user ? "/account" : "/login",
      label: user ? t("nav.account") : t("nav.signIn"),
      active: pathname.startsWith("/account") || pathname === "/login" || pathname === "/register",
      badge: 0,
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const activeIndex = tabs.findIndex((tab) => tab.active);

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-canvas/95 backdrop-blur-lg border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative grid grid-cols-5">
        {/* Sliding active-tab pill — replaces the old "just a darker text
            color" indicator with something that's actually easy to spot at a
            glance and animates smoothly between tabs. */}
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="absolute top-1.5 h-10 rounded-control bg-accent-soft transition-[left] duration-300"
            style={{ left: `calc(${activeIndex} * 20% + 8px)`, width: "calc(20% - 16px)", transitionTimingFunction: "var(--ease-snappy)" }}
          />
        )}
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 h-14 transition-colors active:scale-95 ${
              tab.active ? "text-accent" : "text-ink-muted"
            }`}
          >
            <span className={`relative transition-transform duration-300 ${tab.active ? "scale-110 -translate-y-0.5" : ""}`} style={tab.active ? { transitionTimingFunction: "var(--ease-snappy)" } : undefined}>
              {tab.icon}
              <Badge count={tab.badge} />
              {tab.urgent && tab.badge <= 0 && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-danger ring-2 ring-canvas animate-pulse" />
              )}
            </span>
            <span className={`text-[10px] leading-none truncate max-w-[60px] transition-all ${tab.active ? "font-extrabold" : "font-semibold"}`}>
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
