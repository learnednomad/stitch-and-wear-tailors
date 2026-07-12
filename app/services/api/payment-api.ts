/**
 * Payment API Service
 *
 * Thin ServiceResult layer over the PocketBase `payments` collection for the
 * tailor side. Tailors record offline payments as status="confirmed" and
 * confirm/reject customer payment claims (status="pending_confirmation").
 * Server hooks recompute the order's depositAmount/balanceAmount/paymentStatus
 * and sync the invoice status — order money fields are never written here.
 */

import { ServiceResult } from "./base-api-service"
import { getPocketBaseAdapter, filters, COLLECTIONS } from "./pocketbase-api-adapter"

export type PaymentMethod = "cash" | "bank_transfer" | "pos" | "other"
export type PaymentType = "deposit" | "final_payment" | "full_payment" | "refund"

export interface PBPaymentRecord {
  id: string
  order: string
  user: string
  amount: number
  currency: string
  method: PaymentMethod
  status: string
  paymentType: PaymentType
  reference: string
  notes: string
  recordedBy: string
  confirmedAt: string
  receipt: string
  created: string
  updated: string
  expand?: {
    order?: Record<string, any>
    user?: Record<string, any>
    recordedBy?: Record<string, any>
  }
}

export interface RecordPaymentInput {
  orderId: string
  amount: number
  method: PaymentMethod
  paymentType: PaymentType
  currency?: string
  reference?: string
  notes?: string
}

export const paymentApi = {
  /**
   * Payment history for an order, newest first.
   */
  async listByOrder(orderId: string): Promise<ServiceResult<PBPaymentRecord[]>> {
    return getPocketBaseAdapter().fullList<PBPaymentRecord>(COLLECTIONS.PAYMENTS, {
      filter: filters.eq("order", orderId),
      sort: "-created",
    })
  },

  /**
   * Customer payment claims awaiting this tailor's confirmation.
   */
  async listPendingClaims(): Promise<ServiceResult<PBPaymentRecord[]>> {
    const adapter = getPocketBaseAdapter()
    return adapter.fullList<PBPaymentRecord>(COLLECTIONS.PAYMENTS, {
      filter: `order.tailor = {:id} && status = "pending_confirmation"`,
      params: { id: adapter.currentUserId },
      sort: "-created",
      expand: "order,user",
    })
  },

  /**
   * Record an offline payment the tailor received (cash, transfer, POS).
   * Created directly as confirmed with recordedBy = self and user = the
   * order's customer; server hooks then update the order and invoice.
   */
  async recordPayment(input: RecordPaymentInput): Promise<ServiceResult<PBPaymentRecord>> {
    const adapter = getPocketBaseAdapter()
    if (!adapter.currentUserId) {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "You must be logged in to record a payment",
      }
    }

    // The paying user is always the order's customer
    const orderResult = await adapter.getOne<any>(COLLECTIONS.ORDERS, input.orderId)
    if (!orderResult.success) return orderResult

    return adapter.create<PBPaymentRecord>(COLLECTIONS.PAYMENTS, {
      order: input.orderId,
      user: orderResult.data.customer,
      amount: input.amount,
      currency: input.currency ?? orderResult.data.currency ?? "NGN",
      method: input.method,
      status: "confirmed",
      paymentType: input.paymentType,
      recordedBy: adapter.currentUserId,
      confirmedAt: new Date().toISOString(),
      ...(input.reference ? { reference: input.reference } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    })
  },

  /**
   * Confirm a customer's pending payment claim.
   */
  async confirmClaim(paymentId: string): Promise<ServiceResult<PBPaymentRecord>> {
    return getPocketBaseAdapter().update<PBPaymentRecord>(COLLECTIONS.PAYMENTS, paymentId, {
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    })
  },

  /**
   * Reject a customer's pending payment claim.
   */
  async rejectClaim(paymentId: string): Promise<ServiceResult<PBPaymentRecord>> {
    return getPocketBaseAdapter().update<PBPaymentRecord>(COLLECTIONS.PAYMENTS, paymentId, {
      status: "rejected",
    })
  },
}

export type PaymentApi = typeof paymentApi
