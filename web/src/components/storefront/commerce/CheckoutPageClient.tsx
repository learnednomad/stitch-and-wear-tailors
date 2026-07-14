"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CommerceEmpty,
  CommercePage,
  FieldError,
  goldButtonClass,
  luxuryInputClass,
  luxuryLabelClass,
  outlineButtonClass,
} from "@/components/storefront/commerce/commerce-ui";
import { useStorefrontCommerce } from "@/components/storefront/commerce/StorefrontProviders";
import type { CheckoutDraft, OrderSuccessSnapshot } from "@/components/storefront/commerce/types";
import { createMarketplaceOrders } from "@/lib/api/products";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";

const CHECKOUT_DRAFT_KEY = "stitchwear.storefront.checkout-draft.v1";
export const ORDER_SUCCESS_KEY = "stitchwear.storefront.order-success.v1";

const EMPTY_DRAFT: CheckoutDraft = {
  contactName: "",
  contactPhone: "",
  shippingAddress: "",
  paymentMethod: "bank_transfer",
  paymentReference: "",
  notes: "",
};

const PAYMENT_METHODS: Array<{
  value: CheckoutDraft["paymentMethod"];
  label: string;
  description: string;
}> = [
  {
    value: "bank_transfer",
    label: "Bank transfer",
    description: "Your seller confirms the transfer before dispatch.",
  },
  {
    value: "cash",
    label: "Cash",
    description: "Arrange payment directly with the seller.",
  },
  {
    value: "pos",
    label: "POS",
    description: "Pay by card on an agreed terminal.",
  },
  {
    value: "other",
    label: "Other",
    description: "Agree another offline method with the seller.",
  },
];

