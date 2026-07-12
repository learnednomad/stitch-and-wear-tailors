/**
 * React Query hooks for the tailor order surfaces (dashboard + pipeline
 * board). Both screens show the same working set: the tailor's own orders
 * merged with unassigned pending requests, newest first — so they share one
 * query and one cache entry.
 */
import { useQuery } from "@tanstack/react-query"

import { orderApi } from "@/services/api/order-api"

import { ServiceError } from "./common"

export const tailorOrderKeys = {
  board: (tailorId: string) => ["orders", "list", { tailorId, board: "tailor" }] as const,
}

/**
 * Own orders + unassigned pending requests, merged and deduped. A failure
 * of the unassigned lookup is tolerated (matching the legacy screens); a
 * failure of the tailor's own orders throws so React Query owns the error.
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
