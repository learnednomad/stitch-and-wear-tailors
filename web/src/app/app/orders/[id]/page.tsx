"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { invoicesByOrder } from "@/lib/api/invoices";
import { cancelOrder, getOrder, type OrderDetail } from "@/lib/api/orders";
import { paymentsByOrder } from "@/lib/api/payments";
import { subscribe } from "@/lib/api/realtime";
import { formatDate, formatDateTime, formatNaira, relativeTime } from "@/lib/format";
import { COLLECTIONS, fileUrl, pbErrorMessage } from "@/lib/pb";
import { statusMeta } from "@/lib/status";
import type { Invoice, Order, OrderStage, Payment } from "@/lib/types";
import { displayName } from "@/components/client/order-utils";
import { PaymentClaimModal } from "@/components/client/PaymentClaimModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/Toast";

const CANCEL_REASONS = [
  "Changed my mind",
  "Found another tailor",
  "Timeline no longer works",
  "Other",
];

const CANCELLABLE = new Set(["pending", "accepted"]);
const REORDERABLE = new Set(["delivered", "cancelled"]);

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadError, setLoadError] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);

  const reload = useCallback(() => {
    if (!id) return;
    Promise.all([getOrder(id), invoicesByOrder(id), paymentsByOrder(id)])
      .then(([d, inv, pay]) => {
        setDetail(d);
        setInvoices(inv);
        setPayments(pay);
        setLoadError("");
      })
      .catch((err) => setLoadError(pbErrorMessage(err)));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Live updates: this order's record + its stage entries + its payments.
  useEffect(() => {
    if (!id) return;
    const offOrder = subscribe<Order>(COLLECTIONS.orders, reload, {
      topic: id,
    });
    const offStages = subscribe<OrderStage>(COLLECTIONS.orderStages, reload, {
      filter: `order = "${id}"`,
    });
    const offPayments = subscribe<Payment>(COLLECTIONS.payments, reload, {
      filter: `order = "${id}"`,
    });
    return () => {
      offOrder();
      offStages();
      offPayments();
    };
  }, [id, reload]);

  async function handleCancel() {
    if (!detail) return;
    const reason =
      cancelReason === "Other"
        ? cancelNote.trim() || "Cancelled by customer"
        : cancelNote.trim()
          ? `${cancelReason} — ${cancelNote.trim()}`
          : cancelReason;
    setCancelling(true);
    try {
      await cancelOrder(detail.order.id, reason);
      toast.show("Order cancelled.", "success");
      setCancelOpen(false);
      reload();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setCancelling(false);
    }
  }

  if (loadError) {
    return (
      <div>
        <PageHeader title="Order" />
        <EmptyState
          title="Couldn't load this order"
          description={loadError}
          action={
            <Link
              href="/app/orders"
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Back to orders
            </Link>
          }
        />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const { order, items, stages } = detail;
  const tailor = order.expand?.tailor;
  const paidSoFar = Math.max((order.totalAmount || 0) - (order.balanceAmount || 0), 0);

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/app/orders"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
        >
          ← Orders
        </Link>
      </div>
      <PageHeader
        title={order.orderNumber || "Order"}
        description={`Placed ${formatDate(order.created)}${
          tailor ? ` with ${displayName(tailor)}` : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/orders/${order.id}/chat`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Message tailor
            </Link>
            {REORDERABLE.has(order.status) && (
              <Link
                href={`/app/orders/new?from=${order.id}`}
                className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
              >
                Reorder
              </Link>
            )}
            {CANCELLABLE.has(order.status) && (
              <Button variant="danger" onClick={() => setCancelOpen(true)}>
                Cancel order
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Summary */}
          <Card
            title="Summary"
            actions={<StatusChip kind="order" status={order.status} />}
          >
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Total
                </dt>
                <dd className="mt-0.5 font-display text-lg font-semibold text-neutral-900">
                  {formatNaira(order.totalAmount || 0, order.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Paid so far
                </dt>
                <dd className="mt-0.5 font-display text-lg font-semibold text-neutral-900">
                  {formatNaira(paidSoFar, order.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Balance due
                </dt>
                <dd className="mt-0.5 font-display text-lg font-semibold text-neutral-900">
                  {formatNaira(order.balanceAmount || 0, order.currency)}
                </dd>
              </div>
              {order.depositAmount > 0 && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Deposit
                  </dt>
                  <dd className="mt-0.5 text-sm text-neutral-800">
                    {formatNaira(order.depositAmount, order.currency)}
                  </dd>
                </div>
              )}
              {order.paymentStatus && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Payment
                  </dt>
                  <dd className="mt-1">
                    <StatusChip kind="orderPayment" status={order.paymentStatus} />
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  Priority
                </dt>
                <dd className="mt-0.5 text-sm capitalize text-neutral-800">
                  {order.priority || "normal"}
                </dd>
              </div>
              {order.estimatedDelivery && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Est. delivery
                  </dt>
                  <dd className="mt-0.5 text-sm text-neutral-800">
                    {formatDate(order.estimatedDelivery)}
                  </dd>
                </div>
              )}
              {order.actualDelivery && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    Delivered
                  </dt>
                  <dd className="mt-0.5 text-sm text-neutral-800">
                    {formatDate(order.actualDelivery)}
                  </dd>
                </div>
              )}
            </dl>
            {order.specialInstructions && (
              <div className="mt-5 rounded-xl bg-neutral-50 p-3.5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Special instructions
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  {order.specialInstructions}
                </p>
              </div>
            )}
            {order.status === "cancelled" && order.cancellationReason && (
              <div className="mt-5 rounded-xl bg-red-50 p-3.5">
                <p className="text-xs uppercase tracking-wide text-red-500">
                  Cancellation reason
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {order.cancellationReason}
                </p>
              </div>
            )}
          </Card>

          {/* Items */}
          <Card title="Items" flush>
            {items.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-neutral-500 sm:px-6 sm:pb-6">
                No line items recorded for this order.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-5 py-3 font-medium sm:px-6">Item</th>
                      <th className="px-5 py-3 font-medium">Fabric</th>
                      <th className="px-5 py-3 text-right font-medium">Qty</th>
                      <th className="px-5 py-3 text-right font-medium sm:px-6">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-3.5 sm:px-6">
                          <p className="font-medium text-neutral-900">
                            {item.designStyle || "Custom item"}
                          </p>
                          <p className="text-xs capitalize text-neutral-500">
                            {item.itemType?.replace(/_/g, " ")}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-neutral-700">
                          {item.expand?.fabric?.name || "Customer-provided"}
                        </td>
                        <td className="px-5 py-3.5 text-right text-neutral-700">
                          {item.quantity}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-neutral-800 sm:px-6">
                          {formatNaira(item.totalPrice || 0, order.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Progress timeline */}
          <Card title="Progress" description="Latest updates from your tailor.">
            {stages.length === 0 ? (
              <p className="text-sm text-neutral-500">No progress updates yet.</p>
            ) : (
              <ol className="relative ml-2 space-y-6 border-l border-neutral-200 pl-6">
                {stages.map((stage, idx) => {
                  const current = idx === 0;
                  const meta = statusMeta("order", stage.status);
                  return (
                    <li key={stage.id} className="relative">
                      <span
                        aria-hidden
                        className={`absolute -left-[31px] top-1 size-2.5 rounded-full ring-4 ring-white ${
                          current ? "bg-brand-600" : "bg-neutral-300"
                        }`}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            current ? "text-brand-800" : "text-neutral-800"
                          }`}
                        >
                          {meta.label}
                        </span>
                        {current && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                            Current
                          </span>
                        )}
                        <span
                          className="text-xs text-neutral-400"
                          title={formatDateTime(stage.created)}
                        >
                          {relativeTime(stage.created)}
                        </span>
                      </div>
                      {stage.note && (
                        <p className="mt-1 text-sm text-neutral-600">
                          {stage.note}
                        </p>
                      )}
                      {stage.photo && (
                        <img
                          src={fileUrl(stage, stage.photo, "480x0")}
                          alt={`Progress photo — ${meta.label}`}
                          className="mt-2 max-h-56 max-w-full rounded-xl border border-neutral-200 object-cover"
                        />
                      )}
                      {stage.expand?.changedBy && (
                        <p className="mt-1 text-xs text-neutral-400">
                          by {displayName(stage.expand.changedBy)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        {/* Billing sidebar */}
        <div className="space-y-6">
          <Card
            title="Invoice & payments"
            actions={
              order.balanceAmount > 0 ? (
                <Button size="sm" onClick={() => setClaimOpen(true)}>
                  I&apos;ve paid
                </Button>
              ) : undefined
            }
          >
            {invoices.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No invoice has been issued for this order yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="rounded-xl border border-neutral-200 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-neutral-900">
                        {inv.invoiceNumber}
                      </span>
                      <StatusChip kind="invoice" status={inv.status} />
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      {formatNaira(inv.subtotal || 0, inv.currency)}
                      {inv.depositRequired > 0 && (
                        <span className="text-neutral-400">
                          {" "}
                          · deposit {formatNaira(inv.depositRequired, inv.currency)}
                        </span>
                      )}
                    </p>
                    {inv.dueAt && (
                      <p className="mt-0.5 text-xs text-neutral-400">
                        Due {formatDate(inv.dueAt)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Payments
            </h3>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">No payments yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-neutral-100">
                {payments.map((p) => (
                  <li key={p.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-neutral-900">
                        {formatNaira(p.amount || 0, p.currency)}
                      </span>
                      <StatusChip kind="payment" status={p.status} />
                    </div>
                    <p className="mt-0.5 text-xs capitalize text-neutral-500">
                      {p.method?.replace(/_/g, " ")} ·{" "}
                      {p.paymentType?.replace(/_/g, " ")} ·{" "}
                      {formatDate(p.created)}
                    </p>
                    {p.reference && (
                      <p className="text-xs text-neutral-400">
                        Ref: {p.reference}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Tailor">
            {tailor ? (
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {displayName(tailor)}
                </p>
                {tailor.location && (
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {tailor.location}
                  </p>
                )}
                <Link
                  href={`/app/orders/${order.id}/chat`}
                  className="mt-3 inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  Open conversation →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                No tailor assigned yet — your order is waiting to be accepted.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Cancel modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Keep order
            </Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>
              Cancel order
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-neutral-600">
          Let your tailor know why you&apos;re cancelling{" "}
          <span className="font-medium">{order.orderNumber}</span>.
        </p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Cancellation reason</legend>
          {CANCEL_REASONS.map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-700 has-checked:border-brand-600 has-checked:bg-brand-50"
            >
              <input
                type="radio"
                name="cancel-reason"
                value={r}
                checked={cancelReason === r}
                onChange={() => setCancelReason(r)}
                className="accent-brand-700"
              />
              {r}
            </label>
          ))}
        </fieldset>
        <textarea
          value={cancelNote}
          onChange={(e) => setCancelNote(e.target.value)}
          rows={3}
          placeholder="Add more detail (optional)"
          className="mt-3 w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-1 focus:outline-brand-700"
        />
      </Modal>

      <PaymentClaimModal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        order={order}
        onCreated={reload}
      />
    </div>
  );
}
