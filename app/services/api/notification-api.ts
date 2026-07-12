/**
 * Notification API Service
 *
 * PocketBase-backed notifications. Notifications are created by server
 * hooks only — the client can list its own records and mark them read.
 *
 * `notificationApi` is the primary surface used by NotificationStore and
 * the notification screens. `NotificationApiService` keeps the legacy
 * service-registry contract alive by delegating to the same PB calls and
 * rejecting the endpoints the backend doesn't model (push devices,
 * templates, bulk sends).
 */

import { BaseApiService, ServiceResult } from "./base-api-service"
import { INotificationApiService } from "./service-types"
import { CreateNotificationRequest, NotificationListParams, ApiResponse } from "./api.types"
import { getPocketBaseAdapter, filters, COLLECTIONS } from "./pocketbase-api-adapter"

/**
 * Raw PocketBase notification record.
 */
export interface PBNotification {
  id: string
  user: string
  type:
    | "order_update"
    | "new_message"
    | "payment_received"
    | "payment_claim"
    | "appointment"
    | "reminder"
    | "system"
  title: string
  body: string
  data: Record<string, any> | null
  isRead: boolean
  readAt: string
  created: string
  updated: string
}

function notSupported<T>(feature: string): ServiceResult<T> {
  return {
    success: false,
    problem: { kind: "rejected" },
    message: `${feature} is not supported by the PocketBase backend`,
  }
}

export const notificationApi = {
  /**
   * The current user's notifications, newest first.
   */
  async listMine(limit: number = 100): Promise<ServiceResult<PBNotification[]>> {
    const adapter = getPocketBaseAdapter()
    if (!adapter.currentUserId) {
      return { success: false, problem: { kind: "unauthorized" }, message: "Not logged in" }
    }
    const result = await adapter.list<PBNotification>(COLLECTIONS.NOTIFICATIONS, {
      filter: filters.eq("user", adapter.currentUserId),
      sort: "-created",
      perPage: limit,
    })
    if (!result.success) return result
    return { success: true, data: result.data.items }
  },

  /**
   * Count of unread notifications for the current user.
   */
  async unreadCount(): Promise<ServiceResult<number>> {
    const adapter = getPocketBaseAdapter()
    if (!adapter.currentUserId) {
      return { success: false, problem: { kind: "unauthorized" }, message: "Not logged in" }
    }
    const result = await adapter.list<PBNotification>(COLLECTIONS.NOTIFICATIONS, {
      filter: filters.and(
        filters.eq("user", adapter.currentUserId),
        filters.eq("isRead", false),
      ),
      perPage: 1,
    })
    if (!result.success) return result
    return { success: true, data: result.data.totalItems }
  },

  /**
   * Mark a single notification read.
   */
  async markRead(notificationId: string): Promise<ServiceResult<PBNotification>> {
    return getPocketBaseAdapter().update<PBNotification>(COLLECTIONS.NOTIFICATIONS, notificationId, {
      isRead: true,
      readAt: new Date().toISOString(),
    })
  },

  /**
   * Mark every unread notification for the current user read.
   */
  async markAllRead(): Promise<ServiceResult<void>> {
    const adapter = getPocketBaseAdapter()
    const unread = await adapter.fullList<PBNotification>(COLLECTIONS.NOTIFICATIONS, {
      filter: filters.and(
        filters.eq("user", adapter.currentUserId),
        filters.eq("isRead", false),
      ),
    })
    if (!unread.success) return unread
    const readAt = new Date().toISOString()
    const results = await Promise.all(
      unread.data.map((n) =>
        adapter.update(COLLECTIONS.NOTIFICATIONS, n.id, { isRead: true, readAt }),
      ),
    )
    const failed = results.find((r) => !r.success)
    if (failed && !failed.success) return failed
    return { success: true, data: undefined }
  },
}

export type NotificationApi = typeof notificationApi

/**
 * Legacy service-registry adapter over the PB notification calls.
 */
export class NotificationApiService extends BaseApiService implements INotificationApiService {
  private get adapter() {
    return getPocketBaseAdapter()
  }

