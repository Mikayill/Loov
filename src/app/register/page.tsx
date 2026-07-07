import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.register.title") };
}

export default function RegisterPage() {
  return <RegisterClient />;
}
