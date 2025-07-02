/**
 * Order Model - Order lifecycle, status tracking, and progress management
 */

export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "measuring"
  | "cutting"
  | "stitching"
  | "fitting"
  | "finishing"
  | "ready"
  | "delivered"
  | "cancelled"
  | "refunded"

export type OrderPriority = "low" | "normal" | "high" | "urgent"

export interface OrderItem {
  id: string
  styleId: string
  fabricId: string
  quantity: number
  measurements: Record<string, number>
  customizations: OrderCustomization[]
  unitPrice: number
  totalPrice: number
}

export interface OrderCustomization {
  type: string
  description: string
  additionalCost: number
}

export interface OrderTimeline {
  estimatedStartDate: string
  estimatedCompletionDate: string
  actualStartDate?: string
  actualCompletionDate?: string
  milestones: OrderMilestone[]
}

export interface OrderMilestone {
  id: string
  name: string
  description: string
  estimatedDate: string
  actualDate?: string
  status: "pending" | "in_progress" | "completed" | "skipped"
  notes?: string
}

export interface OrderPricing {
  subtotal: number
  tax: number
  discount: number
  shipping: number
  total: number
  currency: string
}

export interface Order {
  id: string
  orderNumber: string
  clientId: string
  tailorId?: string
  status: OrderStatus
  priority: OrderPriority
  items: OrderItem[]
  timeline: OrderTimeline
  pricing: OrderPricing
  notes?: string
  specialInstructions?: string
  images: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrderInput {
  clientId: string
  tailorId?: string
  items: Omit<OrderItem, "id" | "totalPrice">[]
  priority?: OrderPriority
  notes?: string
  specialInstructions?: string
}

export interface UpdateOrderInput {
  status?: OrderStatus
  tailorId?: string
  items?: OrderItem[]
  timeline?: Partial<OrderTimeline>
  notes?: string
  specialInstructions?: string
}
