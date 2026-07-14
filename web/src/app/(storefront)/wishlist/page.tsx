import type { Metadata } from "next";
import { WishlistPageClient } from "@/components/storefront/commerce/WishlistPageClient";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved Stitch & Wear pieces.",
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}

