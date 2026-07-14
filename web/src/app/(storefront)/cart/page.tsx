import type { Metadata } from "next";
import { CartPageClient } from "@/components/storefront/commerce/CartPageClient";

export const metadata: Metadata = {
  title: "Shopping Bag",
  description: "Review your Stitch & Wear selections before checkout.",
};

export default function CartPage() {
  return <CartPageClient />;
}

