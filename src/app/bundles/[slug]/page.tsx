import { notFound } from "next/navigation";
import { getBundleBySlug } from "@/lib/db/bundles";
import { getAllProducts } from "@/lib/db/products";
import type { Metadata } from "next";
import BundleDetailClient from "./BundleDetailClient";

// Cache the DB catalog for 60s so pages load fast; admin edits show within a minute.
export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) return {};
  return {
    title: `${bundle.name} | Loov Bundles`,
    description: bundle.description,
  };
}

export default async function BundleDetailPage({ params }: Props) {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) notFound();

  const products = await getAllProducts();
  const bundleProducts = bundle.items.map((item) => ({
    config: item,
    product: products.find((p) => p.slug === item.slug) ?? null,
  })).filter((x) => x.product !== null) as {
    config: typeof bundle.items[number];
    product: NonNullable<ReturnType<typeof products.find>>;
  }[];

  return <BundleDetailClient bundle={bundle} bundleProducts={bundleProducts} />;
}
