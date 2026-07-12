/**
 * Invoice API Service
 *
 * Thin ServiceResult layer over the PocketBase `invoices` collection for the
 * tailor side. Tailors create invoices (tailor = self) and may set status to
 * draft/sent/void only — transitions to partially_paid/paid happen server-side
 * when payments are recorded.
 */

import { ServiceResult } from "./base-api-service"
import { getPocketBaseAdapter, filters, COLLECTIONS } from "./pocketbase-api-adapter"

export interface InvoiceLineItem {
  description: string
  quantity: number
  amount: number
}

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "void"

export interface PBInvoiceRecord {
  id: string
  order: string
  customer: string
  tailor: string
  invoiceNumber: string
  lineItems: InvoiceLineItem[] | null
  subtotal: number
  depositRequired: number
  currency: string
  status: InvoiceStatus
  issuedAt: string
  dueAt: string
  notes: string
  created: string
  updated: string
  expand?: {
    order?: Record<string, any>
    customer?: Record<string, any>
    tailor?: Record<string, any>
  }
}

export interface CreateInvoiceInput {
  orderId: string
  customerId: string
  lineItems: InvoiceLineItem[]
  depositRequired: number
  currency?: string
  status?: "draft" | "sent"
  dueAt?: string
  notes?: string
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
}

/**
 * Format a money amount with its currency symbol (₦52,000).
 */
export function formatMoney(amount: number, currency: string = "NGN"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  return `${symbol}${(amount ?? 0).toLocaleString()}`
}

/**
 * Line items amounts are per-unit; a line total is quantity × amount.
 */
export function lineItemsSubtotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, item) => sum + (item.quantity || 0) * (item.amount || 0), 0)
}

export const invoiceApi = {
  /**
   * All invoices belonging to the current tailor, newest first.
   */
  async listByTailor(params?: {
    status?: InvoiceStatus
  }): Promise<ServiceResult<PBInvoiceRecord[]>> {
    const adapter = getPocketBaseAdapter()
    return adapter.fullList<PBInvoiceRecord>(COLLECTIONS.INVOICES, {
      filter: filters.and(
        filters.eq("tailor", adapter.currentUserId),
        params?.status ? filters.eq("status", params.status) : "",
      ),
      sort: "-created",
      expand: "order,customer",
    })
  },

  /**
   * Single invoice with its relations expanded.
   */
  async getOne(invoiceId: string): Promise<ServiceResult<PBInvoiceRecord>> {
    return getPocketBaseAdapter().getOne<PBInvoiceRecord>(
      COLLECTIONS.INVOICES,
      invoiceId,
      "order,customer,tailor",
    )
  },

  /**
   * Order ids that already carry a non-void invoice from this tailor
   * (used to exclude orders from the create-invoice picker).
   */
  async listInvoicedOrderIds(): Promise<ServiceResult<string[]>> {
    const adapter = getPocketBaseAdapter()
    const result = await adapter.fullList<PBInvoiceRecord>(COLLECTIONS.INVOICES, {
      filter: filters.and(
        filters.eq("tailor", adapter.currentUserId),
        filters.neq("status", "void"),
      ),
    })
    if (!result.success) return result
    return { success: true, data: [...new Set(result.data.map((inv) => inv.order))] }
  },

  /**
   * Derive the next invoice number (INV-<year>-<zero-padded seq>) from the
   * most recently created invoice. Sequence resets each year.
   */
  async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const result = await getPocketBaseAdapter().list<PBInvoiceRecord>(COLLECTIONS.INVOICES, {
      sort: "-created",
      perPage: 1,
    })
    let seq = 1
    if (result.success && result.data.items[0]) {
      const match = /^INV-(\d{4})-(\d+)$/.exec(result.data.items[0].invoiceNumber ?? "")
      if (match && Number(match[1]) === year) {
        seq = Number(match[2]) + 1
      }
    }
    return `INV-${year}-${String(seq).padStart(5, "0")}`
  },

  /**
   * Create an invoice for one of the tailor's orders. The subtotal is
   * computed from the line items; issuedAt is stamped now. On an
   * invoiceNumber uniqueness collision the create is retried once with a
   * random suffix-based number.
   */
  async create(input: CreateInvoiceInput): Promise<ServiceResult<PBInvoiceRecord>> {
    const adapter = getPocketBaseAdapter()
    if (!adapter.currentUserId) {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "You must be logged in to create an invoice",
      }
    }

    const buildBody = (invoiceNumber: string) => ({
      order: input.orderId,
      customer: input.customerId,
      tailor: adapter.currentUserId,
      invoiceNumber,
      lineItems: input.lineItems,
      subtotal: lineItemsSubtotal(input.lineItems),
      depositRequired: input.depositRequired,
      currency: input.currency ?? "NGN",
      status: input.status ?? "sent",
      issuedAt: new Date().toISOString(),
      ...(input.dueAt ? { dueAt: input.dueAt } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    })

    const invoiceNumber = await this.nextInvoiceNumber()
    const result = await adapter.create<PBInvoiceRecord>(
      COLLECTIONS.INVOICES,
      buildBody(invoiceNumber),
    )
    if (result.success) return result

    // Unique-constraint collision fallback: random 5-digit suffix
    if (result.message?.toLowerCase().includes("invoicenumber")) {
      const random = String(Math.floor(Math.random() * 90000) + 10000)
      return adapter.create<PBInvoiceRecord>(
        COLLECTIONS.INVOICES,
        buildBody(`INV-${new Date().getFullYear()}-${random}`),
      )
    }
    return result
  },

  /**
   * Client-settable status transitions only (draft | sent | void).
   */
  async updateStatus(
    invoiceId: string,
    status: "draft" | "sent" | "void",
  ): Promise<ServiceResult<PBInvoiceRecord>> {
    return getPocketBaseAdapter().update<PBInvoiceRecord>(COLLECTIONS.INVOICES, invoiceId, {
      status,
    })
  },
}

export type InvoiceApi = typeof invoiceApi
