import type { Metadata } from "next";
import LoginClient from "./LoginClient";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.login.title") };
}

export default function LoginPage() {
  return <LoginClient />;
}
