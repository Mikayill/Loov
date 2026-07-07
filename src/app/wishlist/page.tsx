import type { Metadata } from "next";
import WishlistClient from "./WishlistClient";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.wishlist.title") };
}

export default function WishlistPage() {
  return <WishlistClient />;
}
