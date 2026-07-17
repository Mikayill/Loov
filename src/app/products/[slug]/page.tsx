import { getProductBySlug, getAllProducts, getFrequentlyBoughtWith } from "@/lib/db/products";
import { getReviewStats } from "@/lib/db/reviews";
import { hasAnyStock } from "@/lib/stock";
import { minEffectivePrice } from "@/lib/pricing";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ProductDetailClient from "./ProductDetailClient";
import ProductCard from "@/components/ProductCard";
import ReviewsSection from "@/components/ReviewsSection";
import { getT } from "@/lib/i18n/server";

// Cache the DB catalog for 60s so pages load fast; admin edits show within a minute.
export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not Found — Loov" };
  return {
    title: `${product.name} — Loov`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [products, reviewStats, { t }] = await Promise.all([
    getAllProducts(),
    getReviewStats(product.id),
    getT(),
  ]);
  // Real co-purchase data first (what other shoppers actually bought
  // alongside this one), padded with same-category/other products when
  // there isn't enough order history yet — see getFrequentlyBoughtWith.
  const related = await getFrequentlyBoughtWith(product, products, 3);

  /* JSON-LD structured data — lets Google show price/stock in search results */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    brand: { "@type": "Brand", name: "Loov" },
    // Real review stats only — never fabricated numbers.
    ...(reviewStats.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: reviewStats.avg,
        reviewCount: reviewStats.count,
      },
    }),
    offers: {
      "@type": "Offer",
      url: `https://loov.ge/products/${product.slug}`,
      priceCurrency: "GEL",
      price: minEffectivePrice(product),
      availability: hasAnyStock(product)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 sm:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="mb-4 sm:mb-8 flex items-center gap-2 text-xs sm:text-sm text-ink-muted">
        <Link href="/" className="hover:text-accent transition-colors font-medium">
          {t("nav.home")}
        </Link>
        <span>›</span>
        <Link href="/products" className="hover:text-accent transition-colors font-medium">
          {t("nav.products")}
        </Link>
        <span>›</span>
        <span className="text-ink font-semibold">{product.name}</span>
      </nav>

      {/* Main product section */}
      <ProductDetailClient product={product} reviewStats={reviewStats} />

      {/* Customer reviews */}
      <ReviewsSection productId={product.id} />

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-20 pt-12 border-t border-line">
          <h2 className="text-2xl font-extrabold text-ink mb-8">
            {t("product.youMightLike")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
