"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  customerName,
  garmentSummary,
  itemsByOrders,
} from "@/components/tailor/data";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { createInvoice, listByTailor } from "@/lib/api/invoices";
import { listOrders } from "@/lib/api/orders";
import { formatNaira } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";
import type { Order, OrderItem } from "@/lib/types";

interface LineRow {
  description: string;
  quantity: string;
  amount: string;
}

const EMPTY_ROW: LineRow = { description: "", quantity: "1", amount: "" };

function NewInvoiceForm() {
  const router = useRouter();
  const toast = useToast();
  const preselect = useSearchParams().get("order") ?? "";

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [orderItems, setOrderItems] = useState<Map<string, OrderItem[]>>(
    new Map()
  );
  const [orderId, setOrderId] = useState(preselect);
  const [rows, setRows] = useState<LineRow[]>([{ ...EMPTY_ROW }]);
  const [depositTouched, setDepositTouched] = useState(false);
  const [deposit, setDeposit] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [send, setSend] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Prefill a line item from the selected order if the editor is untouched.
  function prefillRows(order: Order, items: Map<string, OrderItem[]>) {
    setRows((prev) => {
      const untouched =
        prev.length === 1 && !prev[0].description && !prev[0].amount;
      if (!untouched) return prev;
      return [
        {
          description: garmentSummary(items.get(order.id)),
          quantity: "1",
          amount: String(order.totalAmount || ""),
        },
      ];
    });
  }

  // Own orders that don't already carry a non-void invoice.
  useEffect(() => {
    (async () => {
      try {
        const [orderList, invoiceList] = await Promise.all([
          listOrders({ role: "tailor", perPage: 200 }),
          listByTailor({ perPage: 200 }),
        ]);
        const invoiced = new Set(
          invoiceList.items
            .filter((inv) => inv.status !== "void")
            .map((inv) => inv.order)
        );
        const eligible = orderList.items.filter(
          (o) =>
            !invoiced.has(o.id) &&
            !["rejected", "cancelled", "pending"].includes(o.status)
        );
        const items = await itemsByOrders(eligible.map((o) => o.id));
        setOrders(eligible);
        setOrderItems(items);
        const preselected = eligible.find((o) => o.id === preselect);
        if (preselected) prefillRows(preselected, items);
      } catch {
        setOrders([]);
        setError("Could not load your orders.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = orders?.find((o) => o.id === orderId);

  const subtotal = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const qty = Number(row.quantity) || 0;
        const amount = Number(row.amount) || 0;
        return sum + qty * amount;
      }, 0),
    [rows]
  );

  // Deposit defaults to 50% of the subtotal until manually edited.
  const depositValue = depositTouched
    ? deposit
    : subtotal
      ? String(subtotal / 2)
      : "";

  function updateRow(index: number, patch: Partial<LineRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  async function handleSubmit() {
    if (!selected) {
      setError("Choose an order to invoice.");
      return;
    }
    const lineItems = rows
      .filter((r) => r.description.trim() && Number(r.amount) > 0)
      .map((r) => ({
        description: r.description.trim(),
        quantity: Math.max(Number(r.quantity) || 1, 1),
        amount: Number(r.amount),
      }));
    if (lineItems.length === 0) {
      setError("Add at least one line item with a description and amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const invoice = await createInvoice({
        order: selected.id,
        customer: selected.customer,
        lineItems,
        subtotal,
        depositRequired: Number(depositValue) || 0,
        status: send ? "sent" : "draft",
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.show(
        `Invoice ${invoice.invoiceNumber} ${send ? "sent" : "saved as draft"}.`,
        "success"
      );
      router.push(`/tailor/invoices/${invoice.id}`);
    } catch (err) {
      setError(pbErrorMessage(err));
      setSaving(false);
    }
  }

  if (orders === null) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="Nothing to invoice"
        description={
          error || "Every active order already has an invoice. Nice work."
        }
        action={
          <Link
            href="/tailor/invoices"
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Back to invoices
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card title="Order">
        <Select
          label="Invoice for"
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            const order = orders.find((o) => o.id === e.target.value);
            if (order) prefillRows(order, orderItems);
          }}
        >
          <option value="" disabled>
            Choose an order…
          </option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNumber} — {customerName(o, orderItems.get(o.id))} —{" "}
              {formatNaira(o.totalAmount, o.currency)}
            </option>
          ))}
        </Select>
      </Card>

      <Card title="Line items">
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_4.5rem_7rem_auto] items-end gap-2"
            >
              <Input
                label={i === 0 ? "Description" : undefined}
                placeholder="e.g. Senator suit (2-piece)"
                value={row.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
              />
              <Input
                label={i === 0 ? "Qty" : undefined}
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) => updateRow(i, { quantity: e.target.value })}
              />
              <Input
                label={i === 0 ? "Amount (₦)" : undefined}
                type="number"
                min={0}
                value={row.amount}
                onChange={(e) => updateRow(i, { amount: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove line"
                onClick={() =>
                  setRows((prev) =>
                    prev.length === 1
                      ? [{ ...EMPTY_ROW }]
                      : prev.filter((_, idx) => idx !== i)
                  )
                }
                className="mb-1.5 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])}
            >
              Add line
            </Button>
          </div>
          <p className="border-t border-neutral-100 pt-3 text-right text-sm">
            Subtotal:{" "}
            <span className="font-display text-base font-semibold text-neutral-900">
              {formatNaira(subtotal)}
            </span>
          </p>
        </div>
      </Card>

      <Card title="Terms">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Deposit required (₦)"
            type="number"
            min={0}
            hint="Defaults to 50% of the subtotal."
            value={depositValue}
            onChange={(e) => {
              setDeposit(e.target.value);
              setDepositTouched(true);
            }}
          />
          <Input
            label="Due date"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Input
            label="Notes"
            placeholder="Payment details, bank account, terms… (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-neutral-100 p-1">
          {[
            { value: false, label: "Save as draft" },
            { value: true, label: "Send now" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setSend(opt.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                send === opt.value
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button loading={saving} onClick={handleSubmit}>
          {send ? "Create & send invoice" : "Create draft invoice"}
        </Button>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <div>
      <PageHeader
        title="New invoice"
        description="Bill a customer for one of your orders."
      />
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        }
      >
        <NewInvoiceForm />
      </Suspense>
    </div>
  );
}
