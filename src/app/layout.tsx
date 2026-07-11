import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/context/AuthContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { LoyaltyProvider } from "@/context/LoyaltyContext";
import { getT } from "@/lib/i18n/server";
import Navbar from "@/components/Navbar";
import FooterGate from "@/components/FooterGate";
import StoreChromeGate from "@/components/StoreChromeGate";
import BackToTop from "@/components/BackToTop";
import CartDrawer from "@/components/CartDrawer";
import CartToast from "@/components/CartToast";
import CookieConsent from "@/components/CookieConsent";
import WhatsAppButton from "@/components/WhatsAppButton";
import FooterPhone from "@/components/FooterPhone";
import NewsletterPopup from "@/components/NewsletterPopup";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Loov — Soft Baby Clothing", template: "%s — Loov" },
  description:
    "Premium organic baby clothing for your little one. Shop bodysuits, rompers, blankets, towels and more. Delivering across Georgia.",
  keywords: ["baby clothing", "organic cotton", "newborn", "Georgia", "Tbilisi", "loov", "baby shop"],
  openGraph: {
    type: "website",
    siteName: "Loov",
    locale: "en_US",
    title: "Loov — Soft & Safe Baby Clothing",
    description: "Premium organic baby clothing. Delivering across Georgia.",
    images: ["/logo-square.png"],
  },
  twitter: { card: "summary_large_image" },
  metadataBase: new URL("https://loov.ge"),
};

const socialLinks = [
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, locale } = await getT();
  return (
    <html lang={locale} className={nunito.variable}>
      <body
        className="min-h-screen flex flex-col"
        style={{
          backgroundColor: "#F5F0EB",
          color: "#2A2320",
          fontFamily: "var(--font-nunito), Arial, sans-serif",
        }}
      >
        <LocaleProvider initialLocale={locale}>
        <AuthProvider>
        <CartProvider>
          <WishlistProvider>
          <LoyaltyProvider>
          <StoreChromeGate><Navbar /></StoreChromeGate>
          <main className="flex-1">{children}</main>

          {/* ── Footer (hidden on checkout) ── */}
          <FooterGate>
          <footer className="bg-white border-t border-[#DDD5CC]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">

              {/* Brand + social */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Loov" className="h-5 w-auto" />
                </div>
                <p className="text-xs text-[#9A8E88] leading-relaxed mb-4">
                  {t("footer.tagline")}
                </p>
                <div className="flex items-center gap-2 mb-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      aria-label={social.label}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-75 transition-opacity"
                      style={{ backgroundColor: "#5E9E8C" }}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
                {/* Certifications */}
                <div className="flex items-center gap-2 flex-wrap">
                  {["🌿 Organic cotton", "✅ Baby-safe", "🔒 Secure"].map((cert) => (
                    <span key={cert} className="text-[10px] font-bold bg-[#F5F0EB] text-[#5E5450] px-2 py-1 rounded-full">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* Shop links */}
              <div>
                <p className="text-[11px] font-bold text-[#2A2320] uppercase tracking-widest mb-4">{t("footer.shop")}</p>
                <ul className="grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-1 sm:gap-y-2.5">
                  {[
                    { label: "All Products",  href: "/products" },
                    { label: "Bundle Deals",  href: "/bundles" },
                    { label: "Bodysuits",     href: "/products?cat=body" },
                    { label: "Blankets",      href: "/products?cat=blanket" },
                    { label: "Rompers",       href: "/products?cat=romper" },
                    { label: "Gift Sets",     href: "/products?cat=set" },
                    { label: "Bags",          href: "/products?cat=bag" },
                  ].map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-xs text-[#5E5450] hover:text-[#5E9E8C] transition-colors font-medium">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Help links */}
              <div>
                <p className="text-[11px] font-bold text-[#2A2320] uppercase tracking-widest mb-4">{t("footer.help")}</p>
                <ul className="grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-1 sm:gap-y-2.5">
                  {[
                    { label: "About Us",      href: "/about" },
                    { label: "FAQ",           href: "/faq" },
                    { label: "Size Guide",    href: "/size-guide" },
                    { label: "Track Order",   href: "/track-order" },
                    { label: "Contact Us",    href: "/contact" },
                    { label: "My Account",    href: "/account" },
                  ].map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-xs text-[#5E5450] hover:text-[#5E9E8C] transition-colors font-medium">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <p className="text-[11px] font-bold text-[#2A2320] uppercase tracking-widest mb-4">{t("footer.contact")}</p>
                <div className="grid grid-cols-3 gap-3 text-xs text-[#5E5450] mb-4">
                  {/* Address (+ working hours beneath it) */}
                  <div className="min-w-0">
                    <p className="flex items-start gap-1.5"><span className="flex-shrink-0">📍</span> Tbilisi, Georgia</p>
                    <p className="flex items-start gap-1.5 mt-1.5 text-[#9A8E88]"><span className="flex-shrink-0">🕐</span> {t("footer.hours")}</p>
                  </div>
                  {/* Email */}
                  <div className="min-w-0">
                    <a href="mailto:hello@loov.ge" className="flex items-start gap-1.5 hover:text-[#5E9E8C] transition-colors break-all"><span className="flex-shrink-0">📧</span> hello@loov.ge</a>
                  </div>
                  {/* Phone — appears once the business number is set in admin settings */}
                  <FooterPhone />
                </div>
                {/* Payment method — cash on delivery is the only one offered today;
                    card badges return when online payments (Faz 3) go live. */}
                <div>
                  <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-2">{t("footer.weAccept")}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold bg-[#EAF2F0] border border-[#C8DDD8] text-[#5E9E8C] px-2 py-1 rounded">
                      💵 {t("checkout.paymentOnDelivery")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-[#DDD5CC] py-4 px-4">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-[#9A8E88]">
                  {t("footer.rights")}
                </p>
                <div className="flex items-center gap-5">
                  <a href="/privacy" className="text-xs text-[#9A8E88] hover:text-[#5E9E8C] transition-colors">{t("footer.privacy")}</a>
                  <a href="/terms"   className="text-xs text-[#9A8E88] hover:text-[#5E9E8C] transition-colors">{t("footer.terms")}</a>
                  <a href="/contact" className="text-xs text-[#9A8E88] hover:text-[#5E9E8C] transition-colors">{t("footer.contact")}</a>
                </div>
              </div>
            </div>
          </footer>
          </FooterGate>
          <StoreChromeGate>
          <BackToTop />
          <CartDrawer />
          <CartToast />
          <WhatsAppButton />
          <CookieConsent />
          <NewsletterPopup />
          </StoreChromeGate>
          </LoyaltyProvider>
          </WishlistProvider>
        </CartProvider>
        </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
