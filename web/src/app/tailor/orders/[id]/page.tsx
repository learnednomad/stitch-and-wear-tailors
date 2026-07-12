"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  customerName,
  forwardStatuses,
  garmentType,
  updateStatusWithNote,
} from "@/components/tailor/data";
import { MessageThread } from "@/components/tailor/MessageThread";
import { RecordPaymentModal } from "@/components/tailor/RecordPaymentModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/Toast";
import { invoicesByOrder } from "@/lib/api/invoices";
import { acceptOrder, getOrder, rejectOrder, type OrderDetail } from "@/lib/api/orders";
import { paymentsByOrder } from "@/lib/api/payments";
import {
  formatDate,
  formatDateTime,
  formatNaira,
  relativeTime,
} from "@/lib/format";
import { authedUserId, pbErrorMessage } from "@/lib/pb";
import { statusMeta } from "@/lib/status";
import type { Invoice, OrderStatus, Payment } from "@/lib/types";

export default function TailorOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");

  const [accepting, setAccepting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, inv, pays] = await Promise.all([
        getOrder(id),
        invoicesByOrder(id).catch(() => [] as Invoice[]),
        paymentsByOrder(id).catch(() => [] as Payment[]),
      ]);
      setDetail(d);
      setInvoices(inv);
      setPayments(pays);
      setError("");
    } catch (err) {
      setError(pbErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const paidTotal = useMemo(
    () =>
      payments
        .filter((p) => p.status === "confirmed" && p.paymentType !== "refund")
        .reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  if (error) {
    return (
      <div>
        <PageHeader title="Order" />
        <EmptyState
          title="Order unavailable"
          description={error}
          action={
            <Link
              href="/tailor/orders"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
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
  const uid = authedUserId();
  const isMine = order.tailor === uid;
  const custName = customerName(order, items);
  const options = forwardStatuses(order.status);
  const activeInvoice = invoices.find((inv) => inv.status !== "void");
  const canAct =
    isMine && !["rejected", "cancelled", "pending"].includes(order.status);

  async function handleAccept() {
    setAccepting(true);
    try {
      await acceptOrder(order.id);
      toast.show(`${order.orderNumber} accepted.`, "success");
      await load();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setAccepting(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      await rejectOrder(order.id, rejectReason.trim() || undefined);
      toast.show(`${order.orderNumber} rejected.`, "info");
      setRejectOpen(false);
      router.push("/tailor/orders");
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setRejecting(false);
    }
  }

  async function handleStatusUpdate() {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      await updateStatusWithNote(order, nextStatus, statusNote);
      toast.show(
        `Status updated to ${statusMeta("order", nextStatus).label}.`,
        "success"
      );
      setStatusOpen(false);
      setNextStatus("");
      setStatusNote("");
      await load();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${relativeTime(order.created)} by ${custName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {order.status === "pending" && (
              <>
                <Button loading={accepting} onClick={handleAccept}>
                  Accept order
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setRejectOpen(true)}
                  disabled={accepting}
                >
                  Reject
                </Button>
              </>
            )}
            {canAct && options.length > 0 && (
              <Button onClick={() => setStatusOpen(true)}>Update status</Button>
            )}
            {canAct && (
              <Button variant="secondary" onClick={() => setPaymentOpen(true)}>
                Record payment
              </Button>
            )}
            {canAct &&
              (activeInvoice ? (
                <Link
                  href={`/tailor/invoices/${activeInvoice.id}`}
                  className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  View invoice
                </Link>
              ) : (
                <Link
                  href={`/tailor/invoices/new?order=${order.id}`}
                  className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Create invoice
                </Link>
              ))}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusChip kind="order" status={order.status} />
        <StatusChip kind="orderPayment" status={order.paymentStatus || "pending"} />
        {order.priority !== "normal" && (
          <Badge tone={order.priority === "urgent" ? "danger" : "warning"}>
            {order.priority}
          </Badge>
        )}
        <Badge tone="neutral" className="capitalize">
          {order.orderType.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Summary">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-neutral-500">Total</dt>
                <dd className="mt-0.5 font-semibold text-neutral-900">
                  {formatNaira(order.totalAmount, order.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Paid</dt>
                <dd className="mt-0.5 font-semibold text-neutral-900">
                  {formatNaira(paidTotal, order.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Balance</dt>
                <dd className="mt-0.5 font-semibold text-neutral-900">
                  {formatNaira(
                    Math.max(order.totalAmount - paidTotal, 0),
                    order.currency
                  )}
                </dd>
              </div>
              {order.estimatedDelivery && (
                <div>
                  <dt className="text-neutral-500">Est. delivery</dt>
                  <dd className="mt-0.5 text-neutral-900">
                    {formatDate(order.estimatedDelivery)}
                  </dd>
                </div>
              )}
              {order.fabricSource && (
                <div>
                  <dt className="text-neutral-500">Fabric source</dt>
                  <dd className="mt-0.5 capitalize text-neutral-900">
                    {order.fabricSource.replace(/_/g, " ")}
                  </dd>
                </div>
              )}
              {order.acceptedAt && (
                <div>
                  <dt className="text-neutral-500">Accepted</dt>
                  <dd className="mt-0.5 text-neutral-900">
                    {formatDate(order.acceptedAt)}
                  </dd>
                </div>
              )}
            </dl>
            {order.specialInstructions && (
              <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-sm">
                <p className="font-medium text-neutral-700">
                  Special instructions
                </p>
                <p className="mt-1 whitespace-pre-wrap text-neutral-600">
                  {order.specialInstructions}
                </p>
              </div>
            )}
            {order.internalNotes && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-800">Internal notes</p>
                <p className="mt-1 whitespace-pre-wrap text-amber-900/80">
                  {order.internalNotes}
                </p>
              </div>
            )}
          </Card>

          <Card title="Items" flush>
            {items.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState title="No items recorded on this order" />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 p-5 pt-0 sm:p-6 sm:pt-0">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium capitalize text-neutral-900">
                        {garmentType(item).replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        Qty {item.quantity || 1}
                        {item.designStyle ? ` · ${item.designStyle}` : ""}
                      </p>
                    </div>
                    <span className="font-medium text-neutral-800">
                      {formatNaira(item.totalPrice)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Stage timeline">
            {stages.length === 0 ? (
              <EmptyState
                title="No stage history yet"
                description="Status changes will be tracked here."
              />
            ) : (
              <ol className="relative ml-2 border-l border-neutral-200">
                {stages.map((stage) => (
                  <li key={stage.id} className="mb-5 ml-5 last:mb-1">
                    <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-brand-600" />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip kind="order" status={stage.status} />
                      <span className="text-xs text-neutral-400">
                        {formatDateTime(stage.created)}
                      </span>
                    </div>
                    {stage.note && (
                      <p className="mt-1 text-sm text-neutral-600">
                        {stage.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {payments.length > 0 && (
            <Card title="Payments" flush>
              <ul className="divide-y divide-neutral-100 p-5 pt-0 sm:p-6 sm:pt-0">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">
                        {formatNaira(p.amount, p.currency)}
                        <span className="ml-2 font-normal capitalize text-neutral-500">
                          {p.paymentType.replace(/_/g, " ")} ·{" "}
                          {p.method.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {formatDateTime(p.confirmedAt || p.created)}
                        {p.reference ? ` · Ref ${p.reference}` : ""}
                      </p>
                    </div>
                    <StatusChip kind="payment" status={p.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Customer">
            <p className="text-sm font-medium text-neutral-900">{custName}</p>
            {order.expand?.customer ? (
              <dl className="mt-2 flex flex-col gap-1 text-sm text-neutral-600">
                {order.expand.customer.phone && (
                  <dd>{order.expand.customer.phone}</dd>
                )}
                {order.expand.customer.email && (
                  <dd>{order.expand.customer.email}</dd>
                )}
                {order.expand.customer.location && (
                  <dd>{order.expand.customer.location}</dd>
                )}
              </dl>
            ) : (
              <p className="mt-1 text-xs text-neutral-400">
                Contact details are only shared once the order is in progress.
              </p>
            )}
            <Link
              href="/tailor/measurements"
              className="mt-3 inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              View measurements →
            </Link>
          </Card>

          {isMine && (
            <Card title="Messages">
              <MessageThread
                orderId={order.id}
                recipientId={order.customer}
                recipientName={custName}
              />
            </Card>
          )}
        </div>
      </div>

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this order?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectOpen(false)}
              disabled={rejecting}
            >
              Keep order
            </Button>
            <Button variant="danger" loading={rejecting} onClick={handleReject}>
              Reject order
            </Button>
          </>
        }
      >
        <p className="mb-3">
          The customer will be notified that you can&apos;t take{" "}
          {order.orderNumber}.
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-neutral-700">
            Reason (optional)
          </span>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-1 focus:outline-brand-700"
            placeholder="e.g. Fully booked this month"
          />
        </label>
      </Modal>

      {/* Update status modal */}
      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Update status"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setStatusOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              loading={updating}
              disabled={!nextStatus}
              onClick={handleStatusUpdate}
            >
              Update
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">
            Current stage:{" "}
            <span className="font-medium text-neutral-800">
              {statusMeta("order", order.status).label}
            </span>
          </p>
          <Select
            label="Move to"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
          >
            <option value="" disabled>
              Choose a stage…
            </option>
            {options.map((s) => (
              <option key={s} value={s}>
                {statusMeta("order", s).label}
              </option>
            ))}
          </Select>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-700">
              Note (optional, kept internal)
            </span>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-1 focus:outline-brand-700"
              placeholder="e.g. Fabric cut, starting sleeves tomorrow"
            />
          </label>
        </div>
      </Modal>

      <RecordPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        order={order}
        paidTotal={paidTotal}
        onRecorded={() => void load()}
      />
    </div>
  );
}
