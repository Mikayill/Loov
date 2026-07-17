import type { TranslationKey } from "@/lib/i18n/dictionaries";

/** Account menu items — shared by the desktop dropdown and anywhere else that
 *  needs the same "your account" shortcut list. Grouped by how a shopper
 *  actually uses them: order lifecycle first (orders → returns), then
 *  engagement (rewards → reviews). No /account/settings entry — that page
 *  was removed; dark mode + language live directly on /account now. */
export const ACCOUNT_LINKS: { href: string; key: TranslationKey; icon: string }[] = [
  { href: "/account/orders",        key: "acct.myOrders",      icon: "📦" },
  { href: "/account/returns",       key: "acct.myReturns",     icon: "↩️" },
  { href: "/account/rewards",       key: "acct.rewards",       icon: "⭐" },
  { href: "/account/reviews",       key: "acct.myReviews",     icon: "📝" },
  { href: "/account/notifications", key: "acct.notifications", icon: "🔔" },
];
