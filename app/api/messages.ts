/**
 * React Query hooks for the in-order chat (OrderChatScreen).
 *
 * The realtime subscription stays in the screen; incoming create/update
 * events are folded into the cache with queryClient.setQueryData via the
 * helpers exported here, so the query cache remains the single source of
 * message state.
 */
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { messageApi, PBMessageRecord } from "@/services/api/message-api"
import { PBOrderItemRecord, PBOrderRecord } from "@/services/api/order-api"
import { COLLECTIONS, filters, getPocketBaseAdapter } from "@/services/api/pocketbase-api-adapter"

import { unwrap } from "./common"

export const messageKeys = {
  byOrder: (orderId: string) => ["messages", "list", { orderId }] as const,
}

export const chatOrderKeys = {
  detail: (orderId: string) =>
    ["orders", "detail", orderId, { expand: "customer,tailor" }] as const,
}

/** Raw PB order with both parties expanded (chat header / counterpart). */
export function useChatOrder(orderId: string) {
  return useQuery({
    queryKey: chatOrderKeys.detail(orderId),
    queryFn: () =>
      unwrap(
        getPocketBaseAdapter().getOne<PBOrderRecord>(
          COLLECTIONS.ORDERS,
          orderId,
          "customer,tailor",
        ),
      ),
    enabled: !!orderId,
  })
}

/** The order's messages, oldest first. */
export function useOrderMessages(orderId: string) {
  return useQuery({
    queryKey: messageKeys.byOrder(orderId),
    queryFn: async () => (await unwrap(messageApi.listByOrder(orderId))).items,
    enabled: !!orderId,
  })
}

/**
 * Customer display-name fallback from the first order_item's specifications
 * JSON (tailor viewers usually can't expand the customer user record).
 */
export function useChatCustomerFallbackName(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["messages", "detail", { orderId, fallbackName: true }] as const,
    queryFn: async () => {
      const item = await unwrap(
        getPocketBaseAdapter().getFirst<PBOrderItemRecord>(
          COLLECTIONS.ORDER_ITEMS,
          filters.eq("order", orderId),
        ),
      )
      const specs = item?.specifications
      const info = specs && typeof specs === "object" ? (specs as any).customerInfo : undefined
      return `${info?.firstName ?? ""} ${info?.lastName ?? ""}`.trim()
    },
    enabled: !!orderId && enabled,
  })
}

export function useSendMessage(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { recipientId: string; content: string }) =>
      unwrap(messageApi.send(orderId, variables.recipientId, variables.content)),
    onSuccess: (sent) => upsertMessage(queryClient, orderId, sent),
  })
}

/** Append a message to the cached list unless it's already there. */
export function upsertMessage(queryClient: QueryClient, orderId: string, record: PBMessageRecord) {
  queryClient.setQueryData<PBMessageRecord[]>(messageKeys.byOrder(orderId), (previous) => {
    if (!previous) return [record]
    return previous.some((m) => m.id === record.id) ? previous : [...previous, record]
  })
}

/** Fold a realtime update (e.g. a read receipt) into the cached list. */
export function mergeMessageUpdate(
  queryClient: QueryClient,
  orderId: string,
  record: PBMessageRecord,
) {
  queryClient.setQueryData<PBMessageRecord[]>(messageKeys.byOrder(orderId), (previous) =>
    previous?.map((m) => (m.id === record.id ? { ...m, ...record } : m)),
  )
}

/** Mark one incoming message read on the server and in the cache. */
export function markMessageRead(queryClient: QueryClient, orderId: string, messageId: string) {
  messageApi.markRead(messageId)
  queryClient.setQueryData<PBMessageRecord[]>(messageKeys.byOrder(orderId), (previous) =>
    previous?.map((m) => (m.id === messageId ? { ...m, isRead: true } : m)),
  )
}
