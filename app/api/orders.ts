/**
 * React Query hooks for order surfaces — the server-data half of the former
 * MST OrderStore. Client/wizard state lives in `@/state/orderDraftStore`.
 *
 * Query-key factory: everything roots at `["orders", ...]` so a mutation that
 * invalidates `["orders"]` refreshes every order query (client lists, the
 * tailor board, single-order details and statistics) in one call.
 *
 * The PocketBase data layer + Nigerian-domain mapper live in
 * `@/services/api/order-api` (`orderApi.*`, `mapPBOrderToDomain`) — these hooks
 * are a thin React Query wrapper over it.
 */
import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orderApi, domainStatusToPB } from "@/services/api/order-api"
import { COLLECTIONS } from "@/services/api/pocketbase-api-adapter"
import { realtimeManager } from "@/services/realtime/RealtimeManager"

import { ServiceError, unwrap } from "./common"

// ---------------------------------------------------------------------------
// Query-key factory
// ---------------------------------------------------------------------------

export interface ClientOrderFilters {
  status?: string
  priority?: string
  search?: string
}

export interface OrderStatisticsParams {
  customerId?: string
  tailorId?: string
}

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => ["orders", "list"] as const,
  clientList: (customerId: string, filters?: ClientOrderFilters) =>
    ["orders", "list", { customerId, ...(filters ?? {}) }] as const,
  detail: (orderId: string) => ["orders", "detail", orderId] as const,
  statistics: (params: OrderStatisticsParams) => ["orders", "statistics", params] as const,
}

// Retained for the existing tailor board callers.
export const tailorOrderKeys = {
  board: (tailorId: string) => ["orders", "list", { tailorId, board: "tailor" }] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Own orders + unassigned pending requests, merged and deduped (tailor
 * dashboard + pipeline board share this working set and cache entry). A
 * failure of the unassigned lookup is tolerated (matching the legacy
 * screens); a failure of the tailor's own orders throws so React Query owns
 * the error.
 */
export function useTailorBoardOrders(tailorId: string | undefined) {
  return useQuery({
    queryKey: tailorOrderKeys.board(tailorId ?? ""),
    queryFn: async () => {
      const [mineResult, unassignedResult] = await Promise.all([
        orderApi.fetchOrders({ tailorId: tailorId as string, perPage: 100 }),
        orderApi.fetchOrders({ unassigned: true, status: "pending", perPage: 50 }),
      ])
      if (!mineResult.success) {
        throw new ServiceError(mineResult.message ?? "Failed to load orders", mineResult.problem)
      }
      const merged = new Map<string, Record<string, any>>()
      for (const order of mineResult.data.orders) merged.set(order.id, order)
      for (const order of unassignedResult.success ? unassignedResult.data.orders : []) {
        merged.set(order.id, order)
      }
      return [...merged.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    },
    enabled: !!tailorId,
  })
}

/**
 * A client's orders (mapped domain snapshots), newest first. Backs the client
 * OrdersScreen / HomeScreen / OrderHistoryScreen lists. Derived views
 * (urgent / overdue / by-status) belong in a `select` or `useMemo` in the
 * consumer.
 */
export function useClientOrders(customerId: string | undefined, filters?: ClientOrderFilters) {
  return useQuery({
    queryKey: orderKeys.clientList(customerId ?? "", filters),
    queryFn: async () => {
      const result = await orderApi.fetchOrders({
        customerId: customerId as string,
        status: filters?.status,
        priority: filters?.priority,
        search: filters?.search,
        perPage: 100,
      })
      if (!result.success) {
        throw new ServiceError(result.message ?? "Failed to load orders", result.problem)
      }
      return result.data.orders
    },
    enabled: !!customerId,
  })
}

/**
 * A single order with its items and stage history, mapped to the domain.
 */
export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(orderId ?? ""),
    queryFn: () => unwrap(orderApi.fetchOrder(orderId as string)),
    enabled: !!orderId,
  })
}

export interface OrderStatistics {
  totalOrders: number
  pendingOrders: number
  inProgressOrders: number
  completedOrders: number
  revenue: number
  averageOrderValue: number
  ordersByGarmentType: Record<string, number>
  ordersByCity: Record<string, number>
  lastUpdated: string
}

/**
 * Derive counts + revenue from a user's orders (ported verbatim from the MST
 * `fetchOrderStatistics`). PB caps perPage at 500; one page is fetched and the
 * stats computed client-side from the mapped domain orders.
 */
