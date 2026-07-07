import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = { title: "My Account — Loov" };

export default function AccountPage() {
  return <AccountClient />;
}
