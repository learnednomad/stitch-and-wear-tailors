"use client";

import Link from "next/link";
import { CommerceImage } from "@/components/storefront/commerce/CommerceImage";
import {
  CommerceEmpty,
  CommercePage,
  goldButtonClass,
  outlineButtonClass,
} from "@/components/storefront/commerce/commerce-ui";
import { useStorefrontCommerce } from "@/components/storefront/commerce/StorefrontProviders";
import { formatNaira } from "@/lib/format";

function QuantityControl({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="inline-flex h-10 items-stretch border border-white/15" aria-label="Quantity">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label="Decrease quantity"
        className="w-10 text-lg text-[#d4aa68] transition hover:bg-white/5 focus-visible:outline focus-visible:outline-[#d4aa68]"
      >
        −
      </button>
      <span className="grid min-w-10 place-items-center border-x border-white/15 text-sm">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="w-10 text-lg text-[#d4aa68] transition hover:bg-white/5 focus-visible:outline focus-visible:outline-[#d4aa68] disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

export function CartPageClient() {
  const {
    cart,
    hydrated,
    subtotal,
    setCartQuantity,
    removeFromCart,
    isWishlisted,
    toggleWishlist,
  } = useStorefrontCommerce();

  return (
    <CommercePage
      eyebrow="Your selection"
      title="Shopping Bag"
      description="Review your pieces before completing delivery and offline payment details."
    >
      {!hydrated ? (
        <div className="h-64 animate-pulse border border-white/10 bg-white/[0.03]" />
      ) : cart.length === 0 ? (
        <CommerceEmpty
          title="Your bag is waiting"
          description="Explore ready-to-wear pieces and add something crafted for you."
          href="/marketplace"
          action="Explore marketplace"
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section aria-label="Cart items" className="divide-y divide-white/10 border-y border-white/10">
            {cart.map((line) => (
              <article key={line.key} className="grid grid-cols-[6.5rem_1fr] gap-4 py-5 sm:grid-cols-[8.5rem_1fr] sm:gap-6">
                <Link
                  href={`/products/${line.productId}`}
                  className="relative aspect-[4/5] overflow-hidden bg-[#161815]"
                >
                  <CommerceImage
                    src={line.image}
                    alt={line.name}
                    sizes="(max-width: 640px) 104px, 136px"
                  />
                </Link>
                <div className="flex min-w-0 flex-col sm:flex-row sm:justify-between sm:gap-6">
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#948b7d]">
                      Ready to wear
                    </p>
                    <h2 className="mt-1 font-display text-lg text-[#f6f0e6]">
                      <Link href={`/products/${line.productId}`} className="hover:text-[#d4aa68]">
                        {line.name}
                      </Link>
                    </h2>
                    {line.variantLabel || line.size || line.color ? (
                      <p className="mt-2 text-xs text-[#aaa397]">
                        {[line.variantLabel, line.size, line.color].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm text-[#d4aa68]">
                      {formatNaira(line.price, line.currency)}
                    </p>
                    {line.stock <= 0 ? (
                      <p className="mt-2 text-xs text-red-300">This item is no longer available.</p>
                    ) : line.quantity >= line.stock ? (
                      <p className="mt-2 text-xs text-[#c9bdab]">Maximum available quantity selected.</p>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3 sm:mt-0 sm:flex-col sm:items-end">
                    <p className="font-medium text-[#f6f0e6]">
                      {formatNaira(line.price * line.quantity, line.currency)}
                    </p>
                    <QuantityControl
                      value={line.quantity}
                      max={line.stock}
                      onChange={(quantity) => setCartQuantity(line.key, quantity)}
                    />
                    <div className="flex gap-4 text-[0.68rem] uppercase tracking-[0.12em]">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isWishlisted(line.productId, line.variantId)) {
                            toggleWishlist({
                              productId: line.productId,
                              name: line.name,
                              price: line.price,
                              currency: line.currency,
                              image: line.image,
                              variantId: line.variantId,
                            });
                          }
                          removeFromCart(line.key);
                        }}
                        className="text-[#bcae9b] underline-offset-4 hover:text-[#d4aa68] hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(line.key)}
                        className="text-[#bcae9b] underline-offset-4 hover:text-red-300 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="border border-[#8f6d39]/40 bg-[#111310] p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-xl">Order summary</h2>
            <dl className="mt-6 space-y-4 border-b border-white/10 pb-5 text-sm">
              <div className="flex justify-between gap-4 text-[#aaa397]">
                <dt>Subtotal</dt>
                <dd className="text-[#eee6da]">{formatNaira(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-[#aaa397]">
                <dt>Delivery</dt>
                <dd className="text-[#eee6da]">Complimentary</dd>
              </div>
            </dl>
            <div className="flex items-baseline justify-between gap-4 py-5">
              <p className="font-display text-lg">Total</p>
              <p className="font-display text-xl text-[#d4aa68]">{formatNaira(subtotal)}</p>
            </div>
            <Link
              href="/checkout"
              aria-disabled={cart.some((line) => line.stock <= 0)}
              className={`${goldButtonClass} w-full ${
                cart.some((line) => line.stock <= 0) ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Proceed to checkout
            </Link>
            <Link href="/marketplace" className={`${outlineButtonClass} mt-3 w-full`}>
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </CommercePage>
  );
}
