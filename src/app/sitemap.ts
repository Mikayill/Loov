import { MetadataRoute } from "next";
import { getAllProductsStatic } from "@/lib/db/products";
import { getAllSlugs } from "@/lib/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://loov.ge";
  const products = await getAllProductsStatic();

  const staticRoutes = [
    { url: base, priority: 1.0 },
    { url: `${base}/products`, priority: 0.9 },
    { url: `${base}/deals`, priority: 0.8 },
    { url: `${base}/blog`, priority: 0.7 },
    { url: `${base}/about`, priority: 0.6 },
    { url: `${base}/contact`, priority: 0.6 },
  ].map((r) => ({ ...r, lastModified: new Date(), changeFrequency: "weekly" as const }));

  const productRoutes = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryRoutes = Array.from(new Set(products.map((p) => p.category))).map((cat) => ({
    url: `${base}/category/${cat}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const blogRoutes = getAllSlugs().map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];
}
