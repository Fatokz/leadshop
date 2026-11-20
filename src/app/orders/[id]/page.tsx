import type { Metadata } from "next";
import { OrderDetail } from "@/components/OrderDetail";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  return <OrderDetail id={id} sentVia={sp.sent === "whatsapp" ? "whatsapp" : undefined} />;
}
