/**
 * Fabric Model Zod Validation Schemas
 */

import { z } from "zod"

// Enums
export const FabricCategorySchema = z.enum([
  "cotton",
  "silk",
  "wool",
  "linen",
  "polyester",
  "denim",
  "velvet",
  "leather",
  "synthetic",
])
export const FabricWeightSchema = z.enum(["lightweight", "medium", "heavyweight"])
export const FabricPatternSchema = z.enum([
  "solid",
  "striped",
  "checkered",
  "floral",
  "geometric",
  "abstract",
  "paisley",
])
export const FabricAvailabilitySchema = z.enum([
  "in_stock",
  "low_stock",
  "out_of_stock",
  "pre_order",
])

// Fabric properties schema
export const FabricPropertiesSchema = z.object({
  weight: FabricWeightSchema,
  pattern: FabricPatternSchema,
  stretch: z.boolean(),
  breathable: z.boolean(),
  washable: z.boolean(),
  ironingTemp: z.enum(["low", "medium", "high"]).optional(),
  dryCleanOnly: z.boolean(),
  fadeResistant: z.boolean(),
  wrinkleResistant: z.boolean(),
})

// Fabric colors schema
export const FabricColorsSchema = z.object({
  primary: z.string().min(1, "Primary color is required"),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color code format"),
  colorName: z.string().min(1, "Color name is required"),
})

// Fabric inventory schema
export const FabricInventorySchema = z.object({
  totalQuantity: z.number().min(0, "Total quantity cannot be negative"),
  availableQuantity: z.number().min(0, "Available quantity cannot be negative"),
  reservedQuantity: z.number().min(0, "Reserved quantity cannot be negative"),
  unit: z.enum(["yards", "meters"]),
  minimumStock: z.number().min(0, "Minimum stock cannot be negative"),
  reorderPoint: z.number().min(0, "Reorder point cannot be negative"),
})

// Bulk pricing schema
export const BulkPricingSchema = z.object({
  minimumQuantity: z.number().positive("Minimum quantity must be positive"),
  discountPercentage: z.number().min(0).max(100, "Discount percentage must be between 0 and 100"),
})

// Seasonal discount schema
export const SeasonalDiscountSchema = z.object({
  discountPercentage: z.number().min(0).max(100, "Discount percentage must be between 0 and 100"),
  validFrom: z.string().datetime("Invalid date format"),
  validTo: z.string().datetime("Invalid date format"),
})

// Fabric pricing schema
export const FabricPricingSchema = z.object({
  basePrice: z.number().positive("Base price must be positive"),
  currency: z.string().length(3, "Currency code must be 3 characters"),
  pricePerUnit: z.number().positive("Price per unit must be positive"),
  bulkPricing: z.array(BulkPricingSchema).optional(),
  seasonalDiscount: SeasonalDiscountSchema.optional(),
})

// Fabric supplier schema
export const FabricSupplierSchema = z.object({
  id: z.string().uuid("Invalid supplier ID format"),
  name: z.string().min(1, "Supplier name is required"),
  contactInfo: z.object({
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    address: z.string().min(1, "Address is required"),
  }),
  leadTime: z.number().int().min(0, "Lead time cannot be negative"),
  minimumOrder: z.number().min(0, "Minimum order cannot be negative"),
})

// Main Fabric schema
export const FabricSchema = z.object({
  id: z.string().uuid("Invalid fabric ID format"),
  name: z.string().min(1, "Fabric name is required"),
  description: z.string().min(1, "Description is required"),
  category: FabricCategorySchema,
  material: z.string().min(1, "Material is required"),
  properties: FabricPropertiesSchema,
  colors: FabricColorsSchema,
  inventory: FabricInventorySchema,
  pricing: FabricPricingSchema,
  supplier: FabricSupplierSchema,
  availability: FabricAvailabilitySchema,
  images: z.array(z.string().url("Invalid image URL")),
  careInstructions: z.array(z.string()),
  suitableFor: z.array(z.string()),
  tags: z.array(z.string()),
  featured: z.boolean(),
  active: z.boolean(),
  createdAt: z.string().datetime("Invalid date format"),
  updatedAt: z.string().datetime("Invalid date format"),
})

// Input schemas
export const CreateFabricInputSchema = z.object({
  name: z.string().min(1, "Fabric name is required"),
  description: z.string().min(1, "Description is required"),
  category: FabricCategorySchema,
  material: z.string().min(1, "Material is required"),
  properties: FabricPropertiesSchema,
  colors: FabricColorsSchema,
  inventory: FabricInventorySchema.omit({ reservedQuantity: true }),
  pricing: FabricPricingSchema,
  supplier: FabricSupplierSchema,
  images: z.array(z.string().url("Invalid image URL")).optional(),
  careInstructions: z.array(z.string()).optional(),
  suitableFor: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

export const UpdateFabricInputSchema = z.object({
  name: z.string().min(1, "Fabric name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  properties: FabricPropertiesSchema.partial().optional(),
  colors: FabricColorsSchema.partial().optional(),
  inventory: FabricInventorySchema.partial().optional(),
  pricing: FabricPricingSchema.partial().optional(),
  availability: FabricAvailabilitySchema.optional(),
  images: z.array(z.string().url("Invalid image URL")).optional(),
  careInstructions: z.array(z.string()).optional(),
  suitableFor: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
})

// Validation functions
export const validateFabric = (data: unknown) => FabricSchema.parse(data)
export const validateCreateFabricInput = (data: unknown) => CreateFabricInputSchema.parse(data)
export const validateUpdateFabricInput = (data: unknown) => UpdateFabricInputSchema.parse(data)

// Type inference
export type FabricSchemaType = z.infer<typeof FabricSchema>
export type CreateFabricInputSchemaType = z.infer<typeof CreateFabricInputSchema>
export type UpdateFabricInputSchemaType = z.infer<typeof UpdateFabricInputSchema>
