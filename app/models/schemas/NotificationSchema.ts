/**
 * Notification Model Zod Validation Schemas
 */

import { z } from "zod"

// Enums
export const NotificationTypeSchema = z.enum([
  "order_update",
  "appointment_reminder",
  "payment_due",
  "measurement_required",
  "fitting_scheduled",
  "order_completed",
  "promotional",
  "system_maintenance",
  "account_update",
])

export const NotificationPrioritySchema = z.enum(["low", "normal", "high", "urgent"])
export const NotificationChannelSchema = z.enum(["app", "email", "sms", "push"])
export const NotificationStatusSchema = z.enum(["pending", "sent", "delivered", "read", "failed"])

// Action schema
export const NotificationActionSchema = z.object({
  id: z.string().uuid("Invalid action ID format"),
  label: z.string().min(1, "Action label is required"),
  action: z.string().min(1, "Action is required"),
  url: z.string().url("Invalid URL").optional(),
  destructive: z.boolean().optional(),
})

// Data schema
export const NotificationDataSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format").optional(),
  appointmentId: z.string().uuid("Invalid appointment ID format").optional(),
  invoiceId: z.string().uuid("Invalid invoice ID format").optional(),
  userId: z.string().uuid("Invalid user ID format").optional(),
  customData: z.record(z.string(), z.any()).optional(),
})

// Tracking schema
export const NotificationTrackingSchema = z.object({
  sentAt: z.string().datetime("Invalid date format").optional(),
  deliveredAt: z.string().datetime("Invalid date format").optional(),
  readAt: z.string().datetime("Invalid date format").optional(),
  clickedAt: z.string().datetime("Invalid date format").optional(),
  failureReason: z.string().optional(),
  retryCount: z.number().int().min(0, "Retry count cannot be negative"),
})

// Main Notification schema
export const NotificationSchema = z.object({
  id: z.string().uuid("Invalid notification ID format"),
  userId: z.string().uuid("Invalid user ID format"),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  priority: NotificationPrioritySchema,
  status: NotificationStatusSchema,
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  message: z.string().min(1, "Message is required").max(500, "Message too long"),
  imageUrl: z.string().url("Invalid image URL").optional(),
  actions: z.array(NotificationActionSchema),
  data: NotificationDataSchema,
  tracking: NotificationTrackingSchema,
  expiresAt: z.string().datetime("Invalid date format").optional(),
  scheduledFor: z.string().datetime("Invalid date format").optional(),
  batchId: z.string().uuid("Invalid batch ID format").optional(),
  read: z.boolean(),
  dismissed: z.boolean(),
  createdAt: z.string().datetime("Invalid date format"),
  updatedAt: z.string().datetime("Invalid date format"),
})

// Input schemas
export const CreateNotificationInputSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  priority: NotificationPrioritySchema.optional(),
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  message: z.string().min(1, "Message is required").max(500, "Message too long"),
  imageUrl: z.string().url("Invalid image URL").optional(),
  actions: z.array(NotificationActionSchema.omit({ id: true })).optional(),
  data: NotificationDataSchema.optional(),
  expiresAt: z.string().datetime("Invalid date format").optional(),
  scheduledFor: z.string().datetime("Invalid date format").optional(),
  batchId: z.string().uuid("Invalid batch ID format").optional(),
})

export const UpdateNotificationInputSchema = z.object({
  status: NotificationStatusSchema.optional(),
  read: z.boolean().optional(),
  dismissed: z.boolean().optional(),
  tracking: NotificationTrackingSchema.partial().optional(),
})

// Preferences schema
export const NotificationPreferencesSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  channels: z.object({
    app: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }),
  types: z.record(
    NotificationTypeSchema,
    z.object({
      enabled: z.boolean(),
      channels: z.array(NotificationChannelSchema),
      quietHours: z
        .object({
          start: z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
          end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
          timezone: z.string().min(1, "Timezone is required"),
        })
        .optional(),
    }),
  ),
  globalMute: z.boolean(),
  muteUntil: z.string().datetime("Invalid date format").optional(),
  updatedAt: z.string().datetime("Invalid date format"),
})

// Template schema
export const NotificationTemplateSchema = z.object({
  id: z.string().uuid("Invalid template ID format"),
  type: NotificationTypeSchema,
  name: z.string().min(1, "Template name is required"),
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  message: z.string().min(1, "Message is required").max(500, "Message too long"),
  channels: z.array(NotificationChannelSchema),
  variables: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.string().datetime("Invalid date format"),
  updatedAt: z.string().datetime("Invalid date format"),
})

// Validation functions
export const validateNotification = (data: unknown) => NotificationSchema.parse(data)
export const validateCreateNotificationInput = (data: unknown) =>
  CreateNotificationInputSchema.parse(data)
export const validateUpdateNotificationInput = (data: unknown) =>
  UpdateNotificationInputSchema.parse(data)
export const validateNotificationPreferences = (data: unknown) =>
  NotificationPreferencesSchema.parse(data)
export const validateNotificationTemplate = (data: unknown) =>
  NotificationTemplateSchema.parse(data)

// Type inference
export type NotificationSchemaType = z.infer<typeof NotificationSchema>
export type CreateNotificationInputSchemaType = z.infer<typeof CreateNotificationInputSchema>
export type UpdateNotificationInputSchemaType = z.infer<typeof UpdateNotificationInputSchema>
export type NotificationPreferencesSchemaType = z.infer<typeof NotificationPreferencesSchema>
export type NotificationTemplateSchemaType = z.infer<typeof NotificationTemplateSchema>
