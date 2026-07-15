import type { Metadata } from "next";
import Link from "next/link";
import CategoryFilter from "@/components/CategoryFilter";
import ProductCard from "@/components/ProductCard";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import { getAllProducts } from "@/lib/db/products";
import { getT } from "@/lib/i18n/server";
import { discountPercent } from "@/lib/pricing";

// Cache the DB catalog for 60s so pages load fast; admin edits show within a minute.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.products.title"), description: t("meta.products.description") };
}

interface Props {
  searchParams: Promise<{ cat?: string }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const { t } = await getT();
  const { cat } = await searchParams;
  const initialCategory = cat;
  const products = await getAllProducts();
  const newCount = products.filter((p) => p.isNew).length;
  /* Deal rail — highest discount first, capped so the page opens with a
     reason to scroll before the full filterable grid, not an empty header. */
  const onSale = [...products]
    .filter((p) => discountPercent(p) > 0)
    .sort((a, b) => discountPercent(b) - discountPercent(a))
    .slice(0, 10);

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-ink-muted uppercase tracking-widest">
            Loov
          </span>
          <span className="text-line">/</span>
          <span className="text-xs font-bold text-accent uppercase tracking-widest">
            {t("shop.breadcrumb")}
          </span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-ink leading-tight">
              {t("shop.title")}
            </h1>
            <p className="text-ink-soft text-sm mt-1">
              {products.length === 1 ? t("filter.product1") : t("filter.products").replace("{n}", String(products.length))}
              &nbsp;·&nbsp;{" "}
              <span className="text-accent font-semibold">
                {newCount === 1 ? t("shop.newArrival1") : t("shop.newArrivals").replace("{n}", String(newCount))}
              </span>
            </p>
          </div>

          {/* Trust badges — desktop */}
          <div className="hidden sm:flex items-center gap-4">
            {[
              { icon: "🌿", text: t("shop.badgeOrganic") },
              { icon: "🛡️", text: t("shop.badgeSafe") },
              { icon: "🚀", text: t("shop.badgeShip") },
            ].map((b) => (
              <div
                key={b.text}
                className="flex items-center gap-1.5 bg-canvas border border-line rounded-control px-3 py-1.5 text-xs font-semibold text-ink-soft"
              >
                <span>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* On sale — a reason to look before the full grid */}
      {onSale.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
              <span className="text-danger">−%</span> {t("shop.onSale")}
            </h2>
            <Link href="#products-grid" className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink border-b border-ink pb-0.5 hover:text-accent hover:border-accent transition-colors">
              {t("shop.seeAll")}
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 sm:mx-0 sm:px-0">
            {onSale.map((p) => (
              <div key={p.id} className="w-40 sm:w-48 flex-shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product grid with filters */}
      <div id="products-grid">
        <CategoryFilter products={products} initialCategory={initialCategory} advanced />
      </div>
    </div>

    {/* Recently viewed — its own panel (own max-width wrapper), only renders when history exists */}
    <RecentlyViewedSection />
    </>
  );
}
