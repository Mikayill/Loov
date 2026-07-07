import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";
import { getT } from "@/lib/i18n/server";
import { getAllBundles } from "@/lib/db/bundles";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.checkout.title") };
}

export default async function CheckoutPage() {
  const bundles = await getAllBundles();
  return <CheckoutClient bundles={bundles} />;
}
