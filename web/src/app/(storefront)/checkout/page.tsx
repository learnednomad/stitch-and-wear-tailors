import type { Metadata } from "next";
import { CheckoutPageClient } from "@/components/storefront/commerce/CheckoutPageClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete delivery and offline payment details for your Stitch & Wear order.",
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}

