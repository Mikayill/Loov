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
import HeroShowcase from "@/components/HeroShowcase";
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

  /* Hero showcase — admin-picked slugs in order (Settings → Hero showcase);
     empty setting falls back to the lead featured product. */
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const heroProducts = (settings.heroSlugs || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((slug) => bySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => !!p);
  if (heroProducts.length === 0 && featuredProducts[0]) heroProducts.push(featuredProducts[0]);

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
                  className="inline-flex items-center justify-center u-btn h-12 px-7 bg-ink text-white text-[12px] font-semibold uppercase tracking-[0.1em] rounded-control hover:bg-ink/85"
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

            {/* Visual — admin-curated showcase (auto-slides when several products are picked) */}
            <HeroShowcase products={heroProducts} />
          </div>
        </div>
      </section>

      {/* ── Trust row — information-dense strip, Nordic (md+ only) ── */}
      <section className="hidden md:block border-b border-line">
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

      {/* ── Shop by Category — desktop: hairline tiles · mobile: one compact scroll row ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-10">
        <div className="flex items-baseline justify-between gap-3 mb-2.5 sm:mb-4">
          <h2 className="text-[15px] sm:text-2xl font-bold text-ink tracking-tight">{t("home.category.title")}</h2>
          <span className="hidden sm:block text-ink-muted text-xs">{t("home.category.subtitle")}</span>
        </div>
        {(() => {
          const cats = [
            { cat: "body",    emoji: "👶", label: t("category.body"),    bg: "#C8DDD8", href: "/products?cat=body" },
            { cat: "blanket", emoji: "☁️", label: t("category.blanket"), bg: "#C4D4E4", href: "/products?cat=blanket" },
            { cat: "set",     emoji: "🎀", label: t("category.set"),     bg: "#D0E0CC", href: "/products?cat=set" },
            { cat: "towel",   emoji: "🛁", label: t("category.towel"),   bg: "#E4D8C4", href: "/products?cat=towel" },
            { cat: "romper",  emoji: "🐻", label: t("category.romper"),  bg: "#D4CAE4", href: "/products?cat=romper" },
            { cat: "bag",     emoji: "🐰", label: t("category.bag"),     bg: "#EED4BC", href: "/products?cat=bag" },
          ];
          return (
            <>
              {/* Mobile: single horizontally-scrollable chip row */}
              <div className="sm:hidden flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                {cats.map((item) => (
                  <Link
                    key={item.cat}
                    href={item.href}
                    className="flex-shrink-0 flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-control border border-line bg-canvas active:scale-95 transition-transform"
                  >
                    <span
                      className="w-7 h-7 rounded-control flex items-center justify-center text-sm"
                      style={{ backgroundColor: item.bg + "66" }}
                    >
                      {item.emoji}
                    </span>
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-soft whitespace-nowrap">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
              {/* Desktop: hairline tile grid */}
              <Reveal className="hidden sm:grid grid-cols-6 gap-px bg-line border border-line">
                {cats.map((item) => (
                  <Link
                    key={item.cat}
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-2.5 py-6 transition-colors cursor-pointer group bg-canvas hover:bg-panel"
                  >
                    <span
                      className="w-14 h-14 rounded-control flex items-center justify-center text-3xl group-hover:scale-105 transition-transform duration-200"
                      style={{ backgroundColor: item.bg + "66" }}
                    >
                      {item.emoji}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft group-hover:text-ink text-center leading-tight transition-colors">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </Reveal>
            </>
          );
        })()}
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
        <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {bundles.slice(0, 4).map((bundle) => {
            const savings = bundle.originalPrice - bundle.bundlePrice;
            const off = bundle.originalPrice > 0 ? Math.round((savings / bundle.originalPrice) * 100) : 0;
            const itemProducts = bundle.items.map((config) => ({ config, product: productBySlug.get(config.slug) ?? null }));
            const pieceCount = bundle.items.reduce((n, it) => n + (it.quantity ?? 1), 0);
            return (
              <Link
                key={bundle.slug}
                href={`/bundles/${bundle.slug}`}
                className="group relative flex flex-col rounded-card border border-line overflow-hidden bg-canvas hover:border-ink transition-colors"
              >
                {/* Visual — bundle photo, or a collage of the items inside it */}
                <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: bundle.cardColor }}>
                  {bundle.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bundle.imageUrl} alt={bundle.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px p-px">
                      {itemProducts.slice(0, 4).map(({ config, product }, i) => (
                        <span
                          key={config.slug + i}
                          className="flex items-center justify-center text-2xl sm:text-3xl overflow-hidden"
                          style={{ backgroundColor: product?.cardColor ?? bundle.cardColor }}
                        >
                          {product?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            product?.emoji ?? bundle.emoji
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {off > 0 && (
                    <span className="absolute top-2.5 right-2.5 bg-ink text-white text-[11px] font-extrabold px-2 py-1 rounded-control tabular-nums">
                      −{off}%
                    </span>
                  )}
                  <BundleQuickView bundle={bundle} itemProducts={itemProducts} />
                </div>
                {/* Info */}
                <div className="p-3 sm:p-3.5 flex flex-col gap-1.5">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {t("home.bundles.pieces").replace("{n}", String(pieceCount))}
                  </span>
                  <span className="text-[13.5px] font-bold text-ink leading-snug line-clamp-2 group-hover:underline underline-offset-4">
                    {bundle.name}
                  </span>
                  <div className="flex items-end justify-between gap-2 mt-0.5">
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-[16px] font-bold text-ink tabular-nums">{formatPrice(bundle.bundlePrice)}</span>
                      <span className="text-[11px] text-ink-muted line-through tabular-nums">{formatPrice(bundle.originalPrice)}</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-accent-deep bg-accent-soft px-2 py-1 rounded-control whitespace-nowrap">
                      {t("home.bundles.save").replace("{amount}", formatPrice(savings))}
                    </span>
                  </div>
                </div>
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
                    <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(homeReviews.average) ? "fill-star" : "fill-line"}`} viewBox="0 0 20 20">
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
                          <svg key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-star" : "fill-line"}`} viewBox="0 0 20 20">
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
