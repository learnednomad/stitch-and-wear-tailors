/**
 * NotificationStore - Push Notifications and Preferences Management
 * Manages push notifications, email notifications, preferences, and notification history
 */

import { types, flow, Instance, SnapshotOut } from "mobx-state-tree"
import { createAsyncAction, createCollectionModel, generateId, createTimestamp } from "../mst"
import { Notification, NotificationType, NotificationPriority } from "../types"
import { validateNotification } from "../schemas"

/**
 * MST model for notification preferences
 */
const NotificationPreferencesModel = types.model("NotificationPreferences", {
  userId: types.string,
  
  // Channel preferences
  pushEnabled: types.optional(types.boolean, true),
  emailEnabled: types.optional(types.boolean, true),
  smsEnabled: types.optional(types.boolean, false),
  inAppEnabled: types.optional(types.boolean, true),
  
  // Category preferences
  orderUpdates: types.optional(types.boolean, true),
  appointmentReminders: types.optional(types.boolean, true),
  measurementAlerts: types.optional(types.boolean, true),
  promotionalOffers: types.optional(types.boolean, false),
  systemAnnouncements: types.optional(types.boolean, true),
  feedbackRequests: types.optional(types.boolean, true),
  
  // Timing preferences
  quietHoursEnabled: types.optional(types.boolean, false),
  quietHoursStart: types.optional(types.string, "22:00"), // HH:mm format
  quietHoursEnd: types.optional(types.string, "08:00"),   // HH:mm format
  timezone: types.string,
  
  // Delivery preferences
  batchDelivery: types.optional(types.boolean, false),
  batchInterval: types.optional(types.number, 60), // minutes
  maxDailyNotifications: types.optional(types.number, 20),
  
  lastUpdated: types.string,
})

/**
 * MST model for notification template
 */
