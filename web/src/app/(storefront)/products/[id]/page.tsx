import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/storefront/commerce/ProductDetailClient";
import { JsonLd } from "@/components/storefront/JsonLd";
import { getProduct } from "@/lib/api/products";
import { fileUrl } from "@/lib/pb";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getProduct(id);
    return {
      title: product.name,
      description: product.description || `Shop ${product.name} from Stitch & Wear.`,
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  let product;
  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://stitchandwear.com";
  const image = product.images?.[0]
    ? fileUrl(product, product.images[0])
    : undefined;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          image: image ? [image] : undefined,
          sku: product.variants?.[0]?.sku || product.id,
          aggregateRating:
            product.reviewCount > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: product.rating,
                  reviewCount: product.reviewCount,
                }
              : undefined,
          offers: {
            "@type": "Offer",
            url: `${siteUrl}/products/${product.slug || product.id}`,
            priceCurrency: product.currency || "NGN",
            price: product.price,
            availability:
              product.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
