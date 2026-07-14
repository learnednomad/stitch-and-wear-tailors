import type { Metadata } from "next";
import { DesignBuilder } from "@/components/storefront/commerce/DesignBuilder";

export const metadata: Metadata = {
  title: "Design Your Own",
  description: "Create a made-to-measure Nigerian garment in five guided steps.",
};

export default function DesignPage() {
  return <DesignBuilder />;
}

