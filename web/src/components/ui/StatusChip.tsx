import { statusMeta, type StatusKind } from "@/lib/status";

export interface StatusChipProps {
  kind: StatusKind;
  status: string;
  className?: string;
}

/** Colored pill for an order/invoice/payment/appointment status value. */
export function StatusChip({ kind, status, className = "" }: StatusChipProps) {
  const meta = statusMeta(kind, status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  );
}
