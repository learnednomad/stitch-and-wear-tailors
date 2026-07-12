/**
 * Shared bits for the tailor invoicing screens (status chip styling,
 * date formatting, customer display names).
 */

import { colors } from "app/theme"
import { InvoiceStatus, PBInvoiceRecord } from "@/services/api/invoice-api"

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "void",
]

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  void: "Void",
}

/** background / text colors for the status chip */
export const STATUS_COLORS: Record<InvoiceStatus, { bg: string; text: string }> = {
  draft: { bg: colors.palette.neutral200, text: colors.palette.neutral700 },
  sent: { bg: colors.palette.primary100, text: colors.palette.primary700 },
  partially_paid: { bg: colors.palette.warning100, text: colors.palette.warning600 },
  paid: { bg: colors.palette.success100, text: colors.palette.success500 },
  void: { bg: colors.palette.neutral200, text: colors.palette.neutral400 },
}

/**
 * Short date like "12 Jul 2026" ("—" when blank).
 */
export function formatDate(iso?: string): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/**
 * Best-effort customer display name. Tailors usually cannot read customer
 * user records, so expand.customer is often empty — callers can supply a
 * fallback name map (customer id → name) built from order data.
 */
export function customerDisplayName(
  invoice: PBInvoiceRecord,
  nameMap?: Record<string, string>,
): string {
  return (
    invoice.expand?.customer?.name ||
    nameMap?.[invoice.customer] ||
    `Customer ${(invoice.customer ?? "").slice(0, 5)}`
  )
}
