/**
 * Type definitions for the comprehensive database schema
 * Supporting both mobile app and web dashboard functionality
 */

import { Models } from "appwrite"

// ==========================================
// CORE USER & AUTHENTICATION
// ==========================================

export interface User extends Models.Document {
  email: string
  role: "client" | "tailor" | "admin"
  status: "active" | "inactive" | "suspended"
  profile?: string // JSON string
  phoneNumber?: string
  businessId?: string
  preferredLanguage?: string
  preferredCommunication?: "email" | "sms" | "phone" | "app"
  twoFactorEnabled?: boolean
  lastLoginAt?: string
  loginCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface Session extends Models.Document {
  userId: string
  token: string
  deviceId?: string
  deviceType: "web" | "ios" | "android"
  ipAddress?: string
  userAgent?: string
  createdAt: string
  expiresAt: string
  lastActivityAt?: string
}

// ==========================================
// BUSINESS & LOCATION MANAGEMENT
// ==========================================

export interface Business extends Models.Document {
  name: string
  type: "single" | "franchise" | "chain"
  registrationNumber?: string
  taxId?: string
  email: string
  phone: string
  website?: string
  logo?: string
  currency: string
  timezone: string
  settings?: string // JSON settings
  subscription: "free" | "basic" | "premium" | "enterprise"
  isActive: boolean
}

export interface Location extends Models.Document {
  businessId: string
  name: string
  code: string
  type: "main" | "branch" | "workshop" | "showroom"
  address: string
  city: string
  state?: string
  country: string
  postalCode?: string
  latitude?: number
  longitude?: number
  phone: string
  email?: string
  managerId?: string
  employeeCount?: number
  operatingHours?: string // JSON schedule
  features?: string[] // Available services
  isActive: boolean
}

// ==========================================
// ENHANCED ORDER MANAGEMENT
// ==========================================

export interface Order extends Models.Document {
  orderNumber: string
  userId: string
  tailorId?: string
  locationId?: string
  type: "custom" | "alteration" | "repair"
  status: "pending" | "confirmed" | "in_progress" | "ready" | "delivered" | "cancelled"
  priority: "low" | "normal" | "high" | "urgent"
  source: "in_store" | "online" | "phone" | "referral"
  style?: "agbada" | "kaftan" | "plain_kaftan" | "senator" | "traditional" | "modern" | "custom"
  fabric?: string
  subtotal: number
  taxAmount: number
  discountAmount?: number
  discountCode?: string
  totalAmount: number
  depositAmount?: number
  balanceAmount: number
  rushFee?: number
  currency: string
  orderDate: string
  deliveryDate: string
  actualDeliveryDate?: string
  tags?: string[]
  referralSource?: string
  marketingCampaign?: string
  notes?: string
  internalNotes?: string
}

export interface OrderStage extends Models.Document {
  orderId: string
  stage:
    | "received"
    | "measured"
    | "cutting"
    | "sewing"
    | "finishing"
    | "quality_check"
    | "completed"
  status: "pending" | "in_progress" | "completed" | "skipped"
  assignedTo?: string
  startedAt?: string
  completedAt?: string
  completedBy?: string
  duration?: number // Minutes
  notes?: string
  qualityScore?: number // 0-100
  photos?: string[] // URLs
}

export interface OrderItem extends Models.Document {
  orderId: string
  type: "garment" | "alteration" | "accessory" | "service"
  name: string
  description?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  style?: "agbada" | "kaftan" | "plain_kaftan" | "senator" | "traditional" | "modern" | "custom"
  measurementId?: string
  fabricRequired?: number // Meters/yards
  estimatedHours?: number
  actualHours?: number
  notes?: string
}

// ==========================================
// STYLE & GARMENT CATALOG
// ==========================================

export interface StyleCatalog extends Models.Document {
  code: string
  name: string
  category:
    | "agbada"
    | "kaftan"
    | "plain_kaftan"
    | "senator"
    | "traditional"
    | "modern"
    | "western"
    | "custom"
  description?: string
  basePrice: number
  estimatedHours?: number
  fabricRequirement?: number // Meters
  skillLevel?: "beginner" | "intermediate" | "advanced" | "expert"
  gender?: "male" | "female" | "unisex"
  ageGroup?: "child" | "teen" | "adult" | "all"
  images?: string[] // URLs
  measurements?: string // JSON of required measurements
  customizationOptions?: string // JSON
  tags?: string[]
  popularity?: number
  isActive: boolean
  isFeatured?: boolean
  createdAt?: string
  updatedAt?: string
}

// ==========================================
// FINANCIAL MANAGEMENT
// ==========================================

export interface Invoice extends Models.Document {
  invoiceNumber: string
  orderId: string
  status: "draft" | "sent" | "viewed" | "paid" | "partial" | "overdue" | "cancelled"
  subtotal: number
  taxAmount: number
  taxRate?: number
  discountAmount?: number
  shippingAmount?: number
  totalAmount: number
  paidAmount?: number
  balanceAmount?: number
  currency: string
  exchangeRate?: number
  invoiceDate: string
  dueDate: string
  paidDate?: string
  terms?: string
  notes?: string
  remindersSent?: number
  lastReminderAt?: string
  pdfUrl?: string
}

export interface Payment extends Models.Document {
  paymentNumber: string
  invoiceId: string
  amount: number
  currency: string
  method:
    | "cash"
    | "credit_card"
    | "debit_card"
    | "bank_transfer"
    | "check"
    | "digital_wallet"
    | "other"
  status: "pending" | "processing" | "completed" | "failed" | "refunded"
  transactionId?: string
  processorName?: string
  processorResponse?: string // JSON response
  receiptNumber?: string
  receiptUrl?: string
  refundAmount?: number
  refundReason?: string
  notes?: string
  collectedBy?: string
  paymentDate: string
  processedAt?: string
  failedAt?: string
  refundedAt?: string
}

export interface Expense extends Models.Document {
  locationId?: string
  category:
    | "fabric"
    | "labor"
    | "equipment"
    | "utilities"
    | "rent"
    | "marketing"
    | "supplies"
    | "other"
  subcategory?: string
  description: string
  amount: number
  currency: string
  vendor?: string
  invoiceNumber?: string
  receiptUrl?: string
  paymentMethod?: "cash" | "credit_card" | "bank_transfer" | "check" | "other"
  isRecurring?: boolean
  recurringFrequency?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
  taxDeductible?: boolean
  expenseDate: string
  submittedBy?: string
  approvedBy?: string
  approvalStatus?: "pending" | "approved" | "rejected"
  approvalDate?: string
  notes?: string
}

// ==========================================
// INVENTORY MANAGEMENT
// ==========================================

export interface InventoryItem extends Models.Document {
  sku: string
  name: string
  description?: string
  category: "fabric" | "button" | "zipper" | "thread" | "lining" | "accessory" | "other"
  subcategory?: string
  unit: "meter" | "yard" | "piece" | "roll" | "spool" | "box"
  unitCost: number
  sellingPrice?: number
  currency: string
  minimumStock?: number
  maximumStock?: number
  reorderPoint?: number
  reorderQuantity?: number
  supplier?: string
  supplierSku?: string
  leadTime?: number // Days
  color?: string
  pattern?: string
  weight?: string // For fabrics
  width?: string // For fabrics
  composition?: string // Material composition
  careInstructions?: string
  imageUrl?: string
  isActive: boolean
  discontinuedDate?: string
}

export interface InventoryLocation extends Models.Document {
  inventoryItemId: string
  locationId: string
  quantity: number
  reservedQuantity?: number
  availableQuantity?: number
  binLocation?: string
  lastCountDate?: string
  lastCountQuantity?: number
  countVariance?: number
  notes?: string
}

export interface InventoryTransaction extends Models.Document {
  inventoryItemId: string
  locationId: string
  type: "purchase" | "sale" | "adjustment" | "transfer" | "return" | "damage" | "sample"
  quantity: number // Can be negative
  unitCost?: number
  totalCost?: number
  referenceType?: "order" | "purchase_order" | "transfer" | "manual"
  referenceId?: string
  fromLocationId?: string
  toLocationId?: string
  reason?: string
  performedBy?: string
  approvedBy?: string
  transactionDate: string
  notes?: string
}

// ==========================================
// CUSTOMER RELATIONSHIP MANAGEMENT
// ==========================================

export interface ClientSegment extends Models.Document {
  name: string
  description?: string
  type: "value" | "behavior" | "demographic" | "custom"
  criteria: string // JSON rules
  benefits?: string // JSON array
  priority?: number
  isActive: boolean
}

export interface ClientSegmentUser extends Models.Document {
  segmentId: string
  userId: string
  assignedAt: string
  expiresAt?: string
  manualOverride?: boolean
  notes?: string
}

export interface LoyaltyPoints extends Models.Document {
  userId: string
  points: number
  lifetimePoints?: number
  tier?: "bronze" | "silver" | "gold" | "platinum"
  tierExpiryDate?: string
}

export interface LoyaltyTransaction extends Models.Document {
  userId: string
  type: "earned" | "redeemed" | "expired" | "adjusted"
  points: number // Can be negative
  balance: number // After transaction
  source: "order" | "referral" | "promotion" | "manual" | "system"
  referenceId?: string
  description: string
  expiresAt?: string
  transactionDate: string
}

// ==========================================
// COMMUNICATION & COLLABORATION
// ==========================================

export interface Communication extends Models.Document {
  type: "email" | "sms" | "call" | "in_person" | "app_message" | "whatsapp"
  direction: "inbound" | "outbound"
  status: "pending" | "sent" | "delivered" | "failed" | "read"
  fromUserId?: string
  toUserId?: string
  subject?: string
  content: string
  metadata?: string // JSON for additional data
  referenceType?: "order" | "appointment" | "invoice" | "general"
  referenceId?: string
  attachments?: string[] // URLs
  scheduledFor?: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  failureReason?: string
}

export interface NotificationQueue extends Models.Document {
  userId: string
  type: "order_update" | "appointment_reminder" | "payment_due" | "promotion" | "system" | "message"
  channel: "in_app" | "email" | "sms" | "push"
  priority: "low" | "normal" | "high" | "urgent"
  title: string
  message: string
  actionUrl?: string
  status: "pending" | "sent" | "delivered" | "failed" | "read"
  scheduledFor?: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  retryCount?: number
}

// ==========================================
// BUSINESS INTELLIGENCE & ANALYTICS
// ==========================================

export interface KPIMetric extends Models.Document {
  locationId?: string
  metricType: "revenue" | "orders" | "clients" | "inventory" | "quality" | "efficiency"
  metricName: string
  value: number
  unit?: string
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
  periodStart: string
  periodEnd: string
  previousValue?: number
  target?: number
  trend?: "up" | "down" | "stable"
  percentageChange?: number
}

export interface AIInsight extends Models.Document {
  insightType:
    | "revenue_optimization"
    | "operational_efficiency"
    | "client_satisfaction"
    | "inventory_management"
    | "growth_opportunity"
    | "risk_alert"
  title: string
  summary: string
  analysis: string
  recommendations?: string[]
  impact?: string // JSON
  confidence?: number // 0-100
  priority?: "low" | "medium" | "high" | "critical"
  status?: "new" | "reviewed" | "actioned" | "dismissed"
  validFrom?: string
  validUntil?: string
}

// ==========================================
// AUDIT & SECURITY
// ==========================================

export interface AuditLog extends Models.Document {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  changes?: string // JSON diff
  ipAddress?: string
  severity: "info" | "warning" | "error" | "critical"
  timestamp: string
}

export interface SecurityEvent extends Models.Document {
  eventType:
    | "login_success"
    | "login_failure"
    | "password_reset"
    | "permission_change"
    | "suspicious_activity"
    | "data_export"
    | "api_limit_exceeded"
  userId?: string
  ipAddress?: string
  userAgent?: string
  riskScore?: number // 0-100
  blocked?: boolean
  timestamp: string
}

// ==========================================
// REPORTING & EXPORTS
// ==========================================

export interface ScheduledReport extends Models.Document {
  name: string
  description?: string
  reportType: "financial" | "operational" | "inventory" | "customer" | "custom"
  parameters?: string // JSON configuration
  schedule?: string // Cron expression
  format?: "pdf" | "excel" | "csv" | "json"
  recipients?: string[] // Emails
  isActive: boolean
}

export interface ReportHistory extends Models.Document {
  scheduledReportId?: string
  status: "pending" | "generating" | "completed" | "failed"
  fileUrl?: string
  fileSize?: number // Bytes
  generationTime?: number // Seconds
  sentTo?: string[] // Emails
  generatedAt: string
  expiresAt?: string
}

// ==========================================
// HELPER TYPES
// ==========================================

export type StyleType =
  | "agbada"
  | "kaftan"
  | "plain_kaftan"
  | "senator"
  | "traditional"
  | "modern"
  | "custom"

export type GarmentType =
  | "shirt"
  | "pants"
  | "dress"
  | "suit"
  | "blazer"
  | "skirt"
  | "blouse"
  | "agbada"
  | "kaftan"
  | "plain_kaftan"
  | "senator"
  | "traditional"
  | "custom"

export interface DatabaseCollections {
  // Core
  users: User
  sessions: Session

  // Business
  businesses: Business
  locations: Location

  // Orders
  orders: Order
  order_stages: OrderStage
  order_items: OrderItem

  // Style Catalog
  styles_catalog: StyleCatalog

  // Financial
  invoices: Invoice
  payments: Payment
  expenses: Expense

  // Inventory
  inventory_items: InventoryItem
  inventory_locations: InventoryLocation
  inventory_transactions: InventoryTransaction

  // CRM
  client_segments: ClientSegment
  client_segments_users: ClientSegmentUser
  loyalty_points: LoyaltyPoints
  loyalty_transactions: LoyaltyTransaction

  // Communication
  communications: Communication
  notifications_queue: NotificationQueue

  // Analytics
  kpi_metrics: KPIMetric
  ai_insights: AIInsight

  // Audit
  audit_logs: AuditLog
  security_events: SecurityEvent

  // Reporting
  scheduled_reports: ScheduledReport
  report_history: ReportHistory
}
