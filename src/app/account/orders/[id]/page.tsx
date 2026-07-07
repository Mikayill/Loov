import type { Metadata } from "next";
import OrderDetailClient from "./OrderDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id} — Loov` };
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  /* The client fetches the order itself — RLS guarantees users only ever
     see their own orders, so nothing sensitive is resolvable server-side
     without their session anyway. */
  return <OrderDetailClient orderNumber={id} />;
}
