import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryFilter from "@/components/CategoryFilter";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import { getAllProducts } from "@/lib/db/products";
import { getT } from "@/lib/i18n/server";
import { categoryPlural } from "@/lib/i18n/labels";
import type { Product } from "@/types";

// Cache the DB catalog for 60s so pages load fast; admin edits show within a minute.
export const revalidate = 60;

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const { t } = await getT();
  const products = await getAllProducts();
  const inCategory = products.filter((p) => p.category === category);
  if (inCategory.length === 0) return { title: t("meta.products.title") };
  const label = categoryPlural(category as Product["category"], t);
  return {
    title: t("meta.category.title").replace("{cat}", label),
    description: t("meta.category.description").replace("{cat}", label).replace("{n}", String(inCategory.length)),
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const { t } = await getT();
  const products = await getAllProducts();
  const inCategory = products.filter((p) => p.category === category);
  if (inCategory.length === 0) notFound();

  const newCount = inCategory.filter((p) => p.isNew).length;
  const label = categoryPlural(category as Product["category"], t);

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
          <Link href="/products" className="text-xs font-bold text-ink-muted uppercase tracking-widest hover:text-accent transition-colors">
            {t("shop.breadcrumb")}
          </Link>
          <span className="text-line">/</span>
          <span className="text-xs font-bold text-accent uppercase tracking-widest">
            {label}
          </span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-ink leading-tight">
              {label}
            </h1>
            <p className="text-ink-soft text-sm mt-1">
              {inCategory.length === 1 ? t("filter.product1") : t("filter.products").replace("{n}", String(inCategory.length))}
              {newCount > 0 && (
                <>
                  &nbsp;·&nbsp;{" "}
                  <span className="text-accent font-semibold">
                    {newCount === 1 ? t("shop.newArrival1") : t("shop.newArrivals").replace("{n}", String(newCount))}
                  </span>
                </>
              )}
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

      {/* Product grid with filters — pre-filtered to this category, but the
          pills still let a visitor pivot to another one without leaving. */}
      <div id="products-grid">
        <CategoryFilter products={products} initialCategory={category} advanced />
      </div>
    </div>

    <RecentlyViewedSection />
    </>
  );
}
