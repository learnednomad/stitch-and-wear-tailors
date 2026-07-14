import type { Metadata } from "next";
import { OrderSuccessClient } from "@/components/storefront/commerce/OrderSuccessClient";

export const metadata: Metadata = {
  title: "Order Received",
  description: "Your Stitch & Wear order has been recorded.",
};

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orders?: string | string[] }>;
}) {
  const values = await searchParams;
  const raw = Array.isArray(values.orders) ? values.orders.join(",") : values.orders ?? "";
  const orderNumbers = raw.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 20);
  return <OrderSuccessClient orderNumbers={orderNumbers} />;
}

