"use client";

import Link from "next/link";
import { CommerceImage } from "@/components/storefront/commerce/CommerceImage";
import {
  CommerceEmpty,
  CommercePage,
  outlineButtonClass,
} from "@/components/storefront/commerce/commerce-ui";
import { useStorefrontCommerce } from "@/components/storefront/commerce/StorefrontProviders";
import { formatNaira } from "@/lib/format";

export function WishlistPageClient() {
  const { wishlist, hydrated, removeFromWishlist } = useStorefrontCommerce();

  return (
    <CommercePage
      eyebrow="Saved pieces"
      title="Your Wishlist"
      description="Keep a considered edit of the pieces you want to return to."
    >
      {!hydrated ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="aspect-[4/5] animate-pulse bg-white/[0.04]" />
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <CommerceEmpty
          title="No saved pieces yet"
          description="Use the heart on any product to build a personal edit for later."
          href="/marketplace"
          action="Discover the collection"
        />
      ) : (
        <section aria-label="Saved products" className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {wishlist.map((item) => (
            <article key={`${item.productId}:${item.variantId ?? ""}`} className="group">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#151714]">
                <Link href={`/products/${item.productId}`}>
                  <CommerceImage
                    src={item.image}
                    alt={item.name}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </Link>
                <button
                  type="button"
                  aria-label={`Remove ${item.name} from wishlist`}
                  onClick={() => removeFromWishlist(item.productId, item.variantId)}
                  className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-white/20 bg-black/55 text-lg text-[#e3c58f] backdrop-blur hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-[#d4aa68]"
                >
                  ♥
                </button>
              </div>
              <p className="mt-4 text-[0.62rem] uppercase tracking-[0.2em] text-[#8f887c]">
                {item.category?.replaceAll("_", " ") || "Stitch & Wear"}
              </p>
              <h2 className="mt-1 font-display text-lg">
                <Link href={`/products/${item.productId}`} className="hover:text-[#d4aa68]">
                  {item.name}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-[#d4aa68]">
                {formatNaira(item.price, item.currency)}
              </p>
              <Link href={`/products/${item.productId}`} className={`${outlineButtonClass} mt-4 w-full`}>
                View piece
              </Link>
            </article>
          ))}
        </section>
      )}
    </CommercePage>
  );
}

