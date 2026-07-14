import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StorefrontProviders } from "@/components/storefront/commerce/StorefrontProviders";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";

export const metadata: Metadata = {
  title: {
    default: "Bespoke Nigerian Fashion",
    template: "%s · Stitch & Wear",
  },
  description:
    "Discover made-to-measure Nigerian fashion, independent tailors and contemporary African craftsmanship.",
};

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <StorefrontProviders>
      <StorefrontShell>{children}</StorefrontShell>
    </StorefrontProviders>
  );
}