const NotificationTemplateModel = types.model("NotificationTemplate", {
  id: types.string,
  type: types.enumeration("NotificationType", [
    "order_update", "appointment_reminder", "measurement_alert", "promotional_offer",
    "system_announcement", "feedback_request", "payment_reminder", "delivery_notification"
  ]),
  channel: types.enumeration("Channel", ["push", "email", "sms", "in_app"]),
  
  // Template content
  title: types.string,
  body: types.string,
  actionText: types.maybeNull(types.string),
  actionUrl: types.maybeNull(types.string),
  
  // Personalization placeholders
  placeholders: types.array(types.string), // e.g., ["{clientName}", "{orderNumber}"]
  
  // Styling and media
  icon: types.maybeNull(types.string),
  image: types.maybeNull(types.string),
  color: types.maybeNull(types.string),
  sound: types.maybeNull(types.string),
  
  // Targeting
  targetRoles: types.array(types.enumeration("UserRole", ["client", "tailor", "admin"])),
  isActive: types.optional(types.boolean, true),
  
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * MST model for notification delivery status
 */
const DeliveryStatusModel = types.model("DeliveryStatus", {
  channel: types.enumeration("Channel", ["push", "email", "sms", "in_app"]),
  status: types.enumeration("Status", ["pending", "sent", "delivered", "failed", "read"]),
  sentAt: types.maybeNull(types.string),
  deliveredAt: types.maybeNull(types.string),
  readAt: types.maybeNull(types.string),
  errorMessage: types.maybeNull(types.string),
  attempts: types.optional(types.number, 0),
  maxAttempts: types.optional(types.number, 3),
})

/**
 * Main Notification model
 */
const NotificationModel = types.model("Notification", {
  id: types.string,
  userId: types.string,
  
  // Notification content
  type: types.enumeration("NotificationType", [
    "order_update", "appointment_reminder", "measurement_alert", "promotional_offer",
    "system_announcement", "feedback_request", "payment_reminder", "delivery_notification"
  ]),
  priority: types.enumeration("NotificationPriority", ["low", "medium", "high", "urgent"]),
  
  title: types.string,
  body: types.string,
  actionText: types.maybeNull(types.string),
  actionUrl: types.maybeNull(types.string),
  
  // Visual and interaction
  icon: types.maybeNull(types.string),
  image: types.maybeNull(types.string),
  color: types.maybeNull(types.string),
  sound: types.maybeNull(types.string),
  
  // Delivery tracking
  channels: types.array(types.enumeration("Channel", ["push", "email", "sms", "in_app"])),
  deliveryStatus: types.array(DeliveryStatusModel),
  
  // Scheduling
  scheduledFor: types.maybeNull(types.string), // ISO datetime
  expiresAt: types.maybeNull(types.string),    // ISO datetime
  
  // State tracking
  isRead: types.optional(types.boolean, false),
  readAt: types.maybeNull(types.string),
  isDismissed: types.optional(types.boolean, false),
  dismissedAt: types.maybeNull(types.string),
  
  // Interaction tracking
  isClicked: types.optional(types.boolean, false),
  clickedAt: types.maybeNull(types.string),
  clickCount: types.optional(types.number, 0),
  
  // Grouping and batching
  groupId: types.maybeNull(types.string),
  batchId: types.maybeNull(types.string),
  
  // Related data
  relatedEntityType: types.maybeNull(types.enumeration("EntityType", ["order", "appointment", "measurement", "user"])),
  relatedEntityId: types.maybeNull(types.string),
  metadata: types.map(types.union(types.string, types.number, types.boolean)),
  
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * Collection model for notifications
 */
const NotificationsCollectionModel = createCollectionModel("NotificationsCollection", NotificationModel)

/**
 * Collection model for templates
 */
const TemplatesCollectionModel = createCollectionModel("TemplatesCollection", NotificationTemplateModel)

/**
 * Main NotificationStore model
 */
export const NotificationStoreModel = types
  .model("NotificationStore", {
    // Notifications collection
    notifications: types.optional(NotificationsCollectionModel, {}),
    
    // Templates collection
    templates: types.optional(TemplatesCollectionModel, {}),
    
    // User preferences
    preferences: types.maybeNull(NotificationPreferencesModel),
    
    // Unread notifications state
    unreadCount: types.optional(types.number, 0),
    lastReadAt: types.maybeNull(types.string),
    
    // Push notification registration
    pushToken: types.maybeNull(types.string),
    pushTokenExpiry: types.maybeNull(types.string),
    isRegisteredForPush: types.optional(types.boolean, false),
    
    // Permission states
    permissions: types.model("NotificationPermissions", {
      push: types.optional(types.enumeration("PermissionStatus", ["granted", "denied", "default"]), "default"),
      email: types.optional(types.boolean, true),
      sms: types.optional(types.boolean, false),
    }),
    
    // Delivery queue (for batch processing)
    deliveryQueue: types.array(types.model("QueuedNotification", {
      notificationId: types.string,
      scheduledFor: types.string,
      channels: types.array(types.string),
      attempts: types.optional(types.number, 0),
    })),
    
    // Loading and error states
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),
    
    // Statistics
    statistics: types.model("NotificationStatistics", {
      totalSent: types.optional(types.number, 0),
      totalRead: types.optional(types.number, 0),
      totalClicked: types.optional(types.number, 0),
      readRate: types.optional(types.number, 0),
      clickRate: types.optional(types.number, 0),
      lastUpdated: types.maybeNull(types.string),
    }),
  })
  .actions(self => {
    // Helper actions
    const setLoading = (loading: boolean) => {
      self.isLoading = loading
    }

    const setError = (error: string | null) => {
      self.error = error
    }

    const clearError = () => {
      self.error = null
    }

    const setLastFetched = (timestamp: string) => {
      self.lastFetched = timestamp
    }

    return {
      setLoading,
      setError,
      clearError,
      setLastFetched,

      /**
       * Initialize user preferences
       */
      initializePreferences(userId: string) {
        self.preferences = NotificationPreferencesModel.create({
          userId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          lastUpdated: createTimestamp(),
        })
      },

      /**
       * Update notification preferences
       */
      updatePreferences(updates: Partial<typeof self.preferences>) {
        if (self.preferences) {
          Object.assign(self.preferences, updates, { lastUpdated: createTimestamp() })
        }
      },

      /**
       * Register for push notifications
       */
      registerPushToken(token: string, expiryDate?: string) {
        self.pushToken = token
        self.pushTokenExpiry = expiryDate || null
        self.isRegisteredForPush = true
        self.permissions.push = "granted"
      },

      /**
       * Update permission status
       */
      updatePermission(type: "push" | "email" | "sms", status: any) {
        if (type === "push") {
          self.permissions.push = status
          if (status !== "granted") {
            self.isRegisteredForPush = false
            self.pushToken = null
          }
        } else {
          self.permissions[type] = status === "granted"
        }
      },

      /**
       * Create new notification
       */
      createNotification(notificationData: {
        userId: string
        type: NotificationType
        priority: NotificationPriority
        title: string
        body: string
        channels?: string[]
        actionText?: string
        actionUrl?: string
        scheduledFor?: string
        relatedEntityType?: string
        relatedEntityId?: string
        metadata?: Record<string, any>
      }) {
        const notification = NotificationModel.create({
          id: generateId(),
          userId: notificationData.userId,
          type: notificationData.type,
          priority: notificationData.priority,
          title: notificationData.title,
          body: notificationData.body,
          actionText: notificationData.actionText || null,
          actionUrl: notificationData.actionUrl || null,
          icon: null,
          image: null,
          color: null,
          sound: null,
          channels: notificationData.channels || ["push", "in_app"],
          deliveryStatus: [],
          scheduledFor: notificationData.scheduledFor || null,
          expiresAt: null,
          isRead: false,
          readAt: null,
          isDismissed: false,
          dismissedAt: null,
          isClicked: false,
          clickedAt: null,
          clickCount: 0,
          groupId: null,
          batchId: null,
          relatedEntityType: notificationData.relatedEntityType as any || null,
          relatedEntityId: notificationData.relatedEntityId || null,
          metadata: notificationData.metadata || {},
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        })

        self.notifications.addItem(notification)
        
        // Update unread count if for current user
        if (notificationData.userId === self.preferences?.userId) {
          self.unreadCount += 1
        }

        return notification
      },

      /**
       * Mark notification as read
       */
      markAsRead(notificationId: string) {
        const notification = self.notifications.findById(notificationId)
        if (notification && !notification.isRead) {
          notification.isRead = true
          notification.readAt = createTimestamp()
          notification.updatedAt = createTimestamp()
          
          if (notification.userId === self.preferences?.userId) {
            self.unreadCount = Math.max(0, self.unreadCount - 1)
          }
        }
      },

      /**
       * Mark all notifications as read
       */
      markAllAsRead() {
        const userNotifications = self.notifications.items.filter(
          (n: any) => n.userId === self.preferences?.userId && !n.isRead
        )
        
        userNotifications.forEach((notification: any) => {
          notification.isRead = true
          notification.readAt = createTimestamp()
          notification.updatedAt = createTimestamp()
        })
        
        self.unreadCount = 0
        self.lastReadAt = createTimestamp()
      },

      /**
       * Dismiss notification
       */
      dismissNotification(notificationId: string) {
        const notification = self.notifications.findById(notificationId)
        if (notification) {
          notification.isDismissed = true
          notification.dismissedAt = createTimestamp()
          notification.updatedAt = createTimestamp()
          
          // Also mark as read if not already
          if (!notification.isRead) {
            self.markAsRead(notificationId)
          }
        }
      },

      /**
       * Track notification click
       */
      trackClick(notificationId: string) {
        const notification = self.notifications.findById(notificationId)
        if (notification) {
          notification.isClicked = true
          notification.clickedAt = createTimestamp()
          notification.clickCount += 1
          notification.updatedAt = createTimestamp()
          
          // Mark as read if not already
          if (!notification.isRead) {
            self.markAsRead(notificationId)
          }
        }
      },

      /**
       * Add to delivery queue
       */
      queueForDelivery(notificationId: string, channels: string[], scheduledFor?: string) {
        const existing = self.deliveryQueue.find(q => q.notificationId === notificationId)
        if (!existing) {
          self.deliveryQueue.push({
            notificationId,
            scheduledFor: scheduledFor || createTimestamp(),
            channels,
            attempts: 0,
          })
        }
      },

      /**
       * Remove from delivery queue
       */
      removeFromQueue(notificationId: string) {
        const index = self.deliveryQueue.findIndex(q => q.notificationId === notificationId)
        if (index !== -1) {
          self.deliveryQueue.splice(index, 1)
        }
      },

      /**
       * Update delivery status
       */
      updateDeliveryStatus(notificationId: string, channel: string, status: string, error?: string) {
        const notification = self.notifications.findById(notificationId)
        if (notification) {
          const existing = notification.deliveryStatus.find(ds => ds.channel === channel)
          if (existing) {
            existing.status = status as any
            if (status === "sent") existing.sentAt = createTimestamp()
            if (status === "delivered") existing.deliveredAt = createTimestamp()
            if (status === "failed") existing.errorMessage = error || null
            existing.attempts += 1
          } else {
            notification.deliveryStatus.push({
              channel: channel as any,
              status: status as any,
              sentAt: status === "sent" ? createTimestamp() : null,
              deliveredAt: status === "delivered" ? createTimestamp() : null,
              readAt: null,
              errorMessage: error || null,
              attempts: 1,
              maxAttempts: 3,
            })
          }
          notification.updatedAt = createTimestamp()
        }
      },

      /**
       * Clear old notifications
       */
      clearOldNotifications(daysOld: number = 30) {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
        const toRemove = self.notifications.items.filter((n: any) => {
          const createdDate = new Date(n.createdAt)
          return createdDate < cutoffDate && (n.isRead || n.isDismissed)
        })
        
        toRemove.forEach((notification: any) => {
          const index = self.notifications.items.indexOf(notification)
          if (index !== -1) {
            self.notifications.items.splice(index, 1)
          }
        })
      },

      /**
       * Update statistics
       */
      updateStatistics(stats: Partial<typeof self.statistics>) {
        Object.assign(self.statistics, stats, { lastUpdated: createTimestamp() })
      },
    }
  })
  .actions(self => {
    // Async actions
    const fetchNotifications = createAsyncAction(
      self,
      async (params: {
        userId?: string
        type?: NotificationType
        isRead?: boolean
        page?: number
        limit?: number
      } = {}) => {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) queryParams.set(key, value.toString())
        })

        const response = await fetch(`/api/notifications?${queryParams}`, {
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch notifications')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to load notifications" }
    )

    const sendNotification = createAsyncAction(
      self,
      async (notificationData: any) => {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationData),
        })
        
        if (!response.ok) {
          throw new Error('Failed to send notification')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to send notification" }
    )

    const updatePreferencesAPI = createAsyncAction(
      self,
      async (userId: string, preferences: any) => {
        const response = await fetch(`/api/users/${userId}/notification-preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        })
        
        if (!response.ok) {
          throw new Error('Failed to update preferences')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to update notification preferences" }
    )

    const registerPushAPI = createAsyncAction(
      self,
      async (userId: string, token: string) => {
        const response = await fetch(`/api/users/${userId}/push-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to register push token')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to register for push notifications" }
    )

    return {
      /**
       * Load notifications
       */
      loadNotifications: flow(function* (params: any = {}, reset: boolean = false) {
        try {
          const result = yield fetchNotifications(params)
          
          if (reset) {
            self.notifications.setItems(result.notifications)
          } else {
            self.notifications.addItems(result.notifications)
          }
          
          self.notifications.setHasMore(result.hasMore)
          self.unreadCount = result.unreadCount || 0
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Send notification
       */
      sendNotification: flow(function* (notificationData: any) {
        try {
          const result = yield sendNotification(notificationData)
          
          // Add to local store if successful
          if (result.notification) {
            const notification = NotificationModel.create(result.notification)
            self.notifications.addItem(notification)
          }
          
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Save preferences
       */
      savePreferences: flow(function* () {
        if (!self.preferences) return

        try {
          yield updatePreferencesAPI(self.preferences.userId, self.preferences)
        } catch (error) {
          throw error
        }
      }),

      /**
       * Register for push notifications
       */
      requestPushPermission: flow(function* (userId: string) {
        try {
          // Request permission (this would be platform-specific implementation)
          // For now, we'll simulate the flow
          
          // In a real implementation, this would use:
          // - React Native: PushNotificationIOS.requestPermissions() or firebase.messaging()
          // - Web: Notification.requestPermission()
          
          const permission = "granted" // Simulated permission
          self.updatePermission("push", permission)
          
          if (permission === "granted") {
            // Generate push token (simulated)
            const token = `push_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            yield registerPushAPI(userId, token)
            self.registerPushToken(token)
          }
          
          return permission
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load user preferences
       */
      loadPreferences: flow(function* (userId: string) {
        try {
          const response = yield fetch(`/api/users/${userId}/notification-preferences`)
          if (!response.ok) throw new Error('Failed to load preferences')
          
          const preferences = yield response.json()
          self.preferences = NotificationPreferencesModel.create({
            ...preferences,
            userId,
          })
        } catch (error) {
          // Initialize default preferences on error
          self.initializePreferences(userId)
        }
      }),

      /**
       * Send order update notification
       */
      sendOrderUpdateNotification: flow(function* (orderId: string, userId: string, status: string) {
        const notificationData = {
          userId,
          type: "order_update" as NotificationType,
          priority: "medium" as NotificationPriority,
          title: "Order Update",
          body: `Your order has been updated to: ${status}`,
          actionText: "View Order",
          actionUrl: `/orders/${orderId}`,
          relatedEntityType: "order",
          relatedEntityId: orderId,
        }
        
        try {
          return yield self.sendNotification(notificationData)
        } catch (error) {
          throw error
        }
      }),

      /**
       * Send appointment reminder
       */
      sendAppointmentReminder: flow(function* (appointmentId: string, userId: string, appointmentDate: string) {
        const notificationData = {
          userId,
          type: "appointment_reminder" as NotificationType,
          priority: "high" as NotificationPriority,
          title: "Appointment Reminder",
          body: `You have an appointment scheduled for ${new Date(appointmentDate).toLocaleString()}`,
          actionText: "View Appointment",
          actionUrl: `/appointments/${appointmentId}`,
          relatedEntityType: "appointment",
          relatedEntityId: appointmentId,
        }
        
        try {
          return yield self.sendNotification(notificationData)
        } catch (error) {
          throw error
        }
      }),
    }
  })
  .views(self => ({
    /**
     * Get unread notifications
     */
    get unreadNotifications() {
      return self.notifications.filter((n: any) => 
        n.userId === self.preferences?.userId && !n.isRead
      )
    },

    /**
     * Get notifications by type
     */
    getNotificationsByType(type: NotificationType) {
      return self.notifications.filter((n: any) => n.type === type)
    },

    /**
     * Get recent notifications (last 7 days)
     */
    get recentNotifications() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return self.notifications.filter((n: any) => {
        const createdDate = new Date(n.createdAt)
        return createdDate >= sevenDaysAgo && n.userId === self.preferences?.userId
      })
    },

    /**
     * Get pending delivery notifications
     */
    get pendingDeliveries() {
      const now = new Date()
      return self.deliveryQueue.filter(q => {
        const scheduledTime = new Date(q.scheduledFor)
        return scheduledTime <= now && q.attempts < 3
      })
    },

    /**
     * Check if notifications are enabled for type
     */
    isTypeEnabled(type: NotificationType) {
      if (!self.preferences) return true
      
      switch (type) {
        case "order_update":
          return self.preferences.orderUpdates
        case "appointment_reminder":
          return self.preferences.appointmentReminders
        case "measurement_alert":
          return self.preferences.measurementAlerts
        case "promotional_offer":
          return self.preferences.promotionalOffers
        case "system_announcement":
          return self.preferences.systemAnnouncements
        case "feedback_request":
          return self.preferences.feedbackRequests
        default:
          return true
      }
    },

    /**
     * Check if in quiet hours
     */
    get isInQuietHours() {
      if (!self.preferences?.quietHoursEnabled) return false
      
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      const startTime = self.preferences.quietHoursStart
      const endTime = self.preferences.quietHoursEnd
      
      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime
      } else {
        return currentTime >= startTime && currentTime <= endTime
      }
    },

    /**
     * Get notification read rate
     */
    get readRate() {
      const userNotifications = self.notifications.items.filter(
        (n: any) => n.userId === self.preferences?.userId
      )
      if (userNotifications.length === 0) return 0
      
      const readCount = userNotifications.filter((n: any) => n.isRead).length
      return (readCount / userNotifications.length) * 100
    },

    /**
     * Get notification click rate
     */
    get clickRate() {
      const userNotifications = self.notifications.items.filter(
        (n: any) => n.userId === self.preferences?.userId
      )
      if (userNotifications.length === 0) return 0
      
      const clickedCount = userNotifications.filter((n: any) => n.isClicked).length
      return (clickedCount / userNotifications.length) * 100
    },

    /**
     * Check if data is stale
     */
    get isStale() {
      if (!self.lastFetched) return true
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return new Date(self.lastFetched).getTime() < fiveMinutesAgo
    },
  }))

/**
 * Type definitions for NotificationStore
 */
export interface NotificationStore extends Instance<typeof NotificationStoreModel> {}
export interface NotificationStoreSnapshot extends SnapshotOut<typeof NotificationStoreModel> {}