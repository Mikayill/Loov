import type { Metadata } from "next";
import RewardsClient from "./RewardsClient";

export const metadata: Metadata = {
  title: "Loov Rewards — Loov",
  description:
    "Earn points on every order and turn them into discounts. Bronze, Silver and Gold tiers with growing perks.",
};

export default function RewardsPage() {
  return <RewardsClient />;
}
