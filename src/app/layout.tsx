import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/context/AuthContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { LoyaltyProvider } from "@/context/LoyaltyContext";
import { getT } from "@/lib/i18n/server";
import { cookies } from "next/headers";
import Navbar from "@/components/Navbar";
import FooterGate from "@/components/FooterGate";
import StoreChromeGate from "@/components/StoreChromeGate";
import BackToTop from "@/components/BackToTop";
import CartDrawer from "@/components/CartDrawer";
import CartToast from "@/components/CartToast";
import CookieConsent from "@/components/CookieConsent";
import WhatsAppButton from "@/components/WhatsAppButton";
import Footer from "@/components/Footer";
import NewsletterPopup from "@/components/NewsletterPopup";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

// NOTE: no `template` here — every page's own generateMetadata() already
// bakes "— Loov" (or "| Loov") into its title (see meta.*.title across all
// 4 locales, plus product/blog/bundle/order pages). A template would double
// it into "Foo — Loov — Loov" on every single page (found + fixed 13 Jul 2026).
export const metadata: Metadata = {
  title: "Loov — Soft Baby Clothing",
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


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = await getT();
  /* Theme cookie is read server-side so dark mode renders without a flash. */
  const theme = (await cookies()).get("loov-theme")?.value === "dark" ? "dark" : undefined;
  return (
    <html lang={locale} className={archivo.variable} data-theme={theme}>
      <body className="min-h-screen flex flex-col bg-canvas text-ink">
        <LocaleProvider initialLocale={locale}>
        <AuthProvider>
        <CartProvider>
          <WishlistProvider>
          <LoyaltyProvider>
          <StoreChromeGate><Navbar /></StoreChromeGate>
          <main className="flex-1">{children}</main>

          {/* ── Footer (hidden on checkout) ── */}
          <FooterGate><Footer /></FooterGate>
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
