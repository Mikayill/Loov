import type { Metadata } from "next";
import FaqClient from "./FaqClient";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.faq.title"), description: t("meta.faq.description") };
}

export default function FaqPage() {
  return <FaqClient />;
}
