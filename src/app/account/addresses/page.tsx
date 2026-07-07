import type { Metadata } from "next";
import AddressesClient from "./AddressesClient";

export const metadata: Metadata = {
  title: "Saved Addresses — Loov",
};

export default function AddressesPage() {
  return <AddressesClient />;
}
