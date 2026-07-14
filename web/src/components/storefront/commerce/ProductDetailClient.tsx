"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CommerceImage } from "@/components/storefront/commerce/CommerceImage";
import {
  goldButtonClass,
  outlineButtonClass,
} from "@/components/storefront/commerce/commerce-ui";
import { useStorefrontCommerce } from "@/components/storefront/commerce/StorefrontProviders";
import { formatNaira } from "@/lib/format";
import { fileUrl } from "@/lib/pb";
import type { Product, ProductVariant } from "@/lib/types";

function imageUrl(product: Product, filename?: string) {
  if (!filename) return undefined;
  if (/^https?:\/\//.test(filename)) return filename;
  return fileUrl(product, filename, "1000x1250");
}

function variantDescription(variant: ProductVariant) {
  return variant.label || [variant.size, variant.color].filter(Boolean).join(" · ");
}

export function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const { addToCart, isWishlisted, toggleWishlist } = useStorefrontCommerce();
  const variants = product.variants ?? [];
  const initialVariant = variants.find((variant) => variant.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(initialVariant?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  const variant = variants.find((item) => item.id === variantId);
  const price = variant?.price ?? product.price;
  const compareAtPrice = variant?.compareAtPrice ?? product.compareAtPrice;
  const stock = variant ? variant.stock : product.stock;
  const gallery = [...(product.images ?? [])];
  if (variant?.image && !gallery.includes(variant.image)) gallery.unshift(variant.image);
  const selectedImage = imageUrl(product, gallery[activeImage] ?? gallery[0]);
  const saved = isWishlisted(product.id, variantId || undefined);
  const variantRequired = variants.length > 0;
  const unavailable = !product.isActive || stock <= 0 || (variantRequired && !variant);

  function snapshot() {
    return {
      productId: product.id,
      sellerId: product.seller,
      name: product.name,
      price,
      currency: product.currency || "NGN",
      image: selectedImage,
      stock,
      variantId: variant?.id,
      variantLabel: variant ? variantDescription(variant) : undefined,
      size: variant?.size,
      color: variant?.color,
    };
  }

  function add(andCheckout = false) {
    if (unavailable) return;
    addToCart(snapshot(), quantity);
    setAdded(true);
    if (andCheckout) router.push("/cart");
  }

  return (
    <div className="min-h-[75vh] bg-[#090b09] text-[#f4eee4]">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.16em] text-[#8e877c]">
          <Link href="/marketplace" className="hover:text-[#d4aa68]">Marketplace</Link>
          <span aria-hidden="true">/</span>
          <span className="capitalize">{product.category.replaceAll("_", " ")}</span>
          <span aria-hidden="true">/</span>
          <span className="text-[#c7baa7]">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:gap-12">
          <section aria-label="Product gallery" className="grid gap-3 sm:grid-cols-[5.5rem_1fr]">
            {gallery.length > 1 ? (
              <div className="order-2 flex gap-2 overflow-auto sm:order-1 sm:flex-col">
                {gallery.map((filename, index) => (
                  <button
                    type="button"
                    key={`${filename}-${index}`}
                    aria-label={`View image ${index + 1}`}
                    aria-pressed={activeImage === index}
                    onClick={() => setActiveImage(index)}
                    className={`relative aspect-[4/5] w-20 shrink-0 overflow-hidden border bg-[#171916] sm:w-full ${
                      activeImage === index ? "border-[#b8873e]" : "border-white/10"
                    }`}
                  >
                    <CommerceImage src={imageUrl(product, filename)} alt="" sizes="88px" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="relative order-1 aspect-[4/5] overflow-hidden bg-[#151714] sm:order-2">
              <CommerceImage
                src={selectedImage}
                alt={product.name}
                sizes="(max-width: 1024px) 100vw, 55vw"
                priority
              />
              {compareAtPrice && compareAtPrice > price ? (
                <span className="absolute left-4 top-4 bg-[#b8873e] px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-black">
                  Limited price
                </span>
              ) : null}
            </div>
          </section>

          <section className="lg:sticky lg:top-24 lg:h-fit">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.23em] text-[#b8873e]">
              {product.category.replaceAll("_", " ")}
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{product.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="font-display text-2xl text-[#d4aa68]">{formatNaira(price, product.currency)}</p>
              {compareAtPrice && compareAtPrice > price ? (
                <p className="text-sm text-[#817a70] line-through">{formatNaira(compareAtPrice, product.currency)}</p>
              ) : null}
            </div>
            {product.reviewCount > 0 ? (
              <p className="mt-3 text-xs text-[#a79f92]">
                <span className="tracking-[0.1em] text-[#d4aa68]" aria-label={`${product.rating.toFixed(1)} out of 5 stars`}>
                  {"★".repeat(Math.round(product.rating))}{"☆".repeat(5 - Math.round(product.rating))}
                </span>{" "}
                ({product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"})
              </p>
            ) : null}
            <p className="mt-6 border-y border-white/10 py-5 text-sm leading-7 text-[#b7afa3]">
              {product.description || "A considered Nigerian piece, finished by an independent Stitch & Wear atelier."}
            </p>

            {variants.length > 0 ? (
              <fieldset className="mt-6">
                <legend className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#c9bdab]">
                  Choose an option
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {variants.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      disabled={item.stock <= 0}
                      aria-pressed={variantId === item.id}
                      onClick={() => {
                        setVariantId(item.id);
                        setQuantity(1);
                        setActiveImage(0);
                      }}
                      className={`min-h-12 border px-3 py-2 text-xs transition focus-visible:outline-2 focus-visible:outline-[#d4aa68] disabled:cursor-not-allowed disabled:opacity-35 ${
                        variantId === item.id
                          ? "border-[#b8873e] bg-[#b8873e]/10 text-[#f2ddba]"
                          : "border-white/15 text-[#aba397] hover:border-white/30"
                      }`}
                    >
                      {variantDescription(item)}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="mt-6 flex items-end gap-4">
              <label>
                <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#c9bdab]">Quantity</span>
                <select
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  disabled={stock <= 0}
                  className="h-12 min-w-24 border border-white/15 bg-[#101210] px-4 text-sm outline-none focus:border-[#b8873e]"
                >
                  {Array.from({ length: Math.min(Math.max(stock, 1), 10) }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <p className="pb-3 text-xs text-[#918a80]">
                {stock <= 0 ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : "Ready to dispatch"}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <button type="button" disabled={unavailable} onClick={() => add(false)} className={goldButtonClass}>
                {added ? "Added to bag" : unavailable ? "Unavailable" : "Add to bag"}
              </button>
              <button
                type="button"
                aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={saved}
                onClick={() =>
                  toggleWishlist({
                    productId: product.id,
                    name: product.name,
                    price,
                    currency: product.currency || "NGN",
                    image: selectedImage,
                    category: product.category,
                    variantId: variant?.id,
                  })
                }
                className={`${outlineButtonClass} min-w-14 px-4 text-lg`}
              >
                {saved ? "♥" : "♡"}
              </button>
              <button type="button" disabled={unavailable} onClick={() => add(true)} className={`${outlineButtonClass} sm:col-span-2`}>
                Buy now
              </button>
            </div>

            <ul className="mt-7 grid gap-3 border-t border-white/10 pt-6 text-xs leading-5 text-[#9e978c] sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <li><strong className="block text-[#d0c3af]">Complimentary delivery</strong>Across Nigeria</li>
              <li><strong className="block text-[#d0c3af]">Secure order record</strong>Track it in your account</li>
              <li><strong className="block text-[#d0c3af]">Atelier support</strong>Help before and after purchase</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
