"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ORDER_SUCCESS_KEY } from "@/components/storefront/commerce/CheckoutPageClient";
import { goldButtonClass, outlineButtonClass } from "@/components/storefront/commerce/commerce-ui";
import type { OrderSuccessSnapshot } from "@/components/storefront/commerce/types";
import { formatNaira } from "@/lib/format";

export function OrderSuccessClient({ orderNumbers }: { orderNumbers: string[] }) {
  const [orders, setOrders] = useState<OrderSuccessSnapshot[]>([]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      try {
        const stored = window.sessionStorage.getItem(ORDER_SUCCESS_KEY);
        if (active && stored) {
          setOrders(JSON.parse(stored) as OrderSuccessSnapshot[]);
        }
      } catch {
        // The order numbers in the URL still provide a useful reload-safe receipt.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const displayedNumbers = orders.length
    ? orders.map((order) => order.orderNumber)
    : orderNumbers;

  return (
    <div className="grid min-h-[70vh] place-items-center bg-[#090b09] px-4 py-14 text-[#f4eee4]">
      <section className="w-full max-w-2xl border border-[#8f6d39]/40 bg-[#101210] px-5 py-10 text-center sm:px-10 sm:py-14">
        <div className="mx-auto grid size-20 place-items-center rounded-full border border-[#b8873e] text-3xl text-[#d4aa68]" aria-hidden="true">
          ✓
        </div>
        <p className="mt-7 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[#b8873e]">Order received</p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl">Thank you</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#aaa397]">
          Your {displayedNumbers.length > 1 ? "orders have" : "order has"} been recorded. Each atelier will confirm your offline payment and begin fulfilment.
        </p>

        {displayedNumbers.length > 0 ? (
          <div className="mx-auto mt-8 max-w-md border-y border-white/10 py-5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[#817a70]">
              {displayedNumbers.length > 1 ? "Order numbers" : "Order number"}
            </p>
            <ul className="mt-3 space-y-2 font-display text-lg text-[#e5c78f]">
              {displayedNumbers.map((number) => <li key={number}>{number}</li>)}
            </ul>
            {orders.length > 0 ? (
              <p className="mt-4 text-xs text-[#918a80]">
                Total recorded: {formatNaira(orders.reduce((total, order) => total + order.subtotal, 0))}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/marketplace" className={goldButtonClass}>Continue shopping</Link>
          <Link href="/app/purchases" className={outlineButtonClass}>View your orders</Link>
        </div>
      </section>
    </div>
  );
}