export function computeOrderStatistics(orders: Record<string, any>[]): OrderStatistics {
  const totalOrders = orders.length
  const pendingOrders = orders.filter((o) => o.status === "pending").length
  const inProgressOrders = orders.filter((o) => o.status === "in_progress").length
  const completedOrders = orders.filter((o) => o.status === "delivered").length

  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + (o.pricing?.totalPrice || 0), 0)

  const averageOrderValue = totalOrders > 0 ? revenue / totalOrders : 0

  const ordersByGarmentType: Record<string, number> = {}
  const ordersByCity: Record<string, number> = {}
  for (const o of orders) {
    if (o.garmentType) {
      ordersByGarmentType[o.garmentType] = (ordersByGarmentType[o.garmentType] || 0) + 1
    }
    if (o.city) ordersByCity[o.city] = (ordersByCity[o.city] || 0) + 1
  }

  return {
    totalOrders,
    pendingOrders,
    inProgressOrders,
    completedOrders,
    revenue,
    averageOrderValue,
    ordersByGarmentType,
    ordersByCity,
    lastUpdated: new Date().toISOString(),
  }
}

export function useOrderStatistics(params: OrderStatisticsParams) {
  return useQuery({
    queryKey: orderKeys.statistics(params),
    queryFn: async () => {
      const result = await orderApi.fetchOrders({
        customerId: params.customerId,
        tailorId: params.tailorId,
        perPage: 500,
      })
      if (!result.success) {
        throw new ServiceError(result.message ?? "Failed to load statistics", result.problem)
      }
      return computeOrderStatistics(result.data.orders)
    },
    enabled: !!(params.customerId || params.tailorId),
  })
}

// ---------------------------------------------------------------------------
// Mutations — each invalidates the whole ["orders"] scope (and the specific
// detail entry where relevant) so lists/detail/stats refetch.
// ---------------------------------------------------------------------------

/**
 * Create an order from a domain draft snapshot (the built `draftOrder` from
 * `useOrderDraftStore`). Returns the created order mapped back to the domain
 * (including the server-generated orderNumber).
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draft: Record<string, any>) => unwrap(orderApi.createOrder(draft)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  })
}

/**
 * Update an order from domain-shaped fields (parity with the MST
 * `updateNigerianOrder` — translates status/notes/tailor/delivery into PB
 * fields before writing).
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, updates }: { orderId: string; updates: Record<string, any> }) => {
      const pbUpdates: Record<string, any> = {}
      if (updates.status) pbUpdates.status = domainStatusToPB(updates.status)
      if (updates.status === "cancelled" && (updates.notes || updates.internalNotes)) {
        pbUpdates.cancellationReason = updates.notes || updates.internalNotes
      }
      if (updates.notes !== undefined) pbUpdates.specialInstructions = updates.notes
      if (updates.internalNotes !== undefined) pbUpdates.internalNotes = updates.internalNotes
      if (updates.tailorId !== undefined) pbUpdates.tailor = updates.tailorId ?? ""
      if (updates.estimatedDeliveryDate) pbUpdates.estimatedDelivery = updates.estimatedDeliveryDate
      return unwrap(orderApi.updateOrder(orderId, pbUpdates))
    },
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

/**
 * Transition an order to a new status. Accepts a domain status (translated via
 * `domainStatusToPB`) or a raw PB status (passed through). Server hooks own the
 * stage records + timestamp stamping.
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      status,
      note,
    }: {
      orderId: string
      status: string
      note?: string
    }) => unwrap(orderApi.updateOrderStatus(orderId, domainStatusToPB(status), note)),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      unwrap(orderApi.cancelOrder(orderId, reason)),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => unwrap(orderApi.deleteOrder(orderId)),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.removeQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

// ---------------------------------------------------------------------------
// Realtime — replaces the MST `initializeRealtime`. Subscribes through the
// RealtimeManager (SSE + 20s poll fallback) and, on any event for this user's
// orders (as customer OR assigned tailor), invalidates the order cache so the
// affected list/detail queries refetch. The 20s poll fallback likewise nudges
// the cache while SSE is unavailable.
// ---------------------------------------------------------------------------

export function useOrderRealtime(userId: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!userId) return
    const unsubscribe = realtimeManager.subscribe(
      "orders",
      COLLECTIONS.ORDERS,
      (event) => {
        const record = event.record
        if (!record) return
        // Only react to this user's orders (as customer or assigned tailor)
        if (record.customer !== userId && record.tailor !== userId) return
        if (event.action === "delete") {
          queryClient.removeQueries({ queryKey: orderKeys.detail(record.id) })
        } else {
          queryClient.invalidateQueries({ queryKey: orderKeys.detail(record.id) })
        }
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
      },
      {
        // While SSE is down, refresh the order lists every 20s (the manager
        // owns the interval) so screens keep reasonably fresh data.
        fallbackPoll: async () => {
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
        },
      },
    )
    return unsubscribe
  }, [userId, queryClient])
}
