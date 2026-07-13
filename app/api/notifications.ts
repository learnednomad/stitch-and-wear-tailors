/**
 * React Query hooks for notifications — the server-data replacement for the
 * former MST NotificationStore. Notifications are created by PocketBase server
 * hooks only; the client can list its own records, mark them read, and fold
 * realtime events into the cache.
 *
 * The PocketBase data layer lives in `@/services/api/notification-api`
 * (`notificationApi.*`). Everything roots at `["notifications"]` so a mutation
 * that invalidates that scope refreshes the list and any derived badge count.
 */
import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { notificationApi, PBNotification } from "@/services/api/notification-api"
import { subscribeToCollection, COLLECTIONS, pb } from "@/services/pocketbase/pocketbase-client"

import { unwrap } from "./common"

// ---------------------------------------------------------------------------
// Query-key factory
// ---------------------------------------------------------------------------

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => ["notifications", "list"] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * The current user's notifications, newest first. Backs the shared
 * NotificationList and the HomeScreen bell badge.
 */
export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => unwrap(notificationApi.listMine()),
  })
}

/** Unread count derived from a notifications list (replaces the MST view). */
export function unreadCountOf(notifications: PBNotification[] | undefined): number {
  return (notifications ?? []).filter((n) => !n.isRead).length
}

// ---------------------------------------------------------------------------
// Mutations — optimistic read-state updates, then reconcile with the server.
// ---------------------------------------------------------------------------

/** Mark a single notification read (optimistic, then server). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => unwrap(notificationApi.markRead(notificationId)),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() })
      const previous = queryClient.getQueryData<PBNotification[]>(notificationKeys.list())
      const readAt = new Date().toISOString()
      queryClient.setQueryData<PBNotification[]>(notificationKeys.list(), (old) =>
        (old ?? []).map((n) => (n.id === notificationId ? { ...n, isRead: true, readAt } : n)),
      )
      return { previous }
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.list() }),
  })
}

/** Mark every unread notification read (optimistic, then server). */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(notificationApi.markAllRead()),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() })
      const previous = queryClient.getQueryData<PBNotification[]>(notificationKeys.list())
      const readAt = new Date().toISOString()
      queryClient.setQueryData<PBNotification[]>(notificationKeys.list(), (old) =>
        (old ?? []).map((n) => (n.isRead ? n : { ...n, isRead: true, readAt })),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.list() }),
  })
}

// ---------------------------------------------------------------------------
// Realtime — replaces the MST `applyRealtimeNotification`. Subscribes to the
// PocketBase notifications collection while mounted and folds this user's
// create/update/delete events straight into the list cache.
// ---------------------------------------------------------------------------

export function useNotificationRealtime() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const currentUserId = pb.authStore.record?.id ?? ""
    if (!currentUserId) return
    const unsubscribe = subscribeToCollection(COLLECTIONS.NOTIFICATIONS, (event) => {
      const record = event.record as PBNotification | undefined
      if (!record || record.user !== currentUserId) return
      queryClient.setQueryData<PBNotification[]>(notificationKeys.list(), (old) => {
        const list = old ?? []
        if (event.action === "create") {
          return [record, ...list.filter((n) => n.id !== record.id)]
        }
        if (event.action === "update") {
          return list.map((n) => (n.id === record.id ? record : n))
        }
        if (event.action === "delete") {
          return list.filter((n) => n.id !== record.id)
        }
        return list
      })
    })
    return unsubscribe
  }, [queryClient])
}
