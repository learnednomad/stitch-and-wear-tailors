"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { customerName } from "@/components/tailor/data";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/Toast";
import { listByTailor } from "@/lib/api/invoices";
import { confirmClaim, pendingClaims, rejectClaim } from "@/lib/api/payments";
import { formatDate, formatNaira, relativeTime } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";
import type { Invoice, InvoiceStatus, Payment } from "@/lib/types";

const STATUS_FILTERS: Array<{ value: InvoiceStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

export default function TailorInvoicesPage() {
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [claims, setClaims] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [error, setError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<Payment | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [inv, cl] = await Promise.all([
        listByTailor({
          status: statusFilter ? [statusFilter] : undefined,
          perPage: 100,
        }),
        pendingClaims(),
      ]);
      setInvoices(inv.items);
      setClaims(cl);
      setError("");
    } catch {
      setError("Could not load invoices. Please try again.");
    }
  }, [statusFilter]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function handleConfirm() {
    if (!confirmTarget) return;
    setActing(true);
    try {
      await confirmClaim(confirmTarget.id);
      toast.show(
        `Payment of ${formatNaira(confirmTarget.amount)} confirmed.`,
        "success"
      );
      setConfirmTarget(null);
      await load();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setActing(true);
    try {
      await rejectClaim(rejectTarget.id);
      toast.show("Payment claim rejected.", "info");
      setRejectTarget(null);
      await load();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Issue invoices, request deposits and track what's been paid."
        actions={
          <Link
            href="/tailor/invoices/new"
            className="inline-flex items-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            New invoice
          </Link>
        }
      />

      {claims.length > 0 && (
        <Card
          title="Payment claims to review"
          description="Customers say they've paid — confirm once the money lands."
          className="mb-6 border-accent-300"
        >
          <ul className="divide-y divide-neutral-100">
            {claims.map((claim) => (
              <li
                key={claim.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="text-sm">
                  <p className="font-medium text-neutral-900">
                    {formatNaira(claim.amount, claim.currency)}
                    <span className="ml-2 font-normal capitalize text-neutral-500">
                      {claim.paymentType.replace(/_/g, " ")} ·{" "}
                      {claim.method.replace(/_/g, " ")}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {claim.expand?.order?.orderNumber ?? "Order"} ·{" "}
                    {relativeTime(claim.created)}
                    {claim.reference ? ` · Ref ${claim.reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setConfirmTarget(claim)}>
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setRejectTarget(claim)}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <EmptyState title="Something went wrong" description={error} />
      ) : invoices === null ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Create an invoice from any active order to request payment."
          action={
            <Link
              href="/tailor/invoices/new"
              className="inline-flex items-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              New invoice
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map((invoice) => {
            const order = invoice.expand?.order;
            return (
              <Link
                key={invoice.id}
                href={`/tailor/invoices/${invoice.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">
                    {invoice.invoiceNumber}
                    <span className="ml-2 font-normal text-neutral-500">
                      {order
                        ? customerName(order)
                        : `Customer ${invoice.customer.slice(0, 5)}…`}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {order?.orderNumber ?? "—"}
                    {invoice.dueAt ? ` · Due ${formatDate(invoice.dueAt)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-neutral-800">
                    {formatNaira(invoice.subtotal, invoice.currency)}
                  </span>
                  <StatusChip kind="invoice" status={invoice.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="Confirm this payment?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmTarget(null)}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button loading={acting} onClick={handleConfirm}>
              Confirm payment
            </Button>
          </>
        }
      >
        {confirmTarget && (
          <p>
            Confirm you received{" "}
            <span className="font-semibold">
              {formatNaira(confirmTarget.amount, confirmTarget.currency)}
            </span>{" "}
            via {confirmTarget.method.replace(/_/g, " ")}
            {confirmTarget.expand?.order?.orderNumber
              ? ` for ${confirmTarget.expand.order.orderNumber}`
              : ""}
            . This updates the order&apos;s payment records.
          </p>
        )}
      </Modal>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject this claim?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectTarget(null)}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={acting} onClick={handleReject}>
              Reject claim
            </Button>
          </>
        }
      >
        {rejectTarget && (
          <p>
            Reject the claim of{" "}
            <span className="font-semibold">
              {formatNaira(rejectTarget.amount, rejectTarget.currency)}
            </span>
            ? The customer will see it was not confirmed.
          </p>
        )}
      </Modal>
    </div>
  );
}
