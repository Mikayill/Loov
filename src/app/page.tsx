import Link from "next/link";
import CategoryFilter from "@/components/CategoryFilter";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import BabyPicksSection from "@/components/BabyPicksSection";
import { getAllProducts } from "@/lib/db/products";
import { getAllBundles } from "@/lib/db/bundles";
import { formatPrice } from "@/lib/format";
import BundleQuickView from "@/components/BundleQuickView";
import { getT } from "@/lib/i18n/server";

// Cache the DB catalog for 60s so pages load fast; admin edits show within a minute.
export const revalidate = 60;

export default async function HomePage() {
  const { t } = await getT();
  const [products, bundles] = await Promise.all([getAllProducts(), getAllBundles()]);
  const productBySlug = new Map(products.map((p) => [p.slug, p]));

  /* Show new arrivals first on homepage, max 8 products */
  const featuredProducts = [
    ...products.filter((p) => p.isNew),
    ...products.filter((p) => !p.isNew),
  ].slice(0, 8);
  return (
    <>
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden py-5 sm:py-12 px-4"
        style={{ background: "linear-gradient(135deg, #F5F0EB 0%, #E8F0EE 55%, #EAE8F0 100%)" }}
      >
        <div className="absolute top-4 left-6 w-16 h-16 rounded-full opacity-35" style={{ backgroundColor: "#C8DDD8" }} />
        <div className="absolute bottom-4 right-8 w-24 h-24 rounded-full opacity-20" style={{ backgroundColor: "#C4D4E4" }} />
        <div className="absolute top-1/2 right-16 w-10 h-10 rounded-full opacity-30" style={{ backgroundColor: "#D4CAE4" }} />

        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-12">
            {/* Text */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1.5 sm:mb-2">
                <span className="text-xl sm:text-3xl">🌿</span>
                <span className="text-[10px] sm:text-xs font-bold text-[#5E9E8C] uppercase tracking-widest">
                  {t("home.hero.badge")}
                </span>
              </div>
              <h1 className="text-xl sm:text-4xl font-extrabold text-[#2A2320] mb-1.5 sm:mb-3 leading-tight">
                {t("home.hero.titleA")}{" "}
                <span style={{ color: "#5E9E8C" }}>{t("home.hero.titleB")}</span>
              </h1>
              <p className="text-[13px] sm:text-base text-[#5E5450] mb-3 sm:mb-5 max-w-md mx-auto sm:mx-0 leading-snug sm:leading-relaxed">
                {t("home.hero.subtitle")}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2.5 sm:gap-3 flex-wrap">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 font-bold px-7 py-3 rounded-full text-white transition-all shadow-sm hover:shadow-md hover:opacity-90 text-sm"
                  style={{ backgroundColor: "#5E9E8C" }}
                >
                  {t("home.hero.shopCta")} →
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 font-semibold px-5 py-3 rounded-full border-2 border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-all text-sm bg-white"
                >
                  {t("home.hero.ourStory")}
                </Link>
              </div>
            </div>

            {/* Stat badges — desktop only */}
            <div className="hidden sm:flex flex-col gap-3 flex-shrink-0">
              {[
                { value: "100%", label: t("home.hero.statOrganic") },
                { value: "Free", label: t("home.hero.statFreeShip") },
                { value: "14d",  label: t("home.hero.statReturns") },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl border border-[#DDD5CC] px-5 py-3 text-center w-40 shadow-sm"
                >
                  <p className="text-xl font-extrabold" style={{ color: "#5E9E8C" }}>{s.value}</p>
                  <p className="text-[11px] text-[#9A8E88] font-semibold mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Shop by Category (compact) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-base sm:text-xl font-extrabold text-[#2A2320]">{t("home.category.title")}</h2>
          <span className="hidden sm:block text-[#9A8E88] text-xs">{t("home.category.subtitle")}</span>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-6 gap-2 sm:gap-4">
          {[
            { cat: "body",    emoji: "👶", label: t("category.body"),    bg: "#C8DDD8", href: "/products?cat=body" },
            { cat: "blanket", emoji: "☁️", label: t("category.blanket"), bg: "#C4D4E4", href: "/products?cat=blanket" },
            { cat: "set",     emoji: "🎀", label: t("category.set"),     bg: "#D0E0CC", href: "/products?cat=set" },
            { cat: "towel",   emoji: "🛁", label: t("category.towel"),   bg: "#E4D8C4", href: "/products?cat=towel" },
            { cat: "romper",  emoji: "🐻", label: t("category.romper"),  bg: "#D4CAE4", href: "/products?cat=romper" },
            { cat: "bag",     emoji: "🐰", label: t("category.bag"),     bg: "#EED4BC", href: "/products?cat=bag" },
          ].map((item) => (
            <Link
              key={item.cat}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-[#DDD5CC] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              style={{ backgroundColor: item.bg + "80" }}
            >
              <span className="text-xl sm:text-3xl group-hover:scale-110 transition-transform duration-200">
                {item.emoji}
              </span>
              <span className="text-[9px] sm:text-xs font-bold text-[#2A2320] text-center leading-tight">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Picked for your baby (client-side, renders only for signed-in parents with a saved birthdate) ── */}
      <BabyPicksSection />

      {/* ── Featured Products ── */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-[#2A2320]">{t("home.featured.title")}</h2>
            <p className="text-[#5E5450] text-sm mt-1">{t("home.featured.subtitle")}</p>
          </div>
          <Link
            href="/products"
            className="text-sm font-bold text-[#5E9E8C] hover:underline flex items-center gap-1"
          >
            {t("home.featured.viewAll").replace("{count}", String(products.length))} →
          </Link>
        </div>
        <CategoryFilter products={featuredProducts} />
      </section>

      {/* ── Bundle Deals Banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-bold text-[#5E9E8C] uppercase tracking-widest mb-1">{t("home.bundles.eyebrow")}</p>
            <h2 className="text-2xl font-extrabold text-[#2A2320]">{t("home.bundles.title")}</h2>
          </div>
          <Link
            href="/bundles"
            className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-[#5E9E8C] hover:underline"
          >
            {t("home.bundles.viewAll")} →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {bundles.slice(0, 4).map((bundle) => {
            const savings = bundle.originalPrice - bundle.bundlePrice;
            return (
              <Link
                key={bundle.slug}
                href={`/bundles/${bundle.slug}`}
                className="group bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Fixed aspect ratio — cards stay the same size with or without a photo */}
                <div
                  className="relative flex items-center justify-center overflow-hidden aspect-[4/3]"
                  style={{ backgroundColor: bundle.cardColor }}
                >
                  {bundle.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bundle.imageUrl} alt={bundle.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  ) : (
                    <span className="text-4xl group-hover:scale-110 transition-transform duration-200 block">
                      {bundle.emoji}
                    </span>
                  )}
                  <span className="absolute top-2 right-2 bg-[#2A2320] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {t("home.bundles.save").replace("{amount}", formatPrice(savings))}
                  </span>
                  <BundleQuickView
                    bundle={bundle}
                    itemProducts={bundle.items.map((config) => ({
                      config,
                      product: productBySlug.get(config.slug) ?? null,
                    }))}
                  />
                </div>
                <div className="p-3">
                  <p className="font-bold text-[#2A2320] text-xs leading-snug mb-1 line-clamp-1 group-hover:text-[#5E9E8C] transition-colors">
                    {bundle.name}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-extrabold text-[#2A2320] text-sm">{formatPrice(bundle.bundlePrice)}</span>
                    <span className="text-[10px] text-[#9A8E88] line-through">{formatPrice(bundle.originalPrice)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 text-center sm:hidden">
          <Link href="/bundles" className="text-sm font-bold text-[#5E9E8C] hover:underline">
            {t("home.bundles.viewAll")} →
          </Link>
        </div>
      </section>

      {/* ── Recently Viewed (client-side, renders only if history exists) ── */}
      <RecentlyViewedSection />

      {/* ── Why us strip ── */}
      <div className="bg-white border-t border-[#DDD5CC] py-5 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {[
            { emoji: "🌿", text: t("home.why.organic") },
            { emoji: "💝", text: t("home.why.love") },
            { emoji: "✅", text: t("home.why.quality") },
            { emoji: "🔒", text: t("home.why.secure") },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-2 text-sm font-semibold text-[#5E5450]">
              <span>{f.emoji}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── What Parents Say (at the bottom) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-8">
          <p className="text-xs font-bold text-[#5E9E8C] uppercase tracking-widest mb-2">{t("home.reviews.eyebrow")}</p>
          <h2 className="text-2xl font-extrabold text-[#2A2320]">{t("home.reviews.title")}</h2>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 mb-8 flex-wrap">
          {[
            { value: "500+",  label: t("home.reviews.statFamilies") },
            { value: "4.9",   label: t("home.reviews.statRating"), star: true },
            { value: "100%",  label: t("home.reviews.statOrganic") },
            { value: "14d",   label: t("home.reviews.statReturns") },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-[#2A2320] flex items-center gap-1 justify-center">
                {s.value}
                {s.star && <span className="text-xl text-[#F0B840]">★</span>}
              </p>
              <p className="text-xs text-[#9A8E88] font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Review cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              name: "Nino T.",
              city: "Tbilisi",
              rating: 5,
              text: t("home.reviews.r1"),
              initials: "N",
            },
            {
              name: "Mariam K.",
              city: "Batumi",
              rating: 5,
              text: t("home.reviews.r2"),
              initials: "M",
            },
            {
              name: "Ana B.",
              city: "Rustavi",
              rating: 5,
              text: t("home.reviews.r3"),
              initials: "A",
            },
          ].map((r) => (
            <div key={r.name} className="bg-white rounded-2xl border border-[#DDD5CC] p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-0.5 mb-3">
                {[1,2,3,4,5].map((i) => (
                  <svg key={i} className="w-4 h-4" viewBox="0 0 20 20" fill={i <= r.rating ? "#F0B840" : "#DDD5CC"}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-[#5E5450] leading-relaxed mb-4">&ldquo;{r.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0"
                  style={{ backgroundColor: "#5E9E8C" }}
                >
                  {r.initials}
                </div>
                <div>
                  <p className="font-bold text-[#2A2320] text-sm">{r.name}</p>
                  <p className="text-[11px] text-[#9A8E88]">{r.city} · {t("home.reviews.verified")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
