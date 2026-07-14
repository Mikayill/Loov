import Link from "next/link";
import { getAllBundles } from "@/lib/db/bundles";
import { getAllProducts } from "@/lib/db/products";
import { formatPrice } from "@/lib/format";
import BundleQuickView from "@/components/BundleQuickView";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.bundles.title"), description: t("meta.bundles.description") };
}

// Cache the DB catalog for 60s so pages load fast; admin edits show within a minute.
export const revalidate = 60;

export default async function BundlesPage() {
  const { t } = await getT();
  const [bundles, products] = await Promise.all([getAllBundles(), getAllProducts()]);
  /* Product lookup so each card can show WHAT's inside (mini photo thumbs). */
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  /* Best discount across active bundles — drives the "Up to {n}% off" trust line. */
  const maxSavingsPct = bundles.reduce((max, b) => {
    const pct = b.originalPrice > 0 ? Math.round(((b.originalPrice - b.bundlePrice) / b.originalPrice) * 100) : 0;
    return Math.max(max, pct);
  }, 0);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-12">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <span className="inline-block text-[10px] font-bold text-accent uppercase tracking-widest bg-accent-soft px-3 py-1.5 rounded-full mb-2 sm:mb-3">
          {t("bundle.eyebrow")}
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-ink mb-2 sm:mb-3">
          {t("bundle.heroTitle")}
        </h1>
        <p className="text-ink-soft max-w-xl mx-auto text-[13px] sm:text-base leading-snug sm:leading-relaxed">
          {t("bundle.heroSubtitle")}
        </p>
      </div>

      {/* Trust strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-6 mb-6 sm:mb-10 text-[11px] sm:text-xs font-semibold text-ink-soft">
        {[
          { icon: "🎁", label: t("bundle.trustGiftReady") },
          { icon: "💰", label: t("bundle.trustSavings").replace("{n}", String(maxSavingsPct)) },
          { icon: "🌿", label: t("bundle.trustOrganic") },
          { icon: "🔄", label: t("bundle.trustReturns") },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Bundle grid — compact cards; contents visible without opening */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {bundles.map((bundle) => {
          const savings = bundle.originalPrice - bundle.bundlePrice;
          const savingsPct = bundle.originalPrice > 0 ? Math.round((savings / bundle.originalPrice) * 100) : 0;

          return (
            <Link
              key={bundle.slug}
              href={`/bundles/${bundle.slug}`}
              className="group block bg-canvas rounded-card border border-line overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Hero — fixed ratio so every card is the same size */}
              <div
                className="relative flex items-center justify-center overflow-hidden aspect-[4/3]"
                style={{ backgroundColor: bundle.cardColor }}
              >
                {bundle.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bundle.imageUrl} alt={bundle.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-300 block">
                    {bundle.emoji}
                  </span>
                )}
                {bundle.isNew && (
                  <span className="absolute top-2 left-2 bg-accent text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    {t("product.new")}
                  </span>
                )}
                {savings > 0 && (
                  <span className="absolute top-2 right-2 bg-ink text-white text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                    {t("bundle.save").replace("{amount}", formatPrice(savings))}
                  </span>
                )}
                <BundleQuickView
                  bundle={bundle}
                  itemProducts={bundle.items.map((config) => ({
                    config,
                    product: bySlug.get(config.slug) ?? null,
                  }))}
                />
              </div>

              {/* Info — compact */}
              <div className="p-2.5 sm:p-3">
                <h2 className="text-xs sm:text-sm font-extrabold text-ink leading-snug line-clamp-1 group-hover:text-accent transition-colors mb-1.5">
                  {bundle.name}
                </h2>

                {/* What's inside — mini product photo thumbs + one-line list */}
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="flex -space-x-1.5 flex-shrink-0">
                    {bundle.items.slice(0, 4).map((item, i) => {
                      const p = bySlug.get(item.slug);
                      return (
                        <span
                          key={`${item.slug}-${i}`}
                          title={`${item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ""}${item.label}`}
                          className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] overflow-hidden shadow-sm"
                          style={{ backgroundColor: p?.cardColor ?? "#F5F0EB" }}
                        >
                          {p?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={item.label} className="w-full h-full object-cover" />
                          ) : (p?.emoji ?? "🍼")}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-bold text-ink-muted whitespace-nowrap">
                    {(() => {
                      const n = bundle.items.reduce((s, it) => s + (it.quantity ?? 1), 0);
                      return n === 1 ? t("bundle.item1") : t("bundle.items").replace("{n}", String(n));
                    })()}
                  </span>
                </div>
                <p className="text-[10px] text-ink-muted leading-snug line-clamp-1 mb-2">
                  {bundle.items
                    .map((it) => `${it.quantity && it.quantity > 1 ? `${it.quantity}× ` : ""}${it.label}`)
                    .join(" · ")}
                </p>

                {/* Pricing */}
                <div className="flex items-baseline justify-between gap-1">
                  <span className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-sm sm:text-base font-extrabold text-ink">
                      {formatPrice(bundle.bundlePrice)}
                    </span>
                    {bundle.originalPrice > bundle.bundlePrice && (
                      <span className="text-[10px] text-ink-muted line-through">
                        {formatPrice(bundle.originalPrice)}
                      </span>
                    )}
                  </span>
                  {savingsPct > 0 && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded-full flex-shrink-0">
                      −{savingsPct}%
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-10 sm:mt-16 text-center">
        <p className="text-ink-muted text-sm mb-4">
          {t("bundle.lookingFor")}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 font-bold px-7 py-3 rounded-control border border-line text-ink-soft hover:border-accent hover:text-accent transition-all text-sm"
        >
          {t("bundle.browseAll")} →
        </Link>
      </div>
    </div>
  );
}
