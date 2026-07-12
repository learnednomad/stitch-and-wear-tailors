"use client";

import { useState, type FormEvent } from "react";
import { createClaim } from "@/lib/api/payments";
import { formatNaira } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";
import type { Order, Payment, PaymentMethod, PaymentType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";

export interface PaymentClaimModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  /** Called with the created claim (status pending_confirmation). */
  onCreated?: (payment: Payment) => void;
}

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "other", label: "Other" },
];

const TYPES: Array<{ value: PaymentType; label: string }> = [
  { value: "deposit", label: "Deposit" },
  { value: "final_payment", label: "Final payment" },
  { value: "full_payment", label: "Full payment" },
];

/**
 * "I've paid" claim form — records a payment as pending_confirmation for the
 * tailor to confirm. Reused on the payments hub and the order detail page.
 */
export function PaymentClaimModal({
  open,
  onClose,
  order,
  onCreated,
}: PaymentClaimModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`I've paid — ${order.orderNumber || "order"}`}
    >
      {/* Keyed remount so the form re-seeds its defaults every time it opens. */}
      <ClaimForm
        key={order.id}
        order={order}
        onClose={onClose}
        onCreated={onCreated}
      />
    </Modal>
  );
}

function ClaimForm({
  order,
  onClose,
  onCreated,
}: Omit<PaymentClaimModalProps, "open">) {
  const toast = useToast();
  const [amount, setAmount] = useState(
    order.balanceAmount > 0 ? String(order.balanceAmount) : ""
  );
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [paymentType, setPaymentType] = useState<PaymentType>(
    order.depositAmount > 0 ? "final_payment" : "deposit"
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | undefined>(undefined);
  const [amountError, setAmountError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError("Enter the amount you paid.");
      return;
    }
    setAmountError("");
    setSubmitting(true);
    try {
      const payment = await createClaim({
        order: order.id,
        amount: value,
        currency: order.currency || "NGN",
        method,
        paymentType,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        receipt,
      });
      toast.show(
        "Payment recorded — your tailor will confirm it shortly.",
        "success"
      );
      onCreated?.(payment);
      onClose();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        {order.balanceAmount > 0 && (
          <p className="rounded-xl bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-600">
            Outstanding balance:{" "}
            <span className="font-semibold text-neutral-900">
              {formatNaira(order.balanceAmount, order.currency)}
            </span>
          </p>
        )}
        <Input
          label="Amount paid (₦)"
          type="number"
          min="1"
          step="any"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={amountError}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Payment method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Select
            label="Payment type"
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as PaymentType)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Reference"
          placeholder="e.g. bank transfer reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          hint="Optional — helps your tailor match the payment."
        />
        <Input
          label="Notes"
          placeholder="Anything your tailor should know"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="claim-receipt"
            className="text-sm font-medium text-neutral-700"
          >
            Receipt (optional)
          </label>
          <input
            id="claim-receipt"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? undefined)}
            className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
          />
        </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Record payment
        </Button>
      </div>
    </form>
  );
}
