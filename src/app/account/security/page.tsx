import type { Metadata } from "next";
import SecurityClient from "./SecurityClient";

export const metadata: Metadata = {
  title: "Security — Loov",
};

export default function SecurityPage() {
  return <SecurityClient />;
}
