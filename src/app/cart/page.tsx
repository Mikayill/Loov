import type { Metadata } from "next";
import CartClient from "./CartClient";
import { getT } from "@/lib/i18n/server";
import { getAllBundles } from "@/lib/db/bundles";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.cart.title") };
}

export default async function CartPage() {
  const bundles = await getAllBundles();
  return <CartClient bundles={bundles} />;
}
