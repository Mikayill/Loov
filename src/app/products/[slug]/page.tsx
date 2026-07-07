import { getProductBySlug, getAllProducts } from "@/lib/db/products";
import { getReviewStats } from "@/lib/db/reviews";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ProductDetailClient from "./ProductDetailClient";
import ProductCard from "@/components/ProductCard";
import ReviewsSection from "@/components/ReviewsSection";

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

  const [products, reviewStats] = await Promise.all([
    getAllProducts(),
    getReviewStats(product.id),
  ]);
  const sameCategory = products.filter(
    (p) => p.id !== product.id && p.category === product.category
  );
  const otherProducts = products.filter(
    (p) => p.id !== product.id && p.category !== product.category
  );
  const related = [...sameCategory, ...otherProducts].slice(0, 3);

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
      price: product.price,
      availability:
        (product.stock ?? 1) > 0
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
      <nav className="mb-8 flex items-center gap-2 text-sm text-[#9A8E88]">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors font-medium">
          Home
        </Link>
        <span>›</span>
        <Link href="/products" className="hover:text-[#5E9E8C] transition-colors font-medium">
          Products
        </Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold">{product.name}</span>
      </nav>

      {/* Main product section */}
      <ProductDetailClient product={product} reviewStats={reviewStats} />

      {/* Customer reviews */}
      <ReviewsSection productId={product.id} />

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-20 pt-12 border-t border-[#DDD5CC]">
          <h2 className="text-2xl font-extrabold text-[#2A2320] mb-8">
            You Might Also Like
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
