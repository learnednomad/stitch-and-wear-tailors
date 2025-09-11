/**
 * Nigerian Luxury Tailor Orders Types
 * Supporting Yoruba, Hausa, Igbo languages and Nigerian business context
 */

// Supported Languages
export type SupportedLanguage = "en" | "yo" | "ha" | "ig"

// Nigerian Cities with Tailoring Hubs
export type NigerianCity = "lagos" | "abuja" | "kano"

// Traditional Nigerian Garments
export type NigerianGarmentType =
  | "agbada" // Yoruba traditional flowing robe
  | "kaftan" // Common across Nigeria
  | "isi_agu" // Igbo traditional shirt
  | "babban_riga" // Hausa traditional robe
  | "ankara_dress" // Modern Nigerian fashion
  | "senator" // Modern Nigerian formal wear
  | "traditional" // General traditional wear
  | "modern" // Modern designs
  | "custom" // Custom designs

// Order Types
export type OrderType = "custom" | "alteration" | "repair"

// Order Status
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "ready"
  | "delivered"
  | "cancelled"

// Order Priority
export type OrderPriority = "low" | "normal" | "high" | "urgent"

// Payment Methods (Nigerian context)
export type PaymentMethod =
  | "bank_transfer" // Most common in Nigeria
  | "mobile_money" // OPay, PalmPay
  | "cash"
  | "card"
  | "pos" // Point of Sale

// Fabric Types (Nigerian context)
export type FabricType =
  | "aso_oke" // Yoruba traditional fabric
  | "adire" // Yoruba tie-dye
  | "ankara" // Wax print
  | "lace" // Popular for events
  | "cotton"
  | "silk"
  | "linen"
  | "brocade"
  | "george" // Wrapper fabric
  | "custom"

// Measurement Types
export interface MeasurementData {
  id: string
  userId: string
  garmentType: NigerianGarmentType
  chest: number
  waist: number
  length: number
  shoulder?: number
  armLength?: number
  neck?: number
  customMeasurements?: string // JSON string for additional measurements
  notes?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// Customer Info for Orders
export interface CustomerInfo {
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  city: NigerianCity
  address: string
  preferredLanguage: SupportedLanguage
}

// Fabric Selection
export interface FabricSelection {
  type: FabricType
  color: string
  pattern?: string
  quantity: number // in meters
  unitPrice: number // in Naira
  totalPrice: number
  supplier?: string
  inStock: boolean
  location: NigerianCity
}

// Style Configuration
export interface StyleConfig {
  garmentType: NigerianGarmentType
  designNotes?: string
  embellishments?: string[]
  fitPreference: "slim" | "regular" | "loose"
  necklineStyle?: string
  sleeveStyle?: string
  hemStyle?: string
  culturalSpecifications?: string // For traditional garments
}

// Pricing Breakdown (Nigerian Naira)
export interface PricingBreakdown {
  basePrice: number
  fabricCost: number
  complexityMultiplier: number
  urgencyFee: number
  totalPrice: number
  depositRequired: number // 50% for custom orders
  balanceAmount: number
  currency: "NGN"
  city: NigerianCity
}

// Order Creation Data
export interface OrderCreationData {
  customerInfo: CustomerInfo
  measurements?: MeasurementData
  fabricSelection: FabricSelection
  styleConfig: StyleConfig
  pricing: PricingBreakdown
  orderType: OrderType
  priority: OrderPriority
  notes?: string
  appointmentRequests?: AppointmentRequest[]
}

// Appointment Request
export interface AppointmentRequest {
  type: "measurement" | "fitting" | "pickup"
  preferredDate: string
  preferredTime: string
  location: NigerianCity
  notes?: string
}

// Order Progress Tracking
export interface OrderProgress {
  stage: OrderStage
  status: "pending" | "in_progress" | "completed"
  startedAt?: string
  completedAt?: string
  tailorId?: string
  qualityScore?: number
  notes?: string
}

export type OrderStage =
  | "received"
  | "measured"
  | "cutting"
  | "sewing"
  | "finishing"
  | "quality_check"
  | "completed"

// Complete Order Data
export interface Order {
  id: string
  orderNumber: string
  userId: string
  tailorId?: string
  locationId: string
  type: OrderType
  status: OrderStatus
  priority: OrderPriority
  garmentType: NigerianGarmentType
  fabric: FabricSelection
  style: StyleConfig
  measurements?: MeasurementData
  pricing: PricingBreakdown
  progress: OrderProgress[]
  currentStage: OrderStage
  orderDate: string
  estimatedDeliveryDate: string
  actualDeliveryDate?: string
  notes?: string
  internalNotes?: string
  customerLanguage: SupportedLanguage
  createdAt: string
  updatedAt: string
}

// Order Filters
export interface OrderFilters {
  status?: OrderStatus[]
  priority?: OrderPriority[]
  garmentType?: NigerianGarmentType[]
  city?: NigerianCity[]
  dateRange?: {
    start: string
    end: string
  }
  tailorId?: string
  customerId?: string
}

// Multi-language Content
export interface MultiLanguageContent {
  en: string
  yo?: string // Yoruba
  ha?: string // Hausa
  ig?: string // Igbo
}

// Measurement Tutorial Step
export interface MeasurementTutorialStep {
  id: string
  measurementType: keyof Pick<
    MeasurementData,
    "chest" | "waist" | "length" | "shoulder" | "armLength" | "neck"
  >
  title: MultiLanguageContent
  instructions: MultiLanguageContent
  visualAid: string // Image/video URL
  tips: MultiLanguageContent
  commonMistakes: MultiLanguageContent
  garmentSpecific: {
    [K in NigerianGarmentType]?: {
      importance: "essential" | "recommended" | "optional"
      specialInstructions?: MultiLanguageContent
    }
  }
}

// Notification Data
export interface OrderNotification {
  id: string
  orderId: string
  userId: string
  type: "status_update" | "payment_reminder" | "appointment_confirmation" | "delivery_ready"
  title: MultiLanguageContent
  message: MultiLanguageContent
  language: SupportedLanguage
  sent: boolean
  sentAt?: string
  readAt?: string
  priority: "low" | "normal" | "high"
}

// Nigerian Business Context
export interface NigerianBusinessConfig {
  cities: {
    [K in NigerianCity]: {
      name: MultiLanguageContent
      currency: "NGN"
      deliveryFee: number
      rushFeeMultiplier: number
      workingHours: {
        start: string
        end: string
      }
      closedDays: string[]
      majorLanguages: SupportedLanguage[]
    }
  }
  paymentMethods: {
    [K in PaymentMethod]: {
      name: MultiLanguageContent
      available: boolean
      processingFee: number
      supportedCities: NigerianCity[]
    }
  }
  traditionalGarments: {
    [K in NigerianGarmentType]: {
      name: MultiLanguageContent
      description: MultiLanguageContent
      culturalSignificance: MultiLanguageContent
      requiredMeasurements: (keyof MeasurementData)[]
      basePrice: number
      complexityLevel: 1 | 2 | 3 | 4 | 5
      estimatedDays: number
    }
  }
}
