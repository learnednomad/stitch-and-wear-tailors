/**
 * Notification Model - Push notifications and user preferences
 */

export type NotificationType =
  | "order_update"
  | "appointment_reminder"
  | "payment_due"
  | "measurement_required"
  | "fitting_scheduled"
  | "order_completed"
  | "promotional"
  | "system_maintenance"
  | "account_update"

export type NotificationPriority = "low" | "normal" | "high" | "urgent"
export type NotificationChannel = "app" | "email" | "sms" | "push"
export type NotificationStatus = "pending" | "sent" | "delivered" | "read" | "failed"

export interface NotificationAction {
  id: string
  label: string
  action: string
  url?: string
  destructive?: boolean
}

export interface NotificationData {
  orderId?: string
  appointmentId?: string
  invoiceId?: string
  userId?: string
  customData?: Record<string, any>
}

export interface NotificationTracking {
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  clickedAt?: string
  failureReason?: string
  retryCount: number
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  channel: NotificationChannel
  priority: NotificationPriority
  status: NotificationStatus
  title: string
  message: string
  imageUrl?: string
  actions: NotificationAction[]
  data: NotificationData
  tracking: NotificationTracking
  expiresAt?: string
  scheduledFor?: string
  batchId?: string
  read: boolean
  dismissed: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  channel: NotificationChannel
  priority?: NotificationPriority
  title: string
  message: string
  imageUrl?: string
  actions?: Omit<NotificationAction, "id">[]
  data?: NotificationData
  expiresAt?: string
  scheduledFor?: string
  batchId?: string
}

export interface UpdateNotificationInput {
  status?: NotificationStatus
  read?: boolean
  dismissed?: boolean
  tracking?: Partial<NotificationTracking>
}

export interface NotificationPreferences {
  userId: string
  channels: {
    [K in NotificationChannel]: boolean
  }
  types: {
    [K in NotificationType]: {
      enabled: boolean
      channels: NotificationChannel[]
      quietHours?: {
        start: string // HH:mm format
        end: string // HH:mm format
        timezone: string
      }
    }
  }
  globalMute: boolean
  muteUntil?: string
  updatedAt: string
}

export interface NotificationTemplate {
  id: string
  type: NotificationType
  name: string
  title: string
  message: string
  channels: NotificationChannel[]
  variables: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}
