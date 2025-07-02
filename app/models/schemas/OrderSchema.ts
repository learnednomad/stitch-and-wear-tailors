/**
 * Order Model Zod Validation Schemas
 */

import { z } from "zod"

// Enums
export const OrderStatusSchema = z.enum([
  "draft",
  "pending",
  "confirmed",
  "measuring",
  "cutting",
  "stitching",
  "fitting",
  "finishing",
  "ready",
  "delivered",
  "cancelled",
  "refunded",
])

export const OrderPrioritySchema = z.enum(["low", "normal", "high", "urgent"])

// Customization schema
export const OrderCustomizationSchema = z.object({
  type: z.string().min(1, "Customization type is required"),
  description: z.string().min(1, "Description is required"),
  additionalCost: z.number().min(0, "Additional cost cannot be negative"),
})

// Order item schema
export const OrderItemSchema = z.object({
  id: z.string().uuid("Invalid item ID format"),
  styleId: z.string().uuid("Invalid style ID format"),
  fabricId: z.string().uuid("Invalid fabric ID format"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  measurements: z.record(z.string(), z.number().positive("Measurements must be positive")),
  customizations: z.array(OrderCustomizationSchema),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  totalPrice: z.number().min(0, "Total price cannot be negative"),
})

// Milestone schema
export const OrderMilestoneSchema = z.object({
  id: z.string().uuid("Invalid milestone ID format"),
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().min(1, "Description is required"),
  estimatedDate: z.string().datetime("Invalid date format"),
  actualDate: z.string().datetime("Invalid date format").optional(),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]),
  notes: z.string().optional(),
})

// Timeline schema
export const OrderTimelineSchema = z.object({
  estimatedStartDate: z.string().datetime("Invalid date format"),
  estimatedCompletionDate: z.string().datetime("Invalid date format"),
  actualStartDate: z.string().datetime("Invalid date format").optional(),
  actualCompletionDate: z.string().datetime("Invalid date format").optional(),
  milestones: z.array(OrderMilestoneSchema),
})

// Pricing schema
export const OrderPricingSchema = z.object({
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  tax: z.number().min(0, "Tax cannot be negative"),
  discount: z.number().min(0, "Discount cannot be negative"),
  shipping: z.number().min(0, "Shipping cannot be negative"),
  total: z.number().min(0, "Total cannot be negative"),
  currency: z.string().length(3, "Currency code must be 3 characters"),
})

// Main Order schema
export const OrderSchema = z.object({
  id: z.string().uuid("Invalid order ID format"),
  orderNumber: z.string().min(1, "Order number is required"),
  clientId: z.string().uuid("Invalid client ID format"),
  tailorId: z.string().uuid("Invalid tailor ID format").optional(),
  status: OrderStatusSchema,
  priority: OrderPrioritySchema,
  items: z.array(OrderItemSchema).min(1, "Order must have at least one item"),
  timeline: OrderTimelineSchema,
  pricing: OrderPricingSchema,
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
  images: z.array(z.string().url("Invalid image URL")),
  createdAt: z.string().datetime("Invalid date format"),
  updatedAt: z.string().datetime("Invalid date format"),
})

// Input schemas
export const CreateOrderInputSchema = z.object({
  clientId: z.string().uuid("Invalid client ID format"),
  tailorId: z.string().uuid("Invalid tailor ID format").optional(),
  items: z
    .array(OrderItemSchema.omit({ id: true, totalPrice: true }))
    .min(1, "Order must have at least one item"),
  priority: OrderPrioritySchema.optional(),
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
})

export const UpdateOrderInputSchema = z.object({
  status: OrderStatusSchema.optional(),
  tailorId: z.string().uuid("Invalid tailor ID format").optional(),
  items: z.array(OrderItemSchema).optional(),
  timeline: OrderTimelineSchema.partial().optional(),
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
})

// Validation functions
export const validateOrder = (data: unknown) => OrderSchema.parse(data)
export const validateCreateOrderInput = (data: unknown) => CreateOrderInputSchema.parse(data)
export const validateUpdateOrderInput = (data: unknown) => UpdateOrderInputSchema.parse(data)

// Type inference
export type OrderSchemaType = z.infer<typeof OrderSchema>
export type CreateOrderInputSchemaType = z.infer<typeof CreateOrderInputSchema>
export type UpdateOrderInputSchemaType = z.infer<typeof UpdateOrderInputSchema>
