import type { Metadata } from "next";
import OrdersClient from "./OrdersClient";

export const metadata: Metadata = {
  title: "My Orders — Loov",
  description: "View your order history and track your Loov purchases.",
};

export default function OrdersPage() {
  return <OrdersClient />;
}