export function CheckoutPageClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cart, hydrated, subtotal, clearCart } = useStorefrontCommerce();
  const [draft, setDraft] = useState<CheckoutDraft>(EMPTY_DRAFT);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CheckoutDraft, string>>>({});

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
        if (active && stored) {
          setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(stored) as CheckoutDraft) });
        }
      } catch {
        // Start from a clean form if local data was corrupted.
      } finally {
        if (active) setDraftHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDraft((current) => ({
        ...current,
        contactName:
          current.contactName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        contactPhone: current.contactPhone || user.phone || "",
      }));
    });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!draftHydrated) return;
    window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  }, [draft, draftHydrated]);

  const sellerCount = useMemo(
    () => new Set(cart.map((line) => line.sellerId)).size,
    [cart]
  );

  function update<K extends keyof CheckoutDraft>(key: K, value: CheckoutDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const next: typeof fieldErrors = {};
    if (!draft.contactName.trim()) next.contactName = "Enter the name for this delivery.";
    if (!draft.contactPhone.trim()) next.contactPhone = "Enter a phone number the seller can reach.";
    if (!draft.shippingAddress.trim()) next.shippingAddress = "Enter the complete delivery address.";
    if (draft.shippingAddress.trim().length > 500) next.shippingAddress = "Keep the address under 500 characters.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!validate() || cart.length === 0) return;
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent("/checkout")}`);
      return;
    }
    if (user.userType !== "client") {
      setError("Checkout is available from a customer account. Sign in as a customer to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const orders = await createMarketplaceOrders({
        items: cart.map((line) => ({
          productId: line.productId,
          sellerId: line.sellerId,
          name: line.name,
          price: line.price,
          quantity: line.quantity,
          image: line.image,
          currency: line.currency,
          variantId: line.variantId,
          variantLabel: line.variantLabel,
          size: line.size,
          color: line.color,
        })),
        contactName: draft.contactName.trim(),
        contactPhone: draft.contactPhone.trim(),
        shippingAddress: draft.shippingAddress.trim(),
        paymentMethod: draft.paymentMethod,
        paymentReference: draft.paymentReference.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      });
      const success: OrderSuccessSnapshot[] = orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        sellerId: order.seller,
        subtotal: order.subtotal,
        currency: order.currency,
      }));
      window.sessionStorage.setItem(ORDER_SUCCESS_KEY, JSON.stringify(success));
      window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
      clearCart();
      const orderNumbers = success.map((order) => order.orderNumber).join(",");
      router.replace(`/checkout/success?orders=${encodeURIComponent(orderNumbers)}`);
    } catch (reason) {
      setError(pbErrorMessage(reason));
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <CommercePage title="Checkout" eyebrow="Final details">
        <div className="h-96 animate-pulse border border-white/10 bg-white/[0.03]" />
      </CommercePage>
    );
  }

  if (cart.length === 0) {
    return (
      <CommercePage title="Checkout" eyebrow="Final details">
        <CommerceEmpty
          title="Your bag is empty"
          description="Add a piece before entering delivery and payment details."
          href="/marketplace"
          action="Explore marketplace"
        />
      </CommercePage>
    );
  }

  return (
    <CommercePage
      title="Checkout"
      eyebrow="Final details"
      description="One secure checkout, with a separate order record for each atelier in your bag."
      width="max-w-6xl"
    >
      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-7">
          <section className="border border-white/10 bg-[#0e100e] p-5 sm:p-7">
            <div className="flex items-start gap-4 border-b border-white/10 pb-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#b8873e] text-xs text-[#d4aa68]">1</span>
              <div>
                <h2 className="font-display text-xl">Delivery information</h2>
                <p className="mt-1 text-xs text-[#918a80]">Shared only with the atelier fulfilling each order.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label>
                <span className={luxuryLabelClass}>Full name</span>
                <input
                  value={draft.contactName}
                  onChange={(event) => update("contactName", event.target.value)}
                  className={luxuryInputClass}
                  autoComplete="name"
                  maxLength={120}
                  aria-invalid={!!fieldErrors.contactName}
                />
                <FieldError>{fieldErrors.contactName}</FieldError>
              </label>
              <label>
                <span className={luxuryLabelClass}>Phone number</span>
                <input
                  value={draft.contactPhone}
                  onChange={(event) => update("contactPhone", event.target.value)}
                  className={luxuryInputClass}
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  aria-invalid={!!fieldErrors.contactPhone}
                />
                <FieldError>{fieldErrors.contactPhone}</FieldError>
              </label>
              <label className="sm:col-span-2">
                <span className={luxuryLabelClass}>Delivery address</span>
                <textarea
                  value={draft.shippingAddress}
                  onChange={(event) => update("shippingAddress", event.target.value)}
                  className={`${luxuryInputClass} min-h-28 resize-y`}
                  autoComplete="street-address"
                  maxLength={500}
                  aria-invalid={!!fieldErrors.shippingAddress}
                />
                <FieldError>{fieldErrors.shippingAddress}</FieldError>
              </label>
            </div>
          </section>

          <section className="border border-white/10 bg-[#0e100e] p-5 sm:p-7">
            <div className="flex items-start gap-4 border-b border-white/10 pb-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#b8873e] text-xs text-[#d4aa68]">2</span>
              <div>
                <h2 className="font-display text-xl">Offline payment</h2>
                <p className="mt-1 text-xs text-[#918a80]">No card is charged here. The seller confirms payment on your order.</p>
              </div>
            </div>
            <fieldset className="mt-6">
              <legend className={luxuryLabelClass}>Payment method</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`cursor-pointer border p-4 transition ${
                      draft.paymentMethod === method.value
                        ? "border-[#b8873e] bg-[#b8873e]/10"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={draft.paymentMethod === method.value}
                      onChange={() => update("paymentMethod", method.value)}
                      className="sr-only"
                    />
                    <span className="block text-sm text-[#eee6da]">{method.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#8f887d]">{method.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label>
                <span className={luxuryLabelClass}>Payment reference (optional)</span>
                <input
                  value={draft.paymentReference}
                  onChange={(event) => update("paymentReference", event.target.value)}
                  className={luxuryInputClass}
                  maxLength={100}
                  placeholder="Transfer reference or note"
                />
              </label>
              <label>
                <span className={luxuryLabelClass}>Order note (optional)</span>
                <input
                  value={draft.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  className={luxuryInputClass}
                  maxLength={500}
                  placeholder="Delivery timing or access note"
                />
              </label>
            </div>
          </section>
          <FieldError>{error}</FieldError>
        </div>

        <aside className="border border-[#8f6d39]/40 bg-[#111310] p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl">Order summary</h2>
          <p className="mt-2 text-xs leading-5 text-[#918a80]">
            {cart.length} {cart.length === 1 ? "piece" : "pieces"} from {sellerCount}{" "}
            {sellerCount === 1 ? "atelier" : "ateliers"}
          </p>
          <ul className="mt-5 max-h-64 space-y-4 overflow-auto border-y border-white/10 py-5">
            {cart.map((line) => (
              <li key={line.key} className="flex justify-between gap-4 text-xs">
                <span className="text-[#c8bdad]">
                  {line.quantity} × {line.name}
                  {line.variantLabel ? <small className="mt-1 block text-[#817a70]">{line.variantLabel}</small> : null}
                </span>
                <span className="shrink-0 text-[#eee6da]">{formatNaira(line.price * line.quantity, line.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-3 py-5 text-sm">
            <div className="flex justify-between text-[#9f978b]"><dt>Subtotal</dt><dd className="text-[#eee6da]">{formatNaira(subtotal)}</dd></div>
            <div className="flex justify-between text-[#9f978b]"><dt>Delivery</dt><dd className="text-[#eee6da]">Complimentary</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-4 font-display text-lg"><dt>Total</dt><dd className="text-[#d4aa68]">{formatNaira(subtotal)}</dd></div>
          </dl>
          <button type="submit" disabled={submitting || authLoading} className={`${goldButtonClass} w-full`}>
            {submitting ? "Placing orders…" : user ? "Place order" : "Sign in to place order"}
          </button>
          <Link href="/cart" className={`${outlineButtonClass} mt-3 w-full`}>Return to bag</Link>
          <p className="mt-4 text-center text-[0.65rem] leading-5 text-[#817a70]">
            By placing the order, you agree to share these delivery details with the relevant sellers.
          </p>
        </aside>
      </form>
    </CommercePage>
  );
}
