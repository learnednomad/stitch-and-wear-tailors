/**
 * Notification API Service
 *
 * Handles all notification-related API operations including push notifications,
 * email/SMS delivery, preferences management, and templates following Infinite Red patterns.
 */

import { BaseApiService, ServiceResult } from "./base-api-service"
import { INotificationApiService } from "./service-types"
import { CreateNotificationRequest, NotificationListParams, ApiResponse } from "./api.types"

/**
 * NotificationAPI Service Implementation
 *
 * Provides comprehensive notification management functionality:
 * - Notification CRUD operations
 * - Multi-channel delivery (push, email, SMS, in-app)
 * - Templates and preferences management
 * - Device registration and targeting
 */
export class NotificationApiService extends BaseApiService implements INotificationApiService {
  /**
   * Service health check
   */
  async ping(): Promise<ServiceResult<boolean>> {
    const result = await this.get<{ status: string }>("/health")
    if (result.success) {
      return { success: true, data: result.data.status === "ok" }
    }
    return { success: false, problem: result.problem, message: result.message }
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      serviceName: "notification",
      baseEndpoint: this.baseEndpoint,
      isAuthenticated: this.isAuthenticated(),
      isConfigured: !!this.api,
    }
  }

  /**
   * Create and send notification
   */
  async createNotification(
    notificationData: CreateNotificationRequest,
  ): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    // Validate required fields
    if (!notificationData.userId || !notificationData.type || !notificationData.priority) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID, type, and priority are required",
      }
    }

    if (!notificationData.title || !notificationData.body) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Title and body are required",
      }
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"]
    if (!validPriorities.includes(notificationData.priority)) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Priority must be one of: low, medium, high, urgent",
      }
    }

    return this.post<any>("/", notificationData)
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<ServiceResult<any>> {
    if (!notificationId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Notification ID is required",
      }
    }

    return this.getById<any>(notificationId)
  }

  /**
   * Update notification
   */
  async updateNotification(notificationId: string, updates: any): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!notificationId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Notification ID is required",
      }
    }

    return this.update<any>(notificationId, updates)
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!notificationId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Notification ID is required",
      }
    }

    return this.deleteById<void>(notificationId)
  }

  /**
   * Get notifications with filtering and pagination
   */
  async getNotifications(
    params?: NotificationListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    return this.getList<any>("/", params)
  }

  /**
   * Get notifications for a specific user
   */
  async getUserNotifications(
    userId: string,
    params?: NotificationListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (!userId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID is required",
      }
    }

    const searchParams = {
      ...params,
      userId,
    }

    return this.getList<any>("/", searchParams)
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!notificationId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Notification ID is required",
      }
    }

    return this.post<void>(`/${notificationId}/mark-read`)
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID is required",
      }
    }

    return this.post<void>(`/users/${userId}/mark-all-read`)
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID is required",
      }
    }

    return this.get<any>(`/users/${userId}/preferences`)
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, preferences: any): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId || !preferences) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID and preferences are required",
      }
    }

    return this.post<any>(`/users/${userId}/preferences`, preferences)
  }

  /**
   * Register device for push notifications
   */
  async registerDevice(
    userId: string,
    deviceToken: string,
    platform: "ios" | "android",
  ): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId || !deviceToken || !platform) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID, device token, and platform are required",
      }
    }

    const validPlatforms = ["ios", "android"]
    if (!validPlatforms.includes(platform)) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Platform must be 'ios' or 'android'",
      }
    }

    return this.post<void>("/devices/register", { userId, deviceToken, platform })
  }

  /**
   * Unregister device from push notifications
   */
  async unregisterDevice(deviceToken: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!deviceToken) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Device token is required",
      }
    }

    return this.post<void>("/devices/unregister", { deviceToken })
  }

  /**
   * Send push notification to specific user
   */
  async sendPushNotification(userId: string, message: any): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId || !message) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID and message are required",
      }
    }

    if (!message.title || !message.body) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Message title and body are required",
      }
    }

    return this.post<void>("/push/send", { userId, message })
  }

  /**
   * Get notification templates
   */
  async getTemplates(): Promise<ServiceResult<any[]>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<any[]>("/templates")
  }

  /**
   * Create notification template
   */
  async createTemplate(templateData: any): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!templateData.name || !templateData.type || !templateData.content) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Template name, type, and content are required",
      }
    }

    return this.post<any>("/templates", templateData)
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: CreateNotificationRequest[],
  ): Promise<ServiceResult<any[]>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!notifications || notifications.length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "At least one notification is required",
      }
    }

    // Validate each notification
    for (const notification of notifications) {
      if (!notification.userId || !notification.title || !notification.body) {
        return {
          success: false,
          problem: { kind: "rejected" },
          message: "Each notification must have userId, title, and body",
        }
      }
    }

    return this.post<any[]>("/bulk-send", { notifications })
  }

  /**
   * Delete old notifications for user
   */
  async deleteUserNotifications(userId: string, olderThan?: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID is required",
      }
    }

    const params = olderThan ? { olderThan } : undefined
    return this.delete<void>(`/users/${userId}/notifications`, params)
  }

  /**
   * Get notification delivery status
   */
  async getDeliveryStatus(notificationId: string): Promise<
    ServiceResult<{
      status: "pending" | "sent" | "delivered" | "failed"
      channels: Array<{
        type: "push" | "email" | "sms" | "in_app"
        status: "pending" | "sent" | "delivered" | "failed"
        sentAt?: string
        deliveredAt?: string
        error?: string
      }>
      attempts: number
      lastAttempt?: string
    }>
  > {
    if (!notificationId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Notification ID is required",
      }
    }

    return this.get<any>(`/${notificationId}/delivery-status`)
  }

  /**
   * Schedule notification for future delivery
   */
  async scheduleNotification(
    notificationData: CreateNotificationRequest & {
      scheduledFor: string
      timezone?: string
    },
  ): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!notificationData.scheduledFor) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Scheduled delivery time is required",
      }
    }

    return this.post<any>("/schedule", notificationData)
  }

  /**
   * Cancel scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!notificationId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Notification ID is required",
      }
    }

    return this.post<void>(`/${notificationId}/cancel-schedule`)
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(params?: {
    dateFrom?: string
    dateTo?: string
    type?: string
    userId?: string
  }): Promise<
    ServiceResult<{
      totalSent: number
      deliveryRate: number
      openRate: number
      clickRate: number
      channelPerformance: Record<
        string,
        {
          sent: number
          delivered: number
          opened: number
          clicked: number
        }
      >
      typeBreakdown: Record<string, number>
      userEngagement: {
        activeUsers: number
        averageNotificationsPerUser: number
        topEngagingUsers: any[]
      }
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<any>("/analytics", params)
  }

  /**
   * Test notification delivery
   */
  async testNotification(testData: {
    userId: string
    channels: Array<"push" | "email" | "sms" | "in_app">
    message: {
      title: string
      body: string
      actionText?: string
      actionUrl?: string
    }
  }): Promise<
    ServiceResult<{
      results: Array<{
        channel: string
        success: boolean
        error?: string
        deliveryTime?: number
      }>
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!testData.userId || !testData.channels || !testData.message) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID, channels, and message are required",
      }
    }

    return this.post<any>("/test", testData)
  }

  /**
   * Get user's notification history
   */
  async getUserNotificationHistory(
    userId: string,
    params?: {
      dateFrom?: string
      dateTo?: string
      type?: string
      isRead?: boolean
      page?: number
      limit?: number
    },
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (!userId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID is required",
      }
    }

    return this.getList<any>(`/users/${userId}/history`, params)
  }

  /**
   * Update notification channels configuration
   */
  async updateChannelConfiguration(config: {
    push?: {
      enabled: boolean
      provider: "fcm" | "apns"
      credentials: any
    }
    email?: {
      enabled: boolean
      provider: "smtp" | "sendgrid" | "mailgun"
      credentials: any
    }
    sms?: {
      enabled: boolean
      provider: "twilio" | "nexmo"
      credentials: any
    }
  }): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!config || Object.keys(config).length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "At least one channel configuration is required",
      }
    }

    return this.post<void>("/config/channels", config)
  }
}
