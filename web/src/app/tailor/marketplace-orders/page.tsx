"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listSellerMarketplaceOrders,
  updateMarketplaceOrderStatus,
} from "@/lib/api/products";
import { formatDateTime, formatNaira } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";
import type { MarketplaceOrder, MarketplaceOrderStatus } from "@/lib/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const STATUS_TONE: Record<MarketplaceOrderStatus, BadgeTone> = {
  pending_payment: "warning",
  paid: "info",
  processing: "brand",
  shipped: "brand",
  delivered: "success",
  cancelled: "danger",
};

const NEXT_STATUS: Partial<Record<MarketplaceOrderStatus, { status: MarketplaceOrderStatus; label: string }>> = {
  pending_payment: { status: "paid", label: "Confirm payment" },
  paid: { status: "processing", label: "Start processing" },
  processing: { status: "shipped", label: "Mark shipped" },
  shipped: { status: "delivered", label: "Mark delivered" },
};

export default function MarketplaceOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<MarketplaceOrder[] | null>(null);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await listSellerMarketplaceOrders();
      setOrders(result.items);
      setError("");
    } catch (reason) {
      setError(pbErrorMessage(reason));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function setStatus(order: MarketplaceOrder, status: MarketplaceOrderStatus) {
    setActingId(order.id);
    try {
      await updateMarketplaceOrderStatus(order.id, status);
      toast.show(`Order ${order.orderNumber} is now ${status.replaceAll("_", " ")}.`, "success");
      await load();
    } catch (reason) {
      toast.show(pbErrorMessage(reason), "error");
    } finally {
      setActingId("");
    }
  }

  return (
    <div>
      <PageHeader
        title="Marketplace orders"
        description="Confirm offline payments and move ready-to-wear purchases through fulfilment."
      />
      {error ? <p role="alert" className="mb-5 text-sm text-red-600">{error}</p> : null}
      {!orders && !error ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : orders?.length === 0 ? (
        <EmptyState
          title="No shop orders yet"
          description="Orders for your active marketplace products will appear here."
        />
      ) : (
        <div className="space-y-4">
          {orders?.map((order) => {
            const next = NEXT_STATUS[order.status];
            const canCancel = ["pending_payment", "paid", "processing"].includes(order.status);
            return (
              <Card key={order.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold text-neutral-900">{order.orderNumber}</h2>
                      <Badge tone={STATUS_TONE[order.status]} className="capitalize">
                        {order.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatDateTime(order.created)} · {order.contactName} · {order.contactPhone}
                    </p>
                  </div>
                  <p className="font-display text-lg font-semibold text-neutral-900">
                    {formatNaira(order.subtotal, order.currency)}
                  </p>
                </div>
                <ul className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100">
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
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <div className="text-xs leading-5 text-neutral-500">
                    <p>Deliver to: {order.shippingAddress}</p>
                    <p className="capitalize">Payment: {order.paymentMethod.replaceAll("_", " ")}{order.paymentReference ? ` · Ref ${order.paymentReference}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    {canCancel ? (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={actingId === order.id}
                        onClick={() => setStatus(order, "cancelled")}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    {next ? (
                      <Button
                        size="sm"
                        loading={actingId === order.id}
                        onClick={() => setStatus(order, next.status)}
                      >
                        {next.label}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
