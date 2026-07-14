import Link from "next/link";
import CategoryFilter from "@/components/CategoryFilter";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import BabyPicksSection from "@/components/BabyPicksSection";
import { getAllProducts } from "@/lib/db/products";
import { getAllBundles } from "@/lib/db/bundles";
import { getSettings } from "@/lib/db/settings";
import { getHomeReviews } from "@/lib/db/reviews";
import { fmtDate } from "@/lib/i18n/format";
import { formatPrice } from "@/lib/format";
import BundleQuickView from "@/components/BundleQuickView";
import { getT } from "@/lib/i18n/server";
import { sortBySeason } from "@/lib/season";
import Reveal from "@/components/ui/Reveal";

// Cache the DB catalog for 60s so pages load fast; admin edits show within a minute.
export const revalidate = 60;

export default async function HomePage() {
  const { t, locale } = await getT();
  const [products, bundles, settings, homeReviews] = await Promise.all([getAllProducts(), getAllBundles(), getSettings(), getHomeReviews()]);
  const productBySlug = new Map(products.map((p) => [p.slug, p]));

  /* Full catalog, season-appropriate items first, new arrivals leading each
     group. CategoryFilter shows 8 at a time with Load More. */
  const seasonSorted = sortBySeason(products);
  const featuredProducts = [
    ...seasonSorted.filter((p) => p.isNew),
    ...seasonSorted.filter((p) => !p.isNew),
  ];
  const heroProduct = featuredProducts[0];

  return (
    <>
      {/* ── Hero — Nordic split: sober copy left, tinted visual right ── */}
      <section className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2">
            {/* Copy */}
            <div className="py-10 md:py-20 md:pr-14 flex flex-col justify-center items-start">
              <p className="text-[11px] font-semibold text-accent uppercase tracking-[0.14em] mb-4">
                {t("home.hero.badge")}
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold text-ink leading-[1.06] tracking-tight text-balance">
                {t("home.hero.titleA")} {t("home.hero.titleB")}
              </h1>
              <p className="text-[15px] text-ink-soft mt-4 mb-8 max-w-[46ch] leading-relaxed">
                {t("home.hero.subtitle")}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center u-btn h-12 px-7 bg-ink text-white text-[12px] font-semibold uppercase tracking-[0.1em] rounded-control hover:bg-accent"
                >
                  {t("home.hero.shopCta")}
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center u-btn u-btn-ghost h-12 px-6 border border-ink text-ink text-[12px] font-semibold uppercase tracking-[0.1em] rounded-control hover:bg-ink hover:text-white"
                >
                  {t("home.hero.ourStory")}
                </Link>
              </div>
            </div>

            {/* Visual — flat tinted well with the lead product */}
            <div className="relative hidden md:flex items-center justify-center border-l border-line min-h-[380px]"
              style={{ background: "linear-gradient(150deg, var(--color-accent-soft), var(--color-panel))" }}>
              {heroProduct?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroProduct.imageUrl} alt={heroProduct.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <span className="text-[110px] select-none">{heroProduct?.emoji ?? "🧸"}</span>
              )}
              {heroProduct && (
                <Link
                  href={`/products/${heroProduct.slug}`}
                  className="absolute bottom-5 left-5 bg-canvas border border-line px-4 py-2.5 rounded-control hover:border-ink transition-colors"
                >
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-muted font-semibold">
                    {t("home.featured.title")}
                  </span>
                  <span className="block text-[13px] font-bold text-ink mt-0.5">
                    {heroProduct.name} — {formatPrice(heroProduct.price)}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust row — information-dense strip, Nordic ── */}
      <section className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "✓", head: `100% ${t("home.hero.statOrganic")}` , sub: t("home.hero.badge") },
              { icon: "⇄", head: `${t("home.hero.statReturnsValue")} ${t("home.hero.statReturns")}`, sub: t("topbar.returns") },
              { icon: "◷", head: t("topbar.delivery").replace("{min}", String(settings.deliveryMinDays)).replace("{max}", String(settings.deliveryMaxDays)), sub: "" },
              { icon: "₾", head: t("checkout.paymentOnDelivery"), sub: t("topbar.shipping").replace("{n}", String(settings.freeShippingThreshold)) },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 py-4 pr-4 ${i > 0 ? "lg:border-l lg:border-line lg:pl-5" : ""} ${i % 2 === 1 ? "border-l border-line pl-4 lg:pl-5" : ""} ${i > 1 ? "border-t border-line lg:border-t-0" : ""}`}>
                <span className="w-9 h-9 flex-shrink-0 rounded-control bg-accent-soft text-accent-deep flex items-center justify-center text-[15px] font-bold" aria-hidden>
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-ink leading-tight">{item.head}</span>
                  {item.sub && <span className="block text-[11px] text-ink-muted mt-0.5 truncate">{item.sub}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Shop by Category — flat tinted tiles ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-2xl font-bold text-ink tracking-tight">{t("home.category.title")}</h2>
          <span className="hidden sm:block text-ink-muted text-xs">{t("home.category.subtitle")}</span>
        </div>
        <Reveal className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-line border border-line">
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
              className="flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 py-4 sm:py-6 transition-colors cursor-pointer group bg-canvas hover:bg-panel"
            >
              <span
                className="w-11 h-11 sm:w-14 sm:h-14 rounded-control flex items-center justify-center text-xl sm:text-3xl group-hover:scale-105 transition-transform duration-200"
                style={{ backgroundColor: item.bg + "66" }}
              >
                {item.emoji}
              </span>
              <span className="text-[9.5px] sm:text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft group-hover:text-ink text-center leading-tight transition-colors">
                {item.label}
              </span>
            </Link>
          ))}
        </Reveal>
      </section>

      {/* ── Picked for your baby (client-side, renders only for signed-in parents with a saved birthdate) ── */}
      <BabyPicksSection />

      {/* ── Featured Products ── */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {t("home.featured.title")}
              <span className="text-ink-muted font-normal text-[0.55em] align-middle ml-3">{products.length} · {t("home.featured.subtitle")}</span>
            </h2>
          </div>
          <Link
            href="/products"
            className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink border-b border-ink pb-0.5 hover:text-accent hover:border-accent transition-colors"
          >
            {t("home.featured.viewAll")}
          </Link>
        </div>
        <Reveal>
          <CategoryFilter products={featuredProducts} />
        </Reveal>
      </section>

      {/* ── Bundle Deals — ledger rows, Nordic ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold text-accent uppercase tracking-[0.14em] mb-1">{t("home.bundles.eyebrow")}</p>
            <h2 className="text-2xl font-bold text-ink tracking-tight">{t("home.bundles.title")}</h2>
          </div>
          <Link
            href="/bundles"
            className="hidden sm:inline text-[12px] font-semibold uppercase tracking-[0.1em] text-ink border-b border-ink pb-0.5 hover:text-accent hover:border-accent transition-colors"
          >
            {t("home.bundles.viewAll")}
          </Link>
        </div>
        <Reveal className="border border-line rounded-card overflow-hidden divide-y divide-line">
          {bundles.slice(0, 4).map((bundle) => {
            const savings = bundle.originalPrice - bundle.bundlePrice;
            return (
              <Link
                key={bundle.slug}
                href={`/bundles/${bundle.slug}`}
                className="group relative grid grid-cols-[56px_1fr_auto] sm:grid-cols-[64px_1.6fr_auto_auto] items-center gap-3 sm:gap-6 px-3 sm:px-5 py-3.5 bg-canvas hover:bg-accent-soft/60 transition-colors"
              >
                <span
                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-control flex items-center justify-center text-2xl sm:text-3xl overflow-hidden"
                  style={{ backgroundColor: bundle.cardColor }}
                >
                  {bundle.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bundle.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    bundle.emoji
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] sm:text-[15px] font-bold text-ink leading-snug line-clamp-1 group-hover:underline underline-offset-4">
                    {bundle.name}
                  </span>
                  <span className="sm:hidden block text-[11px] font-semibold text-accent-deep mt-1">
                    {t("home.bundles.save").replace("{amount}", formatPrice(savings))}
                  </span>
                </span>
                <span className="hidden sm:inline-block text-[10.5px] font-bold uppercase tracking-[0.1em] text-accent-deep bg-accent-soft px-3 py-1.5 rounded-control whitespace-nowrap">
                  {t("home.bundles.save").replace("{amount}", formatPrice(savings))}
                </span>
                <span className="text-right">
                  <span className="block text-[11px] text-ink-muted line-through tabular-nums">{formatPrice(bundle.originalPrice)}</span>
                  <span className="block text-[16px] font-bold text-ink tabular-nums">{formatPrice(bundle.bundlePrice)}</span>
                </span>
                <BundleQuickView
                  bundle={bundle}
                  itemProducts={bundle.items.map((config) => ({
                    config,
                    product: productBySlug.get(config.slug) ?? null,
                  }))}
                />
              </Link>
            );
          })}
        </Reveal>
        <div className="mt-4 text-center sm:hidden">
          <Link href="/bundles" className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink border-b border-ink pb-0.5">
            {t("home.bundles.viewAll")}
          </Link>
        </div>
      </section>

      {/* ── Recently Viewed (client-side, renders only if history exists) ── */}
      <RecentlyViewedSection />

      {/* ── What Parents Say — REAL published reviews only (fabricated
             testimonials removed 12 Jul 2026). Hidden until reviews exist. ── */}
      {homeReviews.featured.length > 0 && (
        <section className="border-t border-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
            <div className="mb-8">
              <p className="text-[11px] font-semibold text-accent uppercase tracking-[0.14em] mb-1">{t("home.reviews.eyebrow")}</p>
              <h2 className="text-2xl font-bold text-ink tracking-tight">{t("home.reviews.title")}</h2>
            </div>

            <div className="grid md:grid-cols-[auto_1fr] gap-8 md:gap-14 items-start">
              {/* Score block — computed from real review data */}
              <div className="border border-line rounded-card px-8 py-6 text-center md:min-w-[180px]">
                <p className="text-5xl font-extrabold text-ink tracking-tight tabular-nums">{homeReviews.average.toFixed(1)}</p>
                <div className="flex items-center justify-center gap-0.5 my-2" aria-hidden>
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(homeReviews.average) ? "fill-accent" : "fill-line"}`} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[10.5px] uppercase tracking-[0.12em] text-ink-muted font-semibold">
                  {homeReviews.count} {t("home.reviews.statReviews")}
                </p>
              </div>

              {/* Review quotes */}
              <Reveal className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                {homeReviews.featured.map((r, i) => {
                  const name = r.authorName || t("rev.anon");
                  return (
                    <div key={`${r.createdAt}-${i}`} className="border-t-2 border-ink pt-4">
                      <div className="flex items-center gap-0.5 mb-3" aria-label={`${r.rating}/5`}>
                        {[1,2,3,4,5].map((s) => (
                          <svg key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-accent" : "fill-line"}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-[14px] text-ink leading-relaxed mb-4">&ldquo;{r.body}&rdquo;</p>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted font-semibold">
                        <span className="text-ink">{name}</span> · {fmtDate(r.createdAt, locale, "short")} · {t("home.reviews.verified")}
                      </p>
                    </div>
                  );
                })}
              </Reveal>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
