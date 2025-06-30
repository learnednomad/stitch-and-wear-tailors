/**
 * Style Model Zod Validation Schemas
 */

import { z } from 'zod'

// Enums
export const StyleCategorySchema = z.enum(['formal', 'casual', 'business', 'evening', 'traditional', 'modern', 'vintage'])
export const StyleComplexitySchema = z.enum(['basic', 'intermediate', 'advanced', 'expert'])
export const StyleGenderSchema = z.enum(['men', 'women', 'unisex'])
export const StyleSeasonSchema = z.enum(['spring', 'summer', 'autumn', 'winter', 'all_season'])

// Style measurements schema
export const StyleMeasurementsSchema = z.object({
  required: z.array(z.string()).min(1, 'At least one required measurement is needed'),
  optional: z.array(z.string()),
  critical: z.array(z.string()),
})

// Fabric requirements schema
export const StyleFabricRequirementsSchema = z.object({
  recommendedTypes: z.array(z.string()),
  unsuitableTypes: z.array(z.string()),
  minimumQuantity: z.number().positive('Minimum quantity must be positive'),
  unit: z.enum(['yards', 'meters']),
  properties: z.object({
    stretch: z.boolean().optional(),
    weight: z.enum(['lightweight', 'medium', 'heavyweight']).optional(),
    drape: z.enum(['soft', 'structured']).optional(),
  }),
})

// Customization option schema
export const CustomizationOptionSchema = z.object({
  value: z.string().min(1, 'Option value is required'),
  label: z.string().min(1, 'Option label is required'),
  additionalCost: z.number().min(0, 'Additional cost cannot be negative'),
  description: z.string().optional(),
})

// Style customization schema
export const StyleCustomizationSchema = z.object({
  id: z.string().uuid('Invalid customization ID format'),
  name: z.string().min(1, 'Customization name is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['fit', 'design', 'functional']),
  options: z.array(CustomizationOptionSchema).min(1, 'At least one option is required'),
  required: z.boolean(),
  defaultValue: z.string().optional(),
})

// Style instructions schema
export const StyleInstructionsSchema = z.object({
  cutting: z.array(z.string()),
  stitching: z.array(z.string()),
  fitting: z.array(z.string()),
  finishing: z.array(z.string()),
  qualityChecks: z.array(z.string()),
  specialTechniques: z.array(z.string()).optional(),
})

// Style pricing schema
export const StylePricingSchema = z.object({
  basePrice: z.number().positive('Base price must be positive'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
  laborHours: z.number().positive('Labor hours must be positive'),
  difficultyMultiplier: z.number().min(1, 'Difficulty multiplier cannot be less than 1'),
  rushOrderMultiplier: z.number().min(1, 'Rush order multiplier cannot be less than 1'),
})

// Main Style schema
export const StyleSchema = z.object({
  id: z.string().uuid('Invalid style ID format'),
  name: z.string().min(1, 'Style name is required'),
  description: z.string().min(1, 'Description is required'),
  category: StyleCategorySchema,
  complexity: StyleComplexitySchema,
  gender: StyleGenderSchema,
  season: StyleSeasonSchema,
  measurements: StyleMeasurementsSchema,
  fabricRequirements: StyleFabricRequirementsSchema,
  customizations: z.array(StyleCustomizationSchema),
  instructions: StyleInstructionsSchema,
  pricing: StylePricingSchema,
  images: z.array(z.string().url('Invalid image URL')),
  technicalDrawings: z.array(z.string().url('Invalid image URL')),
  estimatedCompletionDays: z.number().int().positive('Estimated completion days must be positive'),
  tags: z.array(z.string()),
  popularityScore: z.number().min(0).max(100, 'Popularity score must be between 0 and 100'),
  featured: z.boolean(),
  active: z.boolean(),
  createdBy: z.string().uuid('Invalid user ID format'),
  createdAt: z.string().datetime('Invalid date format'),
  updatedAt: z.string().datetime('Invalid date format'),
})

// Input schemas
export const CreateStyleInputSchema = z.object({
  name: z.string().min(1, 'Style name is required'),
  description: z.string().min(1, 'Description is required'),
  category: StyleCategorySchema,
  complexity: StyleComplexitySchema,
  gender: StyleGenderSchema,
  season: StyleSeasonSchema,
  measurements: StyleMeasurementsSchema,
  fabricRequirements: StyleFabricRequirementsSchema,
  customizations: z.array(StyleCustomizationSchema).optional(),
  instructions: StyleInstructionsSchema,
  pricing: StylePricingSchema,
  images: z.array(z.string().url('Invalid image URL')).optional(),
  technicalDrawings: z.array(z.string().url('Invalid image URL')).optional(),
  estimatedCompletionDays: z.number().int().positive('Estimated completion days must be positive'),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().uuid('Invalid user ID format'),
})

export const UpdateStyleInputSchema = z.object({
  name: z.string().min(1, 'Style name is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  category: StyleCategorySchema.optional(),
  complexity: StyleComplexitySchema.optional(),
  gender: StyleGenderSchema.optional(),
  season: StyleSeasonSchema.optional(),
  measurements: StyleMeasurementsSchema.partial().optional(),
  fabricRequirements: StyleFabricRequirementsSchema.partial().optional(),
  customizations: z.array(StyleCustomizationSchema).optional(),
  instructions: StyleInstructionsSchema.partial().optional(),
  pricing: StylePricingSchema.partial().optional(),
  images: z.array(z.string().url('Invalid image URL')).optional(),
  technicalDrawings: z.array(z.string().url('Invalid image URL')).optional(),
  estimatedCompletionDays: z.number().int().positive('Estimated completion days must be positive').optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
})

// Validation functions
export const validateStyle = (data: unknown) => StyleSchema.parse(data)
export const validateCreateStyleInput = (data: unknown) => CreateStyleInputSchema.parse(data)
export const validateUpdateStyleInput = (data: unknown) => UpdateStyleInputSchema.parse(data)

// Type inference
export type StyleSchemaType = z.infer<typeof StyleSchema>
export type CreateStyleInputSchemaType = z.infer<typeof CreateStyleInputSchema>
export type UpdateStyleInputSchemaType = z.infer<typeof UpdateStyleInputSchema>