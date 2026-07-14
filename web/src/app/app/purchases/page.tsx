"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMyMarketplaceOrders } from "@/lib/api/products";
import { formatDateTime, formatNaira } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";
import type { MarketplaceOrder } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";

const STATUS_TONE: Record<MarketplaceOrder["status"], "neutral" | "brand" | "success" | "warning" | "danger"> = {
  pending_payment: "warning",
  paid: "brand",
  processing: "brand",
  shipped: "brand",
  delivered: "success",
  cancelled: "danger",
};

export default function PurchasesPage() {
  const [orders, setOrders] = useState<MarketplaceOrder[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listMyMarketplaceOrders(1, 100)
      .then((result) => {
        if (active) setOrders(result.items);
      })
      .catch((reason) => {
        if (active) setError(pbErrorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Marketplace purchases"
        description="Follow ready-to-wear orders from payment confirmation to delivery."
      />
      {error ? <p role="alert" className="mb-5 text-sm text-red-600">{error}</p> : null}
      {!orders && !error ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : orders?.length === 0 ? (
        <EmptyState
          title="No marketplace purchases yet"
          description="Ready-to-wear pieces you order from the storefront will appear here."
          action={
            <Link href="/marketplace" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              Visit marketplace
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders?.map((order) => (
            <Card key={order.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-neutral-900">
                      {order.orderNumber}
                    </h2>
                    <Badge tone={STATUS_TONE[order.status]} className="capitalize">
                      {order.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Placed {formatDateTime(order.created)} · {order.items.length}{" "}
                    {order.items.length === 1 ? "piece" : "pieces"}
                  </p>
                </div>
                <p className="font-display text-lg font-semibold text-neutral-900">
                  {formatNaira(order.subtotal, order.currency)}
                </p>
              </div>
              <ul className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100">
                {order.items.map((item, index) => (
                  <li key={`${item.productId}-${item.variantId ?? index}`} className="flex justify-between gap-4 py-3 text-sm">
                    <span className="text-neutral-700">
                      {item.quantity} × {item.name}
                      {item.variantLabel ? <small className="ml-2 text-neutral-400">{item.variantLabel}</small> : null}
                    </span>
                    <span className="shrink-0 text-neutral-600">
                      {formatNaira(item.price * item.quantity, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-neutral-500">
                Payment: {order.paymentMethod.replaceAll("_", " ")} · Delivery to {order.shippingAddress}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
