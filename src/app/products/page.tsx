import type { Metadata } from "next";
import CategoryFilter from "@/components/CategoryFilter";
import { getAllProducts } from "@/lib/db/products";
import { getT } from "@/lib/i18n/server";

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-[#9A8E88] uppercase tracking-widest">
            Loov
          </span>
          <span className="text-[#DDD5CC]">/</span>
          <span className="text-xs font-bold text-[#5E9E8C] uppercase tracking-widest">
            {t("shop.breadcrumb")}
          </span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-[#2A2320] leading-tight">
              {t("shop.title")}
            </h1>
            <p className="text-[#5E5450] text-sm mt-1">
              {products.length === 1 ? t("filter.product1") : t("filter.products").replace("{n}", String(products.length))}
              &nbsp;·&nbsp;{" "}
              <span className="text-[#5E9E8C] font-semibold">
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
                className="flex items-center gap-1.5 bg-white border border-[#DDD5CC] rounded-full px-3 py-1.5 text-xs font-semibold text-[#5E5450]"
              >
                <span>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product grid with filters */}
      <CategoryFilter products={products} initialCategory={initialCategory} advanced />
    </div>
  );
}
