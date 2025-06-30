/**
 * Appointment Model Zod Validation Schemas
 */

import { z } from 'zod'

// Enums
export const AppointmentTypeSchema = z.enum(['consultation', 'measurement', 'fitting', 'delivery', 'alteration', 'design_review'])
export const AppointmentStatusSchema = z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'])
export const ReminderTypeSchema = z.enum(['email', 'sms', 'push', 'call'])

// Reminder schema
export const AppointmentReminderSchema = z.object({
  type: ReminderTypeSchema,
  timeBeforeMinutes: z.number().int().positive('Time before must be positive'),
  sent: z.boolean(),
  sentAt: z.string().datetime('Invalid date format').optional(),
})

// Location schema
export const AppointmentLocationSchema = z.object({
  type: z.enum(['shop', 'client_home', 'virtual']),
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
    country: z.string().min(1, 'Country is required'),
  }).optional(),
  meetingLink: z.string().url('Invalid meeting link').optional(),
  instructions: z.string().optional(),
})

// Services schema
export const AppointmentServicesSchema = z.object({
  primaryService: AppointmentTypeSchema,
  additionalServices: z.array(AppointmentTypeSchema),
  estimatedDuration: z.number().int().positive('Duration must be positive'),
  requirements: z.array(z.string()),
  notes: z.string().optional(),
})

// Preparation schema
export const AppointmentPreparationSchema = z.object({
  clientInstructions: z.array(z.string()),
  tailorInstructions: z.array(z.string()),
  materialsNeeded: z.array(z.string()),
})

// Outcome schema
export const AppointmentOutcomeSchema = z.object({
  completed: z.boolean(),
  nextSteps: z.array(z.string()),
  followUpRequired: z.boolean(),
  followUpDate: z.string().datetime('Invalid date format').optional(),
  issues: z.array(z.string()).optional(),
})

// Main Appointment schema
export const AppointmentSchema = z.object({
  id: z.string().uuid('Invalid appointment ID format'),
  clientId: z.string().uuid('Invalid client ID format'),
  tailorId: z.string().uuid('Invalid tailor ID format'),
  orderId: z.string().uuid('Invalid order ID format').optional(),
  type: AppointmentTypeSchema,
  status: AppointmentStatusSchema,
  services: AppointmentServicesSchema,
  scheduledAt: z.string().datetime('Invalid date format'),
  startTime: z.string().datetime('Invalid date format'),
  endTime: z.string().datetime('Invalid date format'),
  actualStartTime: z.string().datetime('Invalid date format').optional(),
  actualEndTime: z.string().datetime('Invalid date format').optional(),
  location: AppointmentLocationSchema,
  reminders: z.array(AppointmentReminderSchema),
  notes: z.string().optional(),
  clientNotes: z.string().optional(),
  tailorNotes: z.string().optional(),
  preparation: AppointmentPreparationSchema,
  outcome: AppointmentOutcomeSchema.optional(),
  cancellationReason: z.string().optional(),
  rescheduledFrom: z.string().datetime('Invalid date format').optional(),
  rescheduledTo: z.string().datetime('Invalid date format').optional(),
  createdAt: z.string().datetime('Invalid date format'),
  updatedAt: z.string().datetime('Invalid date format'),
})

// Input schemas
export const CreateAppointmentInputSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  tailorId: z.string().uuid('Invalid tailor ID format'),
  orderId: z.string().uuid('Invalid order ID format').optional(),
  type: AppointmentTypeSchema,
  services: AppointmentServicesSchema.omit({ estimatedDuration: true }),
  scheduledAt: z.string().datetime('Invalid date format'),
  startTime: z.string().datetime('Invalid date format'),
  endTime: z.string().datetime('Invalid date format'),
  location: AppointmentLocationSchema,
  reminders: z.array(AppointmentReminderSchema.omit({ sent: true, sentAt: true })).optional(),
  notes: z.string().optional(),
  preparation: AppointmentPreparationSchema.partial().optional(),
})

export const UpdateAppointmentInputSchema = z.object({
  status: AppointmentStatusSchema.optional(),
  scheduledAt: z.string().datetime('Invalid date format').optional(),
  startTime: z.string().datetime('Invalid date format').optional(),
  endTime: z.string().datetime('Invalid date format').optional(),
  location: AppointmentLocationSchema.optional(),
  notes: z.string().optional(),
  clientNotes: z.string().optional(),
  tailorNotes: z.string().optional(),
  preparation: AppointmentPreparationSchema.partial().optional(),
  outcome: AppointmentOutcomeSchema.optional(),
  cancellationReason: z.string().optional(),
})

// Availability schema
export const AppointmentAvailabilitySchema = z.object({
  tailorId: z.string().uuid('Invalid tailor ID format'),
  date: z.string().datetime('Invalid date format'),
  availableSlots: z.array(z.object({
    startTime: z.string().datetime('Invalid date format'),
    endTime: z.string().datetime('Invalid date format'),
    duration: z.number().int().positive('Duration must be positive'),
  })),
  bookedSlots: z.array(z.object({
    startTime: z.string().datetime('Invalid date format'),
    endTime: z.string().datetime('Invalid date format'),
    appointmentId: z.string().uuid('Invalid appointment ID format'),
  })),
})

// Validation functions
export const validateAppointment = (data: unknown) => AppointmentSchema.parse(data)
export const validateCreateAppointmentInput = (data: unknown) => CreateAppointmentInputSchema.parse(data)
export const validateUpdateAppointmentInput = (data: unknown) => UpdateAppointmentInputSchema.parse(data)
export const validateAppointmentAvailability = (data: unknown) => AppointmentAvailabilitySchema.parse(data)

// Type inference
export type AppointmentSchemaType = z.infer<typeof AppointmentSchema>
export type CreateAppointmentInputSchemaType = z.infer<typeof CreateAppointmentInputSchema>
export type UpdateAppointmentInputSchemaType = z.infer<typeof UpdateAppointmentInputSchema>
export type AppointmentAvailabilitySchemaType = z.infer<typeof AppointmentAvailabilitySchema>