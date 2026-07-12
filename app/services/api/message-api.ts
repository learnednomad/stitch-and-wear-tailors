/**
 * Message API Service
 *
 * Order-scoped chat messages on top of PocketBase. Collection rules enforce
 * that only the sender/recipient can read a message, that creates set
 * sender = self and require the sender to be a party to the order, and that
 * only the recipient can update (mark read). A server hook creates an in-app
 * notification for the recipient on every new message.
 */

import { getPocketBaseAdapter, filters, COLLECTIONS, ListResult } from "./pocketbase-api-adapter"
import { ServiceResult } from "./base-api-service"

/**
 * Raw PocketBase message record.
 */
export interface PBMessageRecord {
  id: string
  order: string
  sender: string
  recipient: string
  messageType: "text" | "image" | "voice_note" | "system"
  content: string
  attachment?: string
  isRead: boolean
  readAt?: string
  created: string
  updated: string
  expand?: {
    sender?: Record<string, any>
  }
}

export interface ListMessagesParams {
  page?: number
  perPage?: number
}

export const messageApi = {
  /**
   * Messages for an order, oldest first (chat order), with the sender
   * relation expanded.
   */
  async listByOrder(
    orderId: string,
    params: ListMessagesParams = {},
  ): Promise<ServiceResult<ListResult<PBMessageRecord>>> {
    const adapter = getPocketBaseAdapter()
    return adapter.list<PBMessageRecord>(COLLECTIONS.MESSAGES, {
      filter: filters.eq("order", orderId),
      sort: "created",
      expand: "sender",
      page: params.page ?? 1,
      perPage: params.perPage ?? 100,
    })
  },

  /**
   * Send a text message on an order. The server rule requires sender = self,
   * so the current user id is set explicitly.
   */
  async send(
    orderId: string,
    recipientId: string,
    content: string,
  ): Promise<ServiceResult<PBMessageRecord>> {
    const adapter = getPocketBaseAdapter()
    if (!adapter.currentUserId) {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "You must be logged in to send a message",
      }
    }
    return adapter.create<PBMessageRecord>(COLLECTIONS.MESSAGES, {
      order: orderId,
      sender: adapter.currentUserId,
      recipient: recipientId,
      messageType: "text",
      content,
      isRead: false,
    })
  },

  /**
   * Mark a received message as read (server rule: recipient only).
   */
  async markRead(messageId: string): Promise<ServiceResult<PBMessageRecord>> {
    const adapter = getPocketBaseAdapter()
    return adapter.update<PBMessageRecord>(COLLECTIONS.MESSAGES, messageId, {
      isRead: true,
      readAt: new Date().toISOString(),
    })
  },

  /**
   * Number of unread incoming messages on one order for the current user.
   */
  async unreadCountForOrder(orderId: string): Promise<ServiceResult<number>> {
    return unreadCount(filters.eq("order", orderId))
  },

  /**
   * Total unread incoming messages across all orders for the current user.
   */
  async unreadTotal(): Promise<ServiceResult<number>> {
    return unreadCount()
  },
}

/**
 * Shared unread counter: recipient = self && isRead = false (+ extra clause).
 * Uses a perPage-1 list purely for its totalItems.
 */
async function unreadCount(extraFilter?: string): Promise<ServiceResult<number>> {
  const adapter = getPocketBaseAdapter()
  if (!adapter.currentUserId) return { success: true, data: 0 }

  const result = await adapter.list<PBMessageRecord>(COLLECTIONS.MESSAGES, {
    filter: filters.and(
      extraFilter,
      filters.eq("recipient", adapter.currentUserId),
      filters.eq("isRead", false),
    ),
    perPage: 1,
  })
  if (!result.success) return result
  return { success: true, data: result.data.totalItems }
}

export type MessageApi = typeof messageApi
