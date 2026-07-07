import type { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.resetPassword.title") };
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
