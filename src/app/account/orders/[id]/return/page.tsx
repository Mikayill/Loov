import type { Metadata } from "next";
import ReturnRequestClient from "./ReturnRequestClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Return — Order ${id} — Loov` };
}

export default async function ReturnRequestPage({ params }: Props) {
  const { id } = await params;
  return <ReturnRequestClient orderNumber={id} />;
}
