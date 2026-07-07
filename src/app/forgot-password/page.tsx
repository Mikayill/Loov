import type { Metadata } from "next";
import ForgotPasswordClient from "./ForgotPasswordClient";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.forgotPassword.title") };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