  async ping(): Promise<ServiceResult<boolean>> {
    return this.adapter.testConnection()
  }

  getStatus() {
    return {
      serviceName: "notification",
      baseEndpoint: this.baseEndpoint,
      isAuthenticated: !!this.adapter.currentUserId,
      isConfigured: true,
    }
  }

  /**
   * Notification creation is server-hook-only.
   */
  async createNotification(_data: CreateNotificationRequest): Promise<ServiceResult<any>> {
    return notSupported("Client-side notification creation")
  }

  async getNotification(notificationId: string): Promise<ServiceResult<any>> {
    if (!notificationId) {
      return { success: false, problem: { kind: "rejected" }, message: "Notification ID is required" }
    }
    return this.adapter.getOne(COLLECTIONS.NOTIFICATIONS, notificationId)
  }

  /**
   * Only read-state updates are permitted by the collection rules.
   */
  async updateNotification(notificationId: string, updates: any): Promise<ServiceResult<any>> {
    if (!notificationId) {
      return { success: false, problem: { kind: "rejected" }, message: "Notification ID is required" }
    }
    return this.adapter.update(COLLECTIONS.NOTIFICATIONS, notificationId, updates)
  }

  async deleteNotification(notificationId: string): Promise<ServiceResult<void>> {
    if (!notificationId) {
      return { success: false, problem: { kind: "rejected" }, message: "Notification ID is required" }
    }
    return this.adapter.remove(COLLECTIONS.NOTIFICATIONS, notificationId)
  }

  async getNotifications(
    params?: NotificationListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    return this.getUserNotifications(this.adapter.currentUserId, params)
  }

  async getUserNotifications(
    userId: string,
    params?: NotificationListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (!userId) {
      return { success: false, problem: { kind: "rejected" }, message: "User ID is required" }
    }
    const result = await this.adapter.list<PBNotification>(COLLECTIONS.NOTIFICATIONS, {
      filter: filters.eq("user", userId),
      sort: "-created",
      page: params?.page ?? 1,
      perPage: params?.limit ?? 50,
    })
    if (!result.success) return result
    return {
      success: true,
      data: {
        success: true,
        data: result.data.items,
        meta: {
          page: result.data.page,
          totalPages: result.data.totalPages,
          totalItems: result.data.totalItems,
          hasMore: result.data.page < result.data.totalPages,
        },
      },
    }
  }

  async markAsRead(notificationId: string): Promise<ServiceResult<void>> {
    const result = await notificationApi.markRead(notificationId)
    if (!result.success) return result
    return { success: true, data: undefined }
  }

  async markAllAsRead(_userId: string): Promise<ServiceResult<void>> {
    return notificationApi.markAllRead()
  }

  // Preferences, devices, templates and bulk sends are not modelled in the
  // PocketBase backend yet — surface clear rejections.

  async getPreferences(_userId: string): Promise<ServiceResult<any>> {
    return notSupported("Notification preferences")
  }

  async updatePreferences(_userId: string, _preferences: any): Promise<ServiceResult<any>> {
    return notSupported("Notification preferences")
  }

  async registerDevice(
    _userId: string,
    _deviceToken: string,
    _platform: "ios" | "android",
  ): Promise<ServiceResult<void>> {
    return notSupported("Push device registration")
  }

  async unregisterDevice(_deviceToken: string): Promise<ServiceResult<void>> {
    return notSupported("Push device registration")
  }

  async sendPushNotification(_userId: string, _message: any): Promise<ServiceResult<void>> {
    return notSupported("Push notification sending")
  }

  async getTemplates(): Promise<ServiceResult<any[]>> {
    return notSupported("Notification templates")
  }

  async createTemplate(_templateData: any): Promise<ServiceResult<any>> {
    return notSupported("Notification templates")
  }

  async sendBulkNotifications(
    _notifications: CreateNotificationRequest[],
  ): Promise<ServiceResult<any[]>> {
    return notSupported("Bulk notification sending")
  }

  async deleteUserNotifications(_userId: string, _olderThan?: string): Promise<ServiceResult<void>> {
    return notSupported("Bulk notification deletion")
  }
}
