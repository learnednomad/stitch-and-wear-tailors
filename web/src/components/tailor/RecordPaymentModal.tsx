"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { recordConfirmed } from "@/lib/api/payments";
import { formatNaira } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";
import type { Order, PaymentMethod, PaymentType } from "@/lib/types";

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "pos", label: "POS" },
  { value: "other", label: "Other" },
];

export interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  /** Sum of confirmed non-refund payments already on the order. */
  paidTotal: number;
  /** Called after the payment is recorded (refresh your data here). */
  onRecorded: () => void;
}

function suggestType(amount: number, total: number, paid: number): PaymentType {
  if (paid > 0) return "final_payment";
  if (amount >= total && total > 0) return "full_payment";
  return "deposit";
}

/** Tailor records a payment they received directly — created already confirmed. */
export function RecordPaymentModal(props: RecordPaymentModalProps) {
  // Mount the dialog fresh on every open so the form resets itself.
  if (!props.open) return null;
  return <RecordPaymentDialog {...props} />;
}

function RecordPaymentDialog({
  open,
  onClose,
  order,
  paidTotal,
  onRecorded,
}: RecordPaymentModalProps) {
  const toast = useToast();
  const remaining = Math.max(order.totalAmount - paidTotal, 0);
  const initialAmount = remaining > 0 ? remaining : order.totalAmount;

  const [amount, setAmount] = useState(String(initialAmount));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentType, setPaymentType] = useState<PaymentType>(() =>
    suggestType(initialAmount, order.totalAmount, paidTotal)
  );
  const [typeTouched, setTypeTouched] = useState(false);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsedAmount = Number(amount);

  function handleAmountChange(value: string) {
    setAmount(value);
    if (!typeTouched) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) {
        setPaymentType(suggestType(n, order.totalAmount, paidTotal));
      }
    }
  }

  async function handleSubmit() {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await recordConfirmed({
        order: order.id,
        user: order.customer,
        amount: parsedAmount,
        method,
        paymentType,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.show(`Payment of ${formatNaira(parsedAmount)} recorded.`, "success");
      onRecorded();
      onClose();
    } catch (err) {
      setError(pbErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Record payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">
          {order.orderNumber} · {formatNaira(order.totalAmount)} total ·{" "}
          {formatNaira(remaining)} outstanding
        </p>
        <Input
          label="Amount (₦)"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          error={error}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">Method</span>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  method === m.value
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <Select
          label="Payment type"
          value={paymentType}
          onChange={(e) => {
            setPaymentType(e.target.value as PaymentType);
            setTypeTouched(true);
          }}
        >
          <option value="deposit">Deposit</option>
          <option value="final_payment">Final payment</option>
          <option value="full_payment">Full payment</option>
        </Select>
        <Input
          label="Reference"
          placeholder="Transfer reference, receipt no. (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <Input
          label="Notes"
          placeholder="Anything worth remembering (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
