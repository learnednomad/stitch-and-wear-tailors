/**
 * Measurement Model Zod Validation Schemas
 */

import { z } from 'zod'

// Enums
export const MeasurementUnitSchema = z.enum(['cm', 'inch'])
export const MeasurementStatusSchema = z.enum(['draft', 'pending_validation', 'validated', 'rejected'])
export const GarmentTypeSchema = z.enum(['shirt', 'pants', 'suit', 'dress', 'blouse', 'skirt', 'jacket', 'coat'])

// Measurement value schema
export const MeasurementValueSchema = z.object({
  value: z.number().positive('Measurement value must be positive'),
  unit: MeasurementUnitSchema,
  notes: z.string().optional(),
})

// Standard measurements schema
export const StandardMeasurementsSchema = z.object({
  // Upper body
  chest: MeasurementValueSchema.optional(),
  waist: MeasurementValueSchema.optional(),
  hips: MeasurementValueSchema.optional(),
  shoulders: MeasurementValueSchema.optional(),
  armLength: MeasurementValueSchema.optional(),
  neck: MeasurementValueSchema.optional(),
  
  // Lower body
  inseam: MeasurementValueSchema.optional(),
  outseam: MeasurementValueSchema.optional(),
  thigh: MeasurementValueSchema.optional(),
  knee: MeasurementValueSchema.optional(),
  calf: MeasurementValueSchema.optional(),
  ankle: MeasurementValueSchema.optional(),
  
  // General
  height: MeasurementValueSchema.optional(),
  weight: MeasurementValueSchema.optional(),
})

// Custom measurement schema
export const CustomMeasurementSchema = z.object({
  name: z.string().min(1, 'Measurement name is required'),
  value: MeasurementValueSchema,
  description: z.string().optional(),
})

// Measurement validation schema
export const MeasurementValidationSchema = z.object({
  validatedBy: z.string().uuid('Invalid validator ID format'),
  validatedAt: z.string().datetime('Invalid date format'),
  status: z.enum(['approved', 'needs_revision']),
  comments: z.string().optional(),
  suggestedChanges: z.record(z.string(), MeasurementValueSchema).optional(),
})

// Main Measurement schema
export const MeasurementSchema = z.object({
  id: z.string().uuid('Invalid measurement ID format'),
  clientId: z.string().uuid('Invalid client ID format'),
  garmentTypes: z.array(GarmentTypeSchema).min(1, 'At least one garment type is required'),
  status: MeasurementStatusSchema,
  standardMeasurements: StandardMeasurementsSchema,
  customMeasurements: z.array(CustomMeasurementSchema),
  validation: MeasurementValidationSchema.optional(),
  takenBy: z.string().uuid('Invalid user ID format'),
  takenAt: z.string().datetime('Invalid date format'),
  notes: z.string().optional(),
  images: z.array(z.string().url('Invalid image URL')),
  previousMeasurementId: z.string().uuid('Invalid measurement ID format').optional(),
  createdAt: z.string().datetime('Invalid date format'),
  updatedAt: z.string().datetime('Invalid date format'),
})

// Measurement comparison schema
export const MeasurementComparisonSchema = z.object({
  measurementId: z.string().uuid('Invalid measurement ID format'),
  previousMeasurementId: z.string().uuid('Invalid measurement ID format'),
  changes: z.record(z.string(), z.object({
    previous: MeasurementValueSchema,
    current: MeasurementValueSchema,
    difference: z.number(),
  })),
})

// Input schemas
export const CreateMeasurementInputSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  garmentTypes: z.array(GarmentTypeSchema).min(1, 'At least one garment type is required'),
  standardMeasurements: StandardMeasurementsSchema,
  customMeasurements: z.array(CustomMeasurementSchema).optional(),
  takenBy: z.string().uuid('Invalid user ID format'),
  notes: z.string().optional(),
  images: z.array(z.string().url('Invalid image URL')).optional(),
})

export const UpdateMeasurementInputSchema = z.object({
  standardMeasurements: StandardMeasurementsSchema.partial().optional(),
  customMeasurements: z.array(CustomMeasurementSchema).optional(),
  status: MeasurementStatusSchema.optional(),
  notes: z.string().optional(),
  images: z.array(z.string().url('Invalid image URL')).optional(),
})

// Validation functions
export const validateMeasurement = (data: unknown) => MeasurementSchema.parse(data)
export const validateCreateMeasurementInput = (data: unknown) => CreateMeasurementInputSchema.parse(data)
export const validateUpdateMeasurementInput = (data: unknown) => UpdateMeasurementInputSchema.parse(data)
export const validateMeasurementComparison = (data: unknown) => MeasurementComparisonSchema.parse(data)

// Type inference
export type MeasurementSchemaType = z.infer<typeof MeasurementSchema>
export type CreateMeasurementInputSchemaType = z.infer<typeof CreateMeasurementInputSchema>
export type UpdateMeasurementInputSchemaType = z.infer<typeof UpdateMeasurementInputSchema>
export type MeasurementComparisonSchemaType = z.infer<typeof MeasurementComparisonSchema>