import type { Metadata } from "next";
import MyReviewsClient from "./MyReviewsClient";

export const metadata: Metadata = {
  title: "My Reviews — Loov",
  description: "Your product reviews — edit, delete, or write new ones.",
};

export default function MyReviewsPage() {
  return <MyReviewsClient />;
}
