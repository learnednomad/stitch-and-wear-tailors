/**
 * React Query hooks for the tailor invoicing surface: invoices, pending
 * payment claims, per-order payments, and the order_items fallback used to
 * resolve customer display names (tailors usually can't read customer user
 * records, so expand.customer is often empty).
 *
 * Claim confirm/reject and payment recording change order balances and
 * invoice statuses server-side, so those mutations invalidate the invoice,
 * payment and order scopes together.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { CreateInvoiceInput, invoiceApi, InvoiceStatus } from "@/services/api/invoice-api"
import { paymentApi } from "@/services/api/payment-api"
import { COLLECTIONS, filters, getPocketBaseAdapter } from "@/services/api/pocketbase-api-adapter"

import { unwrap } from "./common"

export const invoiceKeys = {
  all: ["invoices"] as const,
  list: () => ["invoices", "list"] as const,
  detail: (invoiceId: string) => ["invoices", "detail", invoiceId] as const,
  orderItems: (orderIds: string[]) => ["invoices", "order-items", orderIds] as const,
}

export const paymentKeys = {
  all: ["payments"] as const,
  pendingClaims: () => ["payments", "claims", "pending"] as const,
  byOrder: (orderId: string) => ["payments", "by-order", orderId] as const,
}

export const orderKeys = {
  all: ["orders"] as const,
  detail: (orderId: string) => ["orders", "detail", orderId] as const,
}

export function useTailorInvoices() {
  return useQuery({
    queryKey: invoiceKeys.list(),
    queryFn: () => unwrap(invoiceApi.listByTailor()),
  })
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(invoiceId),
    queryFn: () => unwrap(invoiceApi.getOne(invoiceId)),
    enabled: !!invoiceId,
  })
}

export function usePendingClaims() {
  return useQuery({
    queryKey: paymentKeys.pendingClaims(),
    queryFn: () => unwrap(paymentApi.listPendingClaims()),
  })
}

/**
 * Payments recorded against an order (invoice payment history).
 */
export function usePaymentsByOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.byOrder(orderId ?? ""),
    queryFn: () => unwrap(paymentApi.listByOrder(orderId as string)),
    enabled: !!orderId,
  })
}

/**
 * Fresh order record (money fields: totalAmount / balanceAmount).
 */
export function useInvoiceOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(orderId ?? ""),
    queryFn: () =>
      unwrap(
        getPocketBaseAdapter().getOne<Record<string, any>>(COLLECTIONS.ORDERS, orderId as string),
      ),
    enabled: !!orderId,
  })
}

/**
 * order_items for a set of orders — dependent query for the customer-name
 * fallback (specifications JSON carries customerInfo). Enabled only when
 * there are order ids to resolve, i.e. some loaded invoices lack
 * expand.customer names.
 */
export function useOrderItemsForOrders(orderIds: string[]) {
  return useQuery({
    queryKey: invoiceKeys.orderItems(orderIds),
    queryFn: () =>
      unwrap(
        getPocketBaseAdapter().fullList<{ order: string; specifications?: unknown }>(
          COLLECTIONS.ORDER_ITEMS,
          { filter: filters.in("order", orderIds), sort: "created" },
        ),
      ),
    enabled: orderIds.length > 0,
  })
}

/**
 * The tailor's active orders that don't already carry a non-void invoice
 * (CreateInvoiceScreen's order picker). A failed invoiced-ids lookup is
 * tolerated (treated as "nothing invoiced yet"), matching the legacy screen.
 */
export function useUninvoicedOrders() {
  return useQuery({
    queryKey: ["orders", "list", { uninvoiced: true }] as const,
    queryFn: async () => {
      const adapter = getPocketBaseAdapter()
      const [orders, invoicedResult] = await Promise.all([
        unwrap(
          adapter.fullList<Record<string, any>>(COLLECTIONS.ORDERS, {
            filter: filters.eq("tailor", adapter.currentUserId),
            sort: "-created",
          }),
        ),
        invoiceApi.listInvoicedOrderIds(),
      ])
      const invoiced = new Set(invoicedResult.success ? invoicedResult.data : [])
      return orders.filter(
        (o) => !invoiced.has(o.id) && !["cancelled", "rejected"].includes(o.status),
      )
    },
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => unwrap(invoiceApi.create(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      // an order with a new invoice leaves the uninvoiced-orders picker
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: {
      invoiceId: string
      status: Extract<InvoiceStatus, "draft" | "sent" | "void">
    }) => unwrap(invoiceApi.updateStatus(variables.invoiceId, variables.status)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      // voiding an invoice returns its order to the uninvoiced-orders picker
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

/** Confirming/rejecting a claim also moves order balances and invoice status server-side. */
function useClaimMutation(
  action: (paymentId: string) => ReturnType<typeof paymentApi.confirmClaim>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => unwrap(action(paymentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useConfirmClaim() {
  return useClaimMutation((paymentId) => paymentApi.confirmClaim(paymentId))
}

export function useRejectClaim() {
  return useClaimMutation((paymentId) => paymentApi.rejectClaim(paymentId))
}
