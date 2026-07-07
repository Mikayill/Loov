import type { Metadata } from "next";
import TrackOrderClient from "./TrackOrderClient";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.trackOrder.title"), description: t("meta.trackOrder.description") };
}

export default function TrackOrderPage() {
  return <TrackOrderClient />;
}
