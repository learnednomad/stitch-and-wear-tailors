import type {
  AppointmentStatus,
  InvoiceStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentStatus,
} from "@/lib/types";

/** Label + Tailwind classes (bg/text) for each status value. */
export interface StatusMeta {
  label: string;
  className: string;
}

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  accepted: { label: "Accepted", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  measuring: { label: "Measuring", className: "bg-sky-100 text-sky-800" },
  cutting: { label: "Cutting", className: "bg-indigo-100 text-indigo-800" },
  sewing: { label: "Sewing", className: "bg-violet-100 text-violet-800" },
  finishing: { label: "Finishing", className: "bg-fuchsia-100 text-fuchsia-800" },
  ready: { label: "Ready", className: "bg-emerald-100 text-emerald-800" },
  delivered: { label: "Delivered", className: "bg-emerald-600 text-white" },
  cancelled: { label: "Cancelled", className: "bg-neutral-200 text-neutral-600" },
};

export const ORDER_ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "measuring",
  "cutting",
  "sewing",
  "finishing",
  "ready",
];

export const INVOICE_STATUS: Record<InvoiceStatus, StatusMeta> = {
  draft: { label: "Draft", className: "bg-neutral-200 text-neutral-700" },
  sent: { label: "Sent", className: "bg-sky-100 text-sky-800" },
  partially_paid: { label: "Partially paid", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
  void: { label: "Void", className: "bg-red-100 text-red-700" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  pending_confirmation: {
    label: "Awaiting confirmation",
    className: "bg-amber-100 text-amber-800",
  },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

export const ORDER_PAYMENT_STATUS: Record<OrderPaymentStatus, StatusMeta> = {
  pending: { label: "Unpaid", className: "bg-amber-100 text-amber-800" },
  deposit_paid: { label: "Deposit paid", className: "bg-sky-100 text-sky-800" },
  fully_paid: { label: "Fully paid", className: "bg-emerald-100 text-emerald-800" },
  refunded: { label: "Refunded", className: "bg-neutral-200 text-neutral-600" },
};

export const APPOINTMENT_STATUS: Record<AppointmentStatus, StatusMeta> = {
  requested: { label: "Requested", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800" },
  completed: { label: "Completed", className: "bg-emerald-600 text-white" },
  cancelled: { label: "Cancelled", className: "bg-neutral-200 text-neutral-600" },
  rescheduled: { label: "Rescheduled", className: "bg-sky-100 text-sky-800" },
};

const FALLBACK: StatusMeta = { label: "Unknown", className: "bg-neutral-200 text-neutral-600" };

export type StatusKind = "order" | "invoice" | "payment" | "orderPayment" | "appointment";

export function statusMeta(kind: StatusKind, status: string): StatusMeta {
  const map: Record<StatusKind, Record<string, StatusMeta>> = {
    order: ORDER_STATUS,
    invoice: INVOICE_STATUS,
    payment: PAYMENT_STATUS,
    orderPayment: ORDER_PAYMENT_STATUS,
    appointment: APPOINTMENT_STATUS,
  };
  return map[kind][status] ?? { ...FALLBACK, label: status || FALLBACK.label };
}
