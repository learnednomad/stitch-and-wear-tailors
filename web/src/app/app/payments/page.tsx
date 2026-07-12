"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ListResult } from "pocketbase";
import { listByCustomer } from "@/lib/api/invoices";
import { listOrders } from "@/lib/api/orders";
import { myPayments } from "@/lib/api/payments";
import { subscribe } from "@/lib/api/realtime";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";
import { COLLECTIONS, fileUrl, pbErrorMessage } from "@/lib/pb";
import type { Invoice, Order, Payment } from "@/lib/types";
import { PaymentClaimModal } from "@/components/client/PaymentClaimModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/Toast";

const HISTORY_PAGE = 20;

export default function PaymentsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [outstanding, setOutstanding] = useState<Order[] | null>(null);
  const [invoicesByOrderId, setInvoicesByOrderId] = useState<
    Record<string, Invoice[]>
  >({});
  const [history, setHistory] = useState<ListResult<Payment> | null>(null);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  const [claimOrder, setClaimOrder] = useState<Order | null>(null);
  const [receiptDetail, setReceiptDetail] = useState<Payment | null>(null);

  const loadOutstanding = useCallback(() => {
    Promise.all([listOrders({ role: "customer", perPage: 200 }), listByCustomer()])
      .then(([orders, invoices]) => {
        setOutstanding(orders.items.filter((o) => (o.balanceAmount || 0) > 0));
        const map: Record<string, Invoice[]> = {};
        for (const inv of invoices) {
          (map[inv.order] ??= []).push(inv);
        }
        setInvoicesByOrderId(map);
      })
      .catch((err) => toast.show(pbErrorMessage(err), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = useCallback((limit: number) => {
    myPayments(1, limit)
      .then(setHistory)
      .catch((err) => toast.show(pbErrorMessage(err), "error"))
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    loadOutstanding();
  }, [user, loadOutstanding]);

  useEffect(() => {
    if (!user) return;
    loadHistory(historyLimit);
  }, [user, historyLimit, loadHistory]);

  // Live refresh when my payments or orders change (confirmations, new claims).
  useEffect(() => {
    if (!user) return;
    const offPayments = subscribe<Payment>(
      COLLECTIONS.payments,
      () => {
        loadOutstanding();
        loadHistory(historyLimit);
      },
      { filter: `user = "${user.id}"` }
    );
    const offOrders = subscribe<Order>(COLLECTIONS.orders, loadOutstanding, {
      filter: `customer = "${user.id}"`,
    });
    return () => {
      offPayments();
      offOrders();
    };
  }, [user, historyLimit, loadOutstanding, loadHistory]);

  const payments = history?.items ?? [];
  const hasMore = !!history && history.totalItems > payments.length;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record payments and keep track of deposits and balances."
      />

      <div className="space-y-6">
        {/* Outstanding balances */}
        <Card
          title="Outstanding balances"
          description="Orders that still have a balance due."
        >
          {!outstanding ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : outstanding.length === 0 ? (
            <EmptyState
              title="All settled"
              description="You have no outstanding balances right now."
            />
          ) : (
            <ul className="space-y-4">
              {outstanding.map((o) => {
                const total = o.totalAmount || 0;
                const balance = o.balanceAmount || 0;
                const paid = Math.max(total - balance, 0);
                const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
                const invoice = invoicesByOrderId[o.id]?.[0];
                return (
                  <li
                    key={o.id}
                    className="rounded-xl border border-neutral-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/orders/${o.id}`}
                          className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                        >
                          {o.orderNumber || o.id}
                        </Link>
                        <StatusChip kind="order" status={o.status} />
                        {invoice && (
                          <StatusChip kind="invoice" status={invoice.status} />
                        )}
                      </div>
                      <Button size="sm" onClick={() => setClaimOrder(o)}>
                        I&apos;ve paid
                      </Button>
                    </div>
                    <div className="mt-3">
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Paid ${Math.round(pct)}% of ${o.orderNumber}`}
                      >
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-neutral-500">
                        <span>
                          Paid{" "}
                          <span className="font-medium text-neutral-800">
                            {formatNaira(paid, o.currency)}
                          </span>{" "}
                          of {formatNaira(total, o.currency)}
                        </span>
                        <span>
                          Balance{" "}
                          <span className="font-semibold text-neutral-900">
                            {formatNaira(balance, o.currency)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Payment history */}
        <Card title="Payment history" flush>
          {!history ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : payments.length === 0 ? (
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <EmptyState
                title="No payments yet"
                description="Payments you record will appear here while your tailor confirms them."
              />
            </div>
          ) : (
            <>
              <ul className="divide-y divide-neutral-100">
                {payments.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setReceiptDetail(p)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-left hover:bg-neutral-50 sm:px-6"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">
                          {formatNaira(p.amount || 0, p.currency)}{" "}
                          <span className="font-normal capitalize text-neutral-500">
                            · {p.paymentType?.replace(/_/g, " ")}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {p.expand?.order?.orderNumber || "Order"} ·{" "}
                          {formatDate(p.created)}
                        </p>
                      </div>
                      <StatusChip kind="payment" status={p.status} />
                    </button>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div className="flex justify-center border-t border-neutral-100 p-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={loadingMore}
                    onClick={() => {
                      setLoadingMore(true);
                      setHistoryLimit((l) => l + HISTORY_PAGE);
                    }}
                  >
                    Load more ({payments.length} of {history.totalItems})
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Claim modal (shared component, also used on order detail) */}
      {claimOrder && (
        <PaymentClaimModal
          open={!!claimOrder}
          onClose={() => setClaimOrder(null)}
          order={claimOrder}
          onCreated={() => {
            loadOutstanding();
            loadHistory(historyLimit);
          }}
        />
      )}

      {/* Receipt detail modal */}
      <ReceiptModal
        payment={receiptDetail}
        onClose={() => setReceiptDetail(null)}
      />
    </div>
  );
}

function ReceiptModal({
  payment,
  onClose,
}: {
  payment: Payment | null;
  onClose: () => void;
}) {
  const p = payment;
  return (
    <Modal open={!!p} onClose={onClose} title="Payment details">
      {p && (
        <dl className="divide-y divide-neutral-100 text-sm">
          <Row label="Amount">
            <span className="font-display text-base font-semibold text-neutral-900">
              {formatNaira(p.amount || 0, p.currency)}
            </span>
          </Row>
          <Row label="Status">
            <StatusChip kind="payment" status={p.status} />
          </Row>
          <Row label="Order">
            {p.expand?.order ? (
              <Link
                href={`/app/orders/${p.order}`}
                className="font-medium text-brand-700 hover:text-brand-800"
              >
                {p.expand.order.orderNumber || p.order}
              </Link>
            ) : (
              p.order || "—"
            )}
          </Row>
          <Row label="Type">
            <span className="capitalize">
              {p.paymentType?.replace(/_/g, " ") || "—"}
            </span>
          </Row>
          <Row label="Method">
            <span className="capitalize">
              {p.method?.replace(/_/g, " ") || "—"}
            </span>
          </Row>
          <Row label="Recorded">{formatDateTime(p.created)}</Row>
          {p.confirmedAt && <Row label="Confirmed">{formatDateTime(p.confirmedAt)}</Row>}
          {p.reference && <Row label="Reference">{p.reference}</Row>}
          {p.notes && <Row label="Notes">{p.notes}</Row>}
          {p.receipt && (
            <Row label="Receipt">
              <a
                href={fileUrl(p, p.receipt)}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-700 hover:text-brand-800"
              >
                View attachment →
              </a>
            </Row>
          )}
        </dl>
      )}
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right text-neutral-800">{children}</dd>
    </div>
  );
}
