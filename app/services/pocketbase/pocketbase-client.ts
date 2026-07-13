/**
 * PocketBase Client
 *
 * Central client setup for the self-hosted PocketBase backend. Replaces the
 * old Appwrite client. Auth state persists to MMKV so sessions survive app
 * restarts; realtime uses SSE (native needs the react-native-sse polyfill,
 * web has EventSource built in).
 */

import { Platform } from "react-native"
import PocketBase, { AsyncAuthStore } from "pocketbase"
import Config from "../../config"
import * as storage from "../../utils/storage"

// PocketBase realtime relies on the global EventSource (SSE) API which
// React Native doesn't ship. Web provides it natively.
if (Platform.OS !== "web" && typeof (global as any).EventSource === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ;(global as any).EventSource = require("react-native-sse").default
}

const AUTH_STORAGE_KEY = "pb.auth"

/**
 * Auth store backed by MMKV (synchronous under the hood, async interface).
 */
const authStore = new AsyncAuthStore({
  save: async (serialized) => {
    storage.saveString(AUTH_STORAGE_KEY, serialized)
  },
  initial: storage.loadString(AUTH_STORAGE_KEY) ?? undefined,
  clear: async () => {
    storage.remove(AUTH_STORAGE_KEY)
  },
})

/**
 * Singleton PocketBase client.
 */
export const pb = new PocketBase(Config.PB_URL || "http://127.0.0.1:8090", authStore)

// Mobile clients don't need request auto-cancellation keyed by path (it
// cancels legitimate parallel list calls from different screens).
pb.autoCancellation(false)

/**
 * Collection names (single source of truth for the app).
 */
export const COLLECTIONS = {
  USERS: "users",
  ORDERS: "orders",
  ORDER_ITEMS: "order_items",
  ORDER_STAGES: "order_stages",
  MEASUREMENTS: "measurements",
  FABRICS: "fabrics",
  CATALOG_STYLES: "catalog_styles",
  MESSAGES: "messages",
  PAYMENTS: "payments",
  INVOICES: "invoices",
  APPOINTMENTS: "appointments",
  REVIEWS: "reviews",
  NOTIFICATIONS: "notifications",
  PRODUCTS: "products",
  MARKETPLACE_ORDERS: "marketplace_orders",
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]

/**
 * Build the URL for a file stored on a record's file field.
 */
export function fileUrl(
  record: { id: string; collectionId?: string; collectionName?: string },
  filename: string,
  thumb?: string,
): string {
  if (!filename) return ""
  return pb.files.getURL(record as any, filename, thumb ? { thumb } : undefined)
}

/**
 * Map a PocketBase ClientResponseError to a user-facing message.
 */
export function handlePocketBaseError(error: any): string {
  const status = error?.status ?? 0
  if (status === 0) return "Cannot reach the server. Check your connection."
  if (status === 400) {
    // surface the first field-level validation message when present
    const fields = error?.response?.data
    if (fields && typeof fields === "object") {
      const firstKey = Object.keys(fields)[0]
      const message = fields[firstKey]?.message
      if (message) return `${firstKey}: ${message}`
    }
    return error?.response?.message || "Invalid request."
  }
  if (status === 401) return "Authentication required. Please log in."
  if (status === 403) return "You do not have permission to perform this action."
  if (status === 404) return "The requested resource was not found."
  if (status === 429) return "Too many requests. Please try again shortly."
  if (status >= 500) return "Server error. Please try again later."
  return error?.message || "Something went wrong."
}

/**
 * Subscribe to realtime changes on a collection (or a single record by
 * passing recordId). Returns an unsubscribe function.
 *
 * Optional lifecycle hooks let callers (e.g. RealtimeManager) observe whether
 * the underlying SSE subscription was actually established or failed, without
 * changing the fire-and-forget default behavior.
 */
export function subscribeToCollection(
  collection: CollectionName,
  callback: (event: { action: string; record: any }) => void,
  options?: {
    recordId?: string
    filter?: string
    /** called once the SSE subscription is confirmed by the server */
    onEstablished?: () => void
    /** called when the SSE subscription could not be established */
    onError?: (error: any) => void
  },
): () => void {
  const topic = options?.recordId || "*"
  const subscribePromise = pb
    .collection(collection)
    .subscribe(topic, callback, options?.filter ? { filter: options.filter } : undefined)

  subscribePromise.then(
    () => options?.onEstablished?.(),
    (error) => options?.onError?.(error),
  )

  return () => {
    subscribePromise
      .then((unsubscribe) => unsubscribe())
      .catch(() => {
        // subscription never established — nothing to clean up
      })
  }
}
