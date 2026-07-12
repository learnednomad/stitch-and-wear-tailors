"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { customerName } from "@/components/tailor/data";
import { RecordPaymentModal } from "@/components/tailor/RecordPaymentModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/Toast";
import { getInvoice, updateInvoiceStatus } from "@/lib/api/invoices";
import { getOrder } from "@/lib/api/orders";
import { paymentsByOrder } from "@/lib/api/payments";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";
import type { Invoice, Order, Payment } from "@/lib/types";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const inv = await getInvoice(id);
      setInvoice(inv);
      const [ord, pays] = await Promise.all([
        getOrder(inv.order)
          .then((d) => d.order)
          .catch(() => null),
        paymentsByOrder(inv.order).catch(() => [] as Payment[]),
      ]);
      setOrder(ord);
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

  async function setStatus(status: "sent" | "void") {
    if (!invoice) return;
    setActing(true);
    try {
      await updateInvoiceStatus(invoice.id, status);
      toast.show(
        status === "sent" ? "Invoice marked as sent." : "Invoice voided.",
        status === "sent" ? "success" : "info"
      );
      setVoidOpen(false);
      await load();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setActing(false);
    }
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Invoice" />
        <EmptyState
          title="Invoice unavailable"
          description={error}
          action={
            <Link
              href="/tailor/invoices"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Back to invoices
            </Link>
          }
        />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const tailor = invoice.expand?.tailor;
  const custName = order
    ? customerName(order)
    : (invoice.expand?.customer &&
        `${invoice.expand.customer.firstName} ${invoice.expand.customer.lastName}`.trim()) ||
      `Customer ${invoice.customer.slice(0, 5)}…`;
  const total = order?.totalAmount ?? invoice.subtotal;
  const balance = Math.max(total - paidTotal, 0);
  const lineItems = invoice.lineItems ?? [];

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title={invoice.invoiceNumber}
          description={
            order
              ? `For ${order.orderNumber} · ${custName}`
              : `For ${custName}`
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {invoice.status !== "void" && order && (
                <Button onClick={() => setPaymentOpen(true)}>
                  Record payment
                </Button>
              )}
              {invoice.status === "draft" && (
                <Button
                  variant="secondary"
                  loading={acting}
                  onClick={() => setStatus("sent")}
                >
                  Mark as sent
                </Button>
              )}
              <Button variant="secondary" onClick={() => window.print()}>
                Print
              </Button>
              {invoice.status !== "void" && (
                <Button
                  variant="danger"
                  onClick={() => setVoidOpen(true)}
                  disabled={acting}
                >
                  Void
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="mx-auto max-w-3xl">
        {/* Receipt */}
        <Card className="print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-5">
            <div>
              <p className="font-display text-xl font-semibold text-neutral-900">
                Invoice
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">
                {invoice.invoiceNumber}
              </p>
              {order && (
                <p className="text-sm text-neutral-500">
                  Order {order.orderNumber}
                </p>
              )}
            </div>
            <div className="text-right">
              <StatusChip kind="invoice" status={invoice.status} />
              <p className="mt-2 text-xs text-neutral-500">
                {invoice.issuedAt
                  ? `Issued ${formatDate(invoice.issuedAt)}`
                  : `Created ${formatDate(invoice.created)}`}
              </p>
              {invoice.dueAt && (
                <p className="text-xs text-neutral-500">
                  Due {formatDate(invoice.dueAt)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-b border-neutral-100 py-5 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                From
              </p>
              <p className="mt-1 font-medium text-neutral-900">
                {tailor?.businessName ||
                  `${tailor?.firstName ?? ""} ${tailor?.lastName ?? ""}`.trim() ||
                  "Your business"}
              </p>
              {tailor?.phone && (
                <p className="text-neutral-500">{tailor.phone}</p>
              )}
              {tailor?.location && (
                <p className="text-neutral-500">{tailor.location}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Billed to
              </p>
              <p className="mt-1 font-medium text-neutral-900">{custName}</p>
            </div>
          </div>

          <table className="w-full border-b border-neutral-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                <th className="py-3">Description</th>
                <th className="py-3 text-right">Qty</th>
                <th className="py-3 text-right">Amount</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-neutral-800">
                    {item.description}
                  </td>
                  <td className="py-2.5 text-right text-neutral-600">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 text-right text-neutral-600">
                    {formatNaira(item.amount, invoice.currency)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-neutral-800">
                    {formatNaira(
                      item.amount * (item.quantity || 1),
                      invoice.currency
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto mt-5 flex max-w-xs flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Subtotal</dt>
              <dd className="font-medium text-neutral-900">
                {formatNaira(invoice.subtotal, invoice.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Deposit required</dt>
              <dd className="text-neutral-700">
                {formatNaira(invoice.depositRequired, invoice.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Paid</dt>
              <dd className="text-neutral-700">
                {formatNaira(paidTotal, invoice.currency)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-2">
              <dt className="font-medium text-neutral-900">Balance due</dt>
              <dd className="font-display text-base font-semibold text-neutral-900">
                {formatNaira(balance, invoice.currency)}
              </dd>
            </div>
          </dl>

          {invoice.notes && (
            <p className="mt-6 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600 print:bg-transparent print:p-0">
              {invoice.notes}
            </p>
          )}
        </Card>

        {/* Payment history */}
        <div className="mt-6 print:hidden">
          <Card title="Payment history" flush>
            {payments.length === 0 ? (
              <div className="p-5 pt-0 sm:p-6 sm:pt-0">
                <EmptyState
                  title="No payments yet"
                  description="Payments recorded against this order will show here."
                />
              </div>
            ) : (
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
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        title="Void this invoice?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setVoidOpen(false)}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={acting}
              onClick={() => setStatus("void")}
            >
              Void invoice
            </Button>
          </>
        }
      >
        <p>
          {invoice.invoiceNumber} will be marked void and can no longer be
          paid against. This cannot be undone.
        </p>
      </Modal>

      {order && (
        <RecordPaymentModal
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          order={order}
          paidTotal={paidTotal}
          onRecorded={() => void load()}
        />
      )}
    </div>
  );
}
