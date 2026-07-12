/**
 * Client Payment API Service
 *
 * Client-side payment calls over PocketBase: invoice lookups, own payment
 * history, and "I've paid" claims (payments created with
 * status="pending_confirmation" — a server hook notifies the tailor, who
 * confirms or rejects). Tailor-side payment operations live elsewhere.
 */

import { getPocketBaseAdapter, filters, COLLECTIONS } from "./pocketbase-api-adapter"
import { ServiceResult } from "./base-api-service"

/**
 * Raw PocketBase record shapes.
 */
export interface PBInvoice {
  id: string
  order: string
  customer: string
  tailor: string
  invoiceNumber: string
  lineItems: Array<{ description: string; quantity: number; amount: number }> | null
  subtotal: number
  depositRequired: number
  currency: string
  status: "draft" | "sent" | "partially_paid" | "paid" | "void"
  issuedAt: string
  dueAt: string
  notes: string
  created: string
  updated: string
}

export interface PBPayment {
  id: string
  order: string
  user: string
  amount: number
  currency: string
  method: "cash" | "bank_transfer" | "pos" | "other"
  status: "pending_confirmation" | "confirmed" | "rejected"
  paymentType: "deposit" | "final_payment" | "full_payment" | "refund"
  reference: string
  notes: string
  recordedBy: string
  confirmedAt: string
  receipt: string
  created: string
  updated: string
}

export interface CreatePaymentClaimInput {
  orderId: string
  amount: number
  method: PBPayment["method"]
  paymentType: PBPayment["paymentType"]
  reference?: string
  notes?: string
}

export const clientPaymentApi = {
  /**
   * Invoices for a set of orders, keyed by order id (avoids an N+1 when
   * rendering the outstanding list).
   */
  async fetchInvoicesByOrders(
    orderIds: string[],
  ): Promise<ServiceResult<Record<string, PBInvoice>>> {
    if (orderIds.length === 0) return { success: true, data: {} }
    const result = await getPocketBaseAdapter().fullList<PBInvoice>(COLLECTIONS.INVOICES, {
      filter: filters.in("order", orderIds),
      sort: "-created",
    })
    if (!result.success) return result
    const byOrder: Record<string, PBInvoice> = {}
    for (const invoice of result.data) {
      // newest first — keep the first invoice seen per order
      if (!byOrder[invoice.order]) byOrder[invoice.order] = invoice
    }
    return { success: true, data: byOrder }
  },

  /**
   * The current user's payments, newest first.
   */
  async fetchMyPayments(): Promise<ServiceResult<PBPayment[]>> {
    const adapter = getPocketBaseAdapter()
    if (!adapter.currentUserId) {
      return { success: false, problem: { kind: "unauthorized" }, message: "Not logged in" }
    }
    return adapter.fullList<PBPayment>(COLLECTIONS.PAYMENTS, {
      filter: filters.eq("user", adapter.currentUserId),
      sort: "-created",
    })
  },

  /**
   * Record an "I've paid" claim. Clients may only create payments with
   * status="pending_confirmation" — the tailor confirms receipt.
   */
  async createPaymentClaim(input: CreatePaymentClaimInput): Promise<ServiceResult<PBPayment>> {
    const adapter = getPocketBaseAdapter()
    if (!adapter.currentUserId) {
      return { success: false, problem: { kind: "unauthorized" }, message: "Not logged in" }
    }
    return adapter.create<PBPayment>(COLLECTIONS.PAYMENTS, {
      order: input.orderId,
      user: adapter.currentUserId,
      amount: input.amount,
      currency: "NGN",
      method: input.method,
      status: "pending_confirmation",
      paymentType: input.paymentType,
      reference: input.reference ?? "",
      notes: input.notes ?? "",
    })
  },
}

export type ClientPaymentApi = typeof clientPaymentApi
