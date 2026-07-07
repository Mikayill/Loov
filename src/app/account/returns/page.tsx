import type { Metadata } from "next";
import ReturnsClient from "./ReturnsClient";

export const metadata: Metadata = {
  title: "My Returns — Loov",
  description: "Track your return requests and refunds.",
};

export default function MyReturnsPage() {
  return <ReturnsClient />;
}
