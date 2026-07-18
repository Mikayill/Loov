import type { Metadata } from "next";
import { getAllProducts } from "@/lib/db/products";
import { getT } from "@/lib/i18n/server";
import { discountPercent } from "@/lib/pricing";
import DealsClient from "./DealsClient";

// Cache the DB catalog for 60s so pages load fast; admin edits show within a minute.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.deals.title"), description: t("meta.deals.description") };
}

export default async function DealsPage() {
  const products = await getAllProducts();
  /* Only products with a currently-running discount, biggest % first.
     discountPercent() already returns 0 once discountEndsAt has passed, so
     expired sales fall out here. */
  const discounted = products
    .filter((p) => discountPercent(p) > 0)
    .sort((a, b) => discountPercent(b) - discountPercent(a));

  const maxPct = discounted.reduce((m, p) => Math.max(m, discountPercent(p)), 0);

  /* Honest countdown: the soonest real discount end among the running sales
     (no fabricated timer). Null when no sale has an end date. */
  const now = Date.now();
  const soonestEnd =
    discounted
      .map((p) => p.discountEndsAt)
      .filter((e): e is string => !!e && new Date(e).getTime() > now)
      .sort()[0] ?? null;

  return <DealsClient products={discounted} soonestEnd={soonestEnd} maxPct={maxPct} />;
}
