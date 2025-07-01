/**
 * Comprehensive Database Schema for Stitch and Wear Tailors
 *
 * This enhanced schema supports both the mobile app and the sophisticated
 * web dashboard with advanced analytics, financial reporting, and business
 * intelligence capabilities.
 */

import { Permission, Role } from "appwrite"

export type AttributeType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "datetime"
  | "email"
  | "ip"
  | "url"
  | "enum"
  | "relationship"

export interface AttributeDefinition {
  key: string
  type: AttributeType
  required: boolean
  default?: any
  size?: number
  array?: boolean
  min?: number
  max?: number
  elements?: string[]
  relatedCollection?: string
  relationType?: "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany"
  twoWay?: boolean
  twoWayKey?: string
  onDelete?: "restrict" | "cascade" | "setNull"
}

export interface IndexDefinition {
  key: string
  type: "key" | "unique" | "fulltext"
  attributes: string[]
  orders?: ("ASC" | "DESC")[]
}

export interface CollectionSchema {
  id: string
  name: string
  enabled: boolean
  documentSecurity: boolean
  permissions: string[]
  attributes: AttributeDefinition[]
  indexes: IndexDefinition[]
}

/**
 * COMPREHENSIVE DATABASE SCHEMA
 * Organized by functional areas to support both mobile app and web dashboard
 */
export const COMPREHENSIVE_DATABASE_SCHEMA: Record<string, CollectionSchema> = {
  // ==========================================
  // CORE USER & AUTHENTICATION
  // ==========================================

  users: {
    id: "users",
    name: "Users",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.any()), Permission.create(Role.users())],
    attributes: [
      { key: "email", type: "email", required: true },
      { key: "role", type: "enum", elements: ["client", "tailor", "admin"], required: true },
      {
        key: "status",
        type: "enum",
        elements: ["active", "inactive", "suspended"],
        required: true,
        default: "active",
      },
      { key: "profile", type: "string", size: 5000, required: false },
      { key: "phoneNumber", type: "string", size: 20, required: false },
      { key: "businessId", type: "string", size: 255, required: false }, // For multi-location support
      { key: "preferredLanguage", type: "string", size: 10, required: false, default: "en" },
      {
        key: "preferredCommunication",
        type: "enum",
        elements: ["email", "sms", "phone", "app"],
        required: false,
        default: "email",
      },
      { key: "twoFactorEnabled", type: "boolean", required: false, default: false },
      { key: "lastLoginAt", type: "datetime", required: false },
      { key: "loginCount", type: "integer", required: false, default: 0 },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "email_unique", type: "unique", attributes: ["email"] },
      { key: "role_index", type: "key", attributes: ["role"] },
      { key: "business_index", type: "key", attributes: ["businessId"] },
      { key: "status_index", type: "key", attributes: ["status"] },
    ],
  },

  sessions: {
    id: "sessions",
    name: "User Sessions",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      { key: "token", type: "string", size: 500, required: true },
      { key: "ipAddress", type: "ip", required: false },
      { key: "userAgent", type: "string", size: 500, required: false },
      { key: "expiresAt", type: "datetime", required: true },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "token_unique", type: "unique", attributes: ["token"] },
      { key: "user_sessions", type: "key", attributes: ["userId"] },
      { key: "expiry_index", type: "key", attributes: ["expiresAt"] },
    ],
  },

  // ==========================================
  // BUSINESS & LOCATION MANAGEMENT
  // ==========================================

  businesses: {
    id: "businesses",
    name: "Businesses",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.user("admin"))],
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      {
        key: "type",
        type: "enum",
        elements: ["single", "franchise", "chain"],
        required: true,
        default: "single",
      },
      { key: "registrationNumber", type: "string", size: 100, required: false },
      { key: "taxId", type: "string", size: 100, required: false },
      { key: "currency", type: "string", size: 10, required: true, default: "USD" },
      { key: "timezone", type: "string", size: 50, required: true, default: "UTC" },
      { key: "settings", type: "string", size: 10000, required: false }, // JSON settings
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "business_name", type: "key", attributes: ["name"] },
      { key: "business_type", type: "key", attributes: ["type"] },
    ],
  },

  locations: {
    id: "locations",
    name: "Business Locations",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.user("admin"))],
    attributes: [
      {
        key: "businessId",
        type: "relationship",
        relatedCollection: "businesses",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "locations",
        onDelete: "cascade",
      },
      { key: "name", type: "string", size: 255, required: true },
      { key: "address", type: "string", size: 500, required: true },
      { key: "city", type: "string", size: 100, required: true },
      { key: "state", type: "string", size: 100, required: false },
      { key: "country", type: "string", size: 100, required: true },
      { key: "postalCode", type: "string", size: 20, required: false },
      { key: "phone", type: "string", size: 20, required: true },
      { key: "email", type: "email", required: true },
      {
        key: "managerId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "setNull",
      },
      { key: "operatingHours", type: "string", size: 1000, required: false }, // JSON
      { key: "isActive", type: "boolean", required: true, default: true },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "location_business", type: "key", attributes: ["businessId"] },
      { key: "location_active", type: "key", attributes: ["isActive"] },
      { key: "location_city", type: "key", attributes: ["city"] },
    ],
  },

  // ==========================================
  // ENHANCED ORDER MANAGEMENT
  // ==========================================

  orders: {
    id: "orders",
    name: "Orders",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      { key: "orderNumber", type: "string", size: 50, required: true },
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "orders",
        onDelete: "cascade",
      },
      {
        key: "tailorId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "tailorOrders",
        onDelete: "setNull",
      },
      {
        key: "locationId",
        type: "relationship",
        relatedCollection: "locations",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "restrict",
      },
      { key: "type", type: "enum", elements: ["custom", "alteration", "repair"], required: true },
      {
        key: "status",
        type: "enum",
        elements: ["pending", "confirmed", "in_progress", "ready", "delivered", "cancelled"],
        required: true,
        default: "pending",
      },
      {
        key: "priority",
        type: "enum",
        elements: ["low", "normal", "high", "urgent"],
        required: true,
        default: "normal",
      },
      {
        key: "source",
        type: "enum",
        elements: ["in_store", "online", "phone", "referral"],
        required: false,
        default: "in_store",
      },
      {
        key: "style",
        type: "enum",
        elements: [
          "agbada",
          "kaftan",
          "plain_kaftan",
          "senator",
          "traditional",
          "modern",
          "custom",
        ],
        required: false,
      },
      { key: "fabric", type: "string", size: 255, required: false },
      { key: "subtotal", type: "float", required: true, min: 0 },
      { key: "taxAmount", type: "float", required: false, min: 0, default: 0 },
      { key: "discountAmount", type: "float", required: false, min: 0, default: 0 },
      { key: "totalAmount", type: "float", required: true, min: 0 },
      { key: "depositAmount", type: "float", required: false, min: 0, default: 0 },
      { key: "balanceAmount", type: "float", required: false, min: 0 },
      { key: "rushFee", type: "float", required: false, min: 0, default: 0 },
      { key: "notes", type: "string", size: 2000, required: false },
      { key: "internalNotes", type: "string", size: 2000, required: false },
      { key: "tags", type: "string", size: 500, required: false, array: true },
      { key: "orderDate", type: "datetime", required: true },
      { key: "deliveryDate", type: "datetime", required: false },
      { key: "actualDeliveryDate", type: "datetime", required: false },
      { key: "cancelledAt", type: "datetime", required: false },
      { key: "cancellationReason", type: "string", size: 500, required: false },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "order_number_unique", type: "unique", attributes: ["orderNumber"] },
      { key: "user_orders", type: "key", attributes: ["userId"] },
      { key: "tailor_orders", type: "key", attributes: ["tailorId"] },
      { key: "status_index", type: "key", attributes: ["status"] },
      { key: "priority_index", type: "key", attributes: ["priority"] },
      { key: "delivery_date", type: "key", attributes: ["deliveryDate"] },
      { key: "order_date", type: "key", attributes: ["orderDate"] },
      { key: "location_orders", type: "key", attributes: ["locationId"] },
    ],
  },

  order_stages: {
    id: "order_stages",
    name: "Order Stage Tracking",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      {
        key: "orderId",
        type: "relationship",
        relatedCollection: "orders",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "stages",
        onDelete: "cascade",
      },
      {
        key: "stage",
        type: "enum",
        elements: [
          "received",
          "measured",
          "cutting",
          "sewing",
          "finishing",
          "quality_check",
          "completed",
        ],
        required: true,
      },
      {
        key: "status",
        type: "enum",
        elements: ["pending", "in_progress", "completed", "skipped"],
        required: true,
      },
      { key: "startedAt", type: "datetime", required: false },
      { key: "completedAt", type: "datetime", required: false },
      {
        key: "completedBy",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "setNull",
      },
      { key: "duration", type: "integer", required: false }, // Minutes
      { key: "notes", type: "string", size: 1000, required: false },
      { key: "qualityScore", type: "integer", required: false, min: 0, max: 100 },
      { key: "photos", type: "string", size: 500, required: false, array: true }, // URLs
    ],
    indexes: [
      { key: "order_stages", type: "key", attributes: ["orderId"] },
      { key: "stage_status", type: "key", attributes: ["stage", "status"] },
      { key: "completed_by", type: "key", attributes: ["completedBy"] },
    ],
  },

  // ==========================================
  // FINANCIAL MANAGEMENT
  // ==========================================

  invoices: {
    id: "invoices",
    name: "Invoices",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      { key: "invoiceNumber", type: "string", size: 50, required: true },
      {
        key: "orderId",
        type: "relationship",
        relatedCollection: "orders",
        relationType: "oneToOne",
        twoWay: true,
        twoWayKey: "invoice",
        onDelete: "cascade",
      },
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      {
        key: "status",
        type: "enum",
        elements: ["draft", "sent", "viewed", "paid", "partial", "overdue", "cancelled"],
        required: true,
        default: "draft",
      },
      { key: "subtotal", type: "float", required: true, min: 0 },
      { key: "taxAmount", type: "float", required: false, min: 0, default: 0 },
      { key: "discountAmount", type: "float", required: false, min: 0, default: 0 },
      { key: "totalAmount", type: "float", required: true, min: 0 },
      { key: "paidAmount", type: "float", required: false, min: 0, default: 0 },
      { key: "balanceAmount", type: "float", required: false, min: 0 },
      { key: "currency", type: "string", size: 10, required: true, default: "USD" },
      { key: "exchangeRate", type: "float", required: false, default: 1 },
      { key: "invoiceDate", type: "datetime", required: true },
      { key: "dueDate", type: "datetime", required: true },
      { key: "paidDate", type: "datetime", required: false },
      { key: "terms", type: "string", size: 2000, required: false },
      { key: "notes", type: "string", size: 2000, required: false },
      { key: "sentAt", type: "datetime", required: false },
      { key: "viewedAt", type: "datetime", required: false },
      { key: "remindersSent", type: "integer", required: false, default: 0 },
      { key: "lastReminderAt", type: "datetime", required: false },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "invoice_number_unique", type: "unique", attributes: ["invoiceNumber"] },
      { key: "invoice_order", type: "key", attributes: ["orderId"] },
      { key: "invoice_user", type: "key", attributes: ["userId"] },
      { key: "invoice_status", type: "key", attributes: ["status"] },
      { key: "invoice_due", type: "key", attributes: ["dueDate"] },
      { key: "invoice_date", type: "key", attributes: ["invoiceDate"] },
    ],
  },

  payments: {
    id: "payments",
    name: "Payments",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      { key: "paymentNumber", type: "string", size: 50, required: true },
      {
        key: "invoiceId",
        type: "relationship",
        relatedCollection: "invoices",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "payments",
        onDelete: "restrict",
      },
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      { key: "amount", type: "float", required: true, min: 0 },
      { key: "currency", type: "string", size: 10, required: true, default: "USD" },
      {
        key: "method",
        type: "enum",
        elements: [
          "cash",
          "credit_card",
          "debit_card",
          "bank_transfer",
          "check",
          "digital_wallet",
          "other",
        ],
        required: true,
      },
      {
        key: "status",
        type: "enum",
        elements: ["pending", "processing", "completed", "failed", "refunded"],
        required: true,
        default: "pending",
      },
      { key: "transactionId", type: "string", size: 255, required: false },
      { key: "processorResponse", type: "string", size: 2000, required: false }, // JSON
      { key: "refundAmount", type: "float", required: false, min: 0, default: 0 },
      { key: "notes", type: "string", size: 1000, required: false },
      { key: "paymentDate", type: "datetime", required: true },
      { key: "processedAt", type: "datetime", required: false },
      { key: "failedAt", type: "datetime", required: false },
      { key: "refundedAt", type: "datetime", required: false },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "payment_number_unique", type: "unique", attributes: ["paymentNumber"] },
      { key: "payment_invoice", type: "key", attributes: ["invoiceId"] },
      { key: "payment_user", type: "key", attributes: ["userId"] },
      { key: "payment_status", type: "key", attributes: ["status"] },
      { key: "payment_date", type: "key", attributes: ["paymentDate"] },
      { key: "payment_method", type: "key", attributes: ["method"] },
    ],
  },

  expenses: {
    id: "expenses",
    name: "Business Expenses",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.user("admin"))],
    attributes: [
      {
        key: "locationId",
        type: "relationship",
        relatedCollection: "locations",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "restrict",
      },
      {
        key: "category",
        type: "enum",
        elements: [
          "fabric",
          "labor",
          "equipment",
          "utilities",
          "rent",
          "marketing",
          "supplies",
          "other",
        ],
        required: true,
      },
      { key: "subcategory", type: "string", size: 100, required: false },
      { key: "description", type: "string", size: 500, required: true },
      { key: "amount", type: "float", required: true, min: 0 },
      { key: "currency", type: "string", size: 10, required: true, default: "USD" },
      { key: "vendor", type: "string", size: 255, required: false },
      { key: "invoiceNumber", type: "string", size: 100, required: false },
      {
        key: "paymentMethod",
        type: "enum",
        elements: ["cash", "credit_card", "bank_transfer", "check", "other"],
        required: false,
      },
      { key: "isRecurring", type: "boolean", required: false, default: false },
      {
        key: "recurringFrequency",
        type: "enum",
        elements: ["daily", "weekly", "monthly", "quarterly", "yearly"],
        required: false,
      },
      { key: "attachments", type: "string", size: 500, required: false, array: true }, // URLs
      { key: "notes", type: "string", size: 1000, required: false },
      { key: "expenseDate", type: "datetime", required: true },
      {
        key: "createdBy",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "setNull",
      },
      {
        key: "approvedBy",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "setNull",
      },
      { key: "approvedAt", type: "datetime", required: false },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "expense_location", type: "key", attributes: ["locationId"] },
      { key: "expense_category", type: "key", attributes: ["category"] },
      { key: "expense_date", type: "key", attributes: ["expenseDate"] },
      { key: "expense_recurring", type: "key", attributes: ["isRecurring"] },
    ],
  },

  // ==========================================
  // STYLE & GARMENT CATALOG
  // ==========================================

  styles_catalog: {
    id: "styles_catalog",
    name: "Styles Catalog",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.any()), Permission.write(Role.user("admin"))],
    attributes: [
      { key: "code", type: "string", size: 50, required: true },
      { key: "name", type: "string", size: 100, required: true },
      {
        key: "category",
        type: "enum",
        elements: [
          "agbada",
          "kaftan",
          "plain_kaftan",
          "senator",
          "traditional",
          "modern",
          "western",
          "custom",
        ],
        required: true,
      },
      { key: "description", type: "string", size: 1000, required: false },
      { key: "basePrice", type: "float", required: true, min: 0 },
      { key: "estimatedHours", type: "float", required: false, min: 0 },
      { key: "fabricRequirement", type: "float", required: false, min: 0 }, // Meters
      {
        key: "skillLevel",
        type: "enum",
        elements: ["beginner", "intermediate", "advanced", "expert"],
        required: false,
        default: "intermediate",
      },
      {
        key: "gender",
        type: "enum",
        elements: ["male", "female", "unisex"],
        required: false,
        default: "unisex",
      },
      {
        key: "ageGroup",
        type: "enum",
        elements: ["child", "teen", "adult", "all"],
        required: false,
        default: "adult",
      },
      { key: "images", type: "string", size: 500, required: false, array: true }, // URLs
      { key: "measurements", type: "string", size: 2000, required: false }, // JSON of required measurements
      { key: "customizationOptions", type: "string", size: 2000, required: false }, // JSON
      { key: "tags", type: "string", size: 50, required: false, array: true },
      { key: "popularity", type: "integer", required: false, default: 0 },
      { key: "isActive", type: "boolean", required: true, default: true },
      { key: "isFeatured", type: "boolean", required: false, default: false },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "style_code_unique", type: "unique", attributes: ["code"] },
      { key: "style_category", type: "key", attributes: ["category"] },
      { key: "style_active", type: "key", attributes: ["isActive"] },
      { key: "style_featured", type: "key", attributes: ["isFeatured"] },
      { key: "style_name", type: "fulltext", attributes: ["name"] },
    ],
  },

  // ==========================================
  // INVENTORY MANAGEMENT
  // ==========================================

  inventory_items: {
    id: "inventory_items",
    name: "Inventory Items",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.users())],
    attributes: [
      { key: "sku", type: "string", size: 100, required: true },
      { key: "name", type: "string", size: 255, required: true },
      { key: "description", type: "string", size: 1000, required: false },
      {
        key: "category",
        type: "enum",
        elements: ["fabric", "button", "zipper", "thread", "lining", "accessory", "other"],
        required: true,
      },
      { key: "subcategory", type: "string", size: 100, required: false },
      {
        key: "unit",
        type: "enum",
        elements: ["meter", "yard", "piece", "roll", "spool", "box"],
        required: true,
      },
      { key: "unitCost", type: "float", required: true, min: 0 },
      { key: "sellingPrice", type: "float", required: false, min: 0 },
      { key: "currency", type: "string", size: 10, required: true, default: "USD" },
      { key: "minimumStock", type: "float", required: false, min: 0, default: 0 },
      { key: "maximumStock", type: "float", required: false, min: 0 },
      { key: "reorderPoint", type: "float", required: false, min: 0 },
      { key: "reorderQuantity", type: "float", required: false, min: 0 },
      { key: "supplier", type: "string", size: 255, required: false },
      { key: "supplierSku", type: "string", size: 100, required: false },
      { key: "leadTime", type: "integer", required: false, min: 0 }, // Days
      { key: "color", type: "string", size: 50, required: false },
      { key: "pattern", type: "string", size: 100, required: false },
      { key: "weight", type: "float", required: false, min: 0 },
      { key: "width", type: "float", required: false, min: 0 },
      { key: "composition", type: "string", size: 255, required: false },
      { key: "careInstructions", type: "string", size: 500, required: false },
      { key: "tags", type: "string", size: 50, required: false, array: true },
      { key: "images", type: "string", size: 500, required: false, array: true }, // URLs
      { key: "isActive", type: "boolean", required: true, default: true },
      { key: "discontinuedAt", type: "datetime", required: false },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "sku_unique", type: "unique", attributes: ["sku"] },
      { key: "inventory_category", type: "key", attributes: ["category"] },
      { key: "inventory_active", type: "key", attributes: ["isActive"] },
      { key: "inventory_supplier", type: "key", attributes: ["supplier"] },
      { key: "inventory_name", type: "fulltext", attributes: ["name"] },
    ],
  },

  inventory_locations: {
    id: "inventory_locations",
    name: "Inventory by Location",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.users())],
    attributes: [
      {
        key: "inventoryItemId",
        type: "relationship",
        relatedCollection: "inventory_items",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "locations",
        onDelete: "cascade",
      },
      {
        key: "locationId",
        type: "relationship",
        relatedCollection: "locations",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      { key: "quantity", type: "float", required: true, min: 0, default: 0 },
      { key: "reservedQuantity", type: "float", required: false, min: 0, default: 0 },
      { key: "availableQuantity", type: "float", required: false, min: 0, default: 0 },
      { key: "binLocation", type: "string", size: 100, required: false },
      { key: "lastCountDate", type: "datetime", required: false },
      { key: "lastCountQuantity", type: "float", required: false, min: 0 },
      { key: "notes", type: "string", size: 500, required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "inventory_location", type: "key", attributes: ["inventoryItemId", "locationId"] },
      { key: "location_inventory", type: "key", attributes: ["locationId"] },
      { key: "low_stock", type: "key", attributes: ["availableQuantity"] },
    ],
  },

  inventory_transactions: {
    id: "inventory_transactions",
    name: "Inventory Transactions",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      {
        key: "inventoryItemId",
        type: "relationship",
        relatedCollection: "inventory_items",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "restrict",
      },
      {
        key: "locationId",
        type: "relationship",
        relatedCollection: "locations",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "restrict",
      },
      {
        key: "type",
        type: "enum",
        elements: ["purchase", "sale", "adjustment", "transfer", "return", "damage", "sample"],
        required: true,
      },
      { key: "quantity", type: "float", required: true }, // Can be negative for outgoing
      { key: "unitCost", type: "float", required: false, min: 0 },
      { key: "totalCost", type: "float", required: false },
      {
        key: "referenceType",
        type: "enum",
        elements: ["order", "purchase_order", "adjustment", "transfer"],
        required: false,
      },
      { key: "referenceId", type: "string", size: 100, required: false },
      { key: "reason", type: "string", size: 500, required: false },
      {
        key: "performedBy",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "setNull",
      },
      { key: "transactionDate", type: "datetime", required: true },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "transaction_item", type: "key", attributes: ["inventoryItemId"] },
      { key: "transaction_location", type: "key", attributes: ["locationId"] },
      { key: "transaction_type", type: "key", attributes: ["type"] },
      { key: "transaction_date", type: "key", attributes: ["transactionDate"] },
      { key: "transaction_reference", type: "key", attributes: ["referenceType", "referenceId"] },
    ],
  },

  // ==========================================
  // CUSTOMER RELATIONSHIP MANAGEMENT
  // ==========================================

  client_segments: {
    id: "client_segments",
    name: "Client Segments",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.user("admin"))],
    attributes: [
      { key: "name", type: "string", size: 100, required: true },
      { key: "description", type: "string", size: 500, required: false },
      {
        key: "type",
        type: "enum",
        elements: ["value", "behavior", "demographic", "custom"],
        required: true,
      },
      { key: "criteria", type: "string", size: 2000, required: true }, // JSON rules
      { key: "benefits", type: "string", size: 2000, required: false }, // JSON array
      { key: "color", type: "string", size: 20, required: false }, // For UI display
      { key: "icon", type: "string", size: 50, required: false },
      { key: "priority", type: "integer", required: false, min: 1, default: 100 },
      { key: "isActive", type: "boolean", required: true, default: true },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "segment_name", type: "key", attributes: ["name"] },
      { key: "segment_type", type: "key", attributes: ["type"] },
      { key: "segment_active", type: "key", attributes: ["isActive"] },
    ],
  },

  client_segments_users: {
    id: "client_segments_users",
    name: "Client Segment Memberships",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.users())],
    attributes: [
      {
        key: "segmentId",
        type: "relationship",
        relatedCollection: "client_segments",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "users",
        onDelete: "cascade",
      },
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "segments",
        onDelete: "cascade",
      },
      { key: "assignedAt", type: "datetime", required: true },
      { key: "expiresAt", type: "datetime", required: false },
      { key: "manualOverride", type: "boolean", required: false, default: false },
      { key: "notes", type: "string", size: 500, required: false },
    ],
    indexes: [
      { key: "segment_users", type: "key", attributes: ["segmentId"] },
      { key: "user_segments", type: "key", attributes: ["userId"] },
      { key: "segment_expiry", type: "key", attributes: ["expiresAt"] },
    ],
  },

  loyalty_points: {
    id: "loyalty_points",
    name: "Loyalty Points",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "loyaltyPoints",
        onDelete: "cascade",
      },
      { key: "points", type: "integer", required: true, default: 0 },
      { key: "lifetimePoints", type: "integer", required: false, default: 0 },
      {
        key: "tier",
        type: "enum",
        elements: ["bronze", "silver", "gold", "platinum"],
        required: false,
        default: "bronze",
      },
      { key: "tierExpiryDate", type: "datetime", required: false },
      { key: "lastActivityDate", type: "datetime", required: false },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "loyalty_user", type: "unique", attributes: ["userId"] },
      { key: "loyalty_tier", type: "key", attributes: ["tier"] },
      { key: "loyalty_points", type: "key", attributes: ["points"] },
    ],
  },

  loyalty_transactions: {
    id: "loyalty_transactions",
    name: "Loyalty Transactions",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      {
        key: "type",
        type: "enum",
        elements: ["earned", "redeemed", "expired", "adjusted"],
        required: true,
      },
      { key: "points", type: "integer", required: true }, // Can be negative for redemptions
      { key: "balance", type: "integer", required: true }, // Balance after transaction
      {
        key: "source",
        type: "enum",
        elements: ["order", "referral", "promotion", "manual", "system"],
        required: true,
      },
      { key: "referenceId", type: "string", size: 100, required: false },
      { key: "description", type: "string", size: 500, required: true },
      { key: "expiresAt", type: "datetime", required: false },
      { key: "transactionDate", type: "datetime", required: true },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "loyalty_trans_user", type: "key", attributes: ["userId"] },
      { key: "loyalty_trans_type", type: "key", attributes: ["type"] },
      { key: "loyalty_trans_date", type: "key", attributes: ["transactionDate"] },
      { key: "loyalty_trans_source", type: "key", attributes: ["source"] },
    ],
  },

  // ==========================================
  // COMMUNICATION & COLLABORATION
  // ==========================================

  communications: {
    id: "communications",
    name: "Communications",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      {
        key: "type",
        type: "enum",
        elements: ["email", "sms", "call", "in_person", "app_message", "whatsapp"],
        required: true,
      },
      { key: "direction", type: "enum", elements: ["inbound", "outbound"], required: true },
      {
        key: "status",
        type: "enum",
        elements: ["pending", "sent", "delivered", "failed", "read"],
        required: true,
        default: "pending",
      },
      {
        key: "fromUserId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      {
        key: "toUserId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      { key: "subject", type: "string", size: 500, required: false },
      { key: "content", type: "string", size: 10000, required: true },
      { key: "metadata", type: "string", size: 2000, required: false }, // JSON for additional data
      {
        key: "referenceType",
        type: "enum",
        elements: ["order", "appointment", "invoice", "general"],
        required: false,
      },
      { key: "referenceId", type: "string", size: 100, required: false },
      { key: "attachments", type: "string", size: 500, required: false, array: true }, // URLs
      { key: "scheduledFor", type: "datetime", required: false },
      { key: "sentAt", type: "datetime", required: false },
      { key: "deliveredAt", type: "datetime", required: false },
      { key: "readAt", type: "datetime", required: false },
      { key: "failureReason", type: "string", size: 500, required: false },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "comm_from", type: "key", attributes: ["fromUserId"] },
      { key: "comm_to", type: "key", attributes: ["toUserId"] },
      { key: "comm_type", type: "key", attributes: ["type"] },
      { key: "comm_status", type: "key", attributes: ["status"] },
      { key: "comm_reference", type: "key", attributes: ["referenceType", "referenceId"] },
      { key: "comm_scheduled", type: "key", attributes: ["scheduledFor"] },
    ],
  },

  notifications_queue: {
    id: "notifications_queue",
    name: "Notification Queue",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      {
        key: "type",
        type: "enum",
        elements: [
          "order_update",
          "appointment_reminder",
          "payment_due",
          "promotion",
          "system",
          "message",
        ],
        required: true,
      },
      {
        key: "channel",
        type: "enum",
        elements: ["in_app", "email", "sms", "push"],
        required: true,
      },
      {
        key: "priority",
        type: "enum",
        elements: ["low", "normal", "high", "urgent"],
        required: true,
        default: "normal",
      },
      { key: "title", type: "string", size: 255, required: true },
      { key: "message", type: "string", size: 2000, required: true },
      { key: "data", type: "string", size: 5000, required: false }, // JSON payload
      { key: "actionUrl", type: "string", size: 500, required: false },
      {
        key: "status",
        type: "enum",
        elements: ["pending", "sent", "delivered", "failed", "cancelled"],
        required: true,
        default: "pending",
      },
      { key: "scheduledFor", type: "datetime", required: false },
      { key: "sentAt", type: "datetime", required: false },
      { key: "deliveredAt", type: "datetime", required: false },
      { key: "readAt", type: "datetime", required: false },
      { key: "failureReason", type: "string", size: 500, required: false },
      { key: "retryCount", type: "integer", required: false, default: 0 },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "notif_user", type: "key", attributes: ["userId"] },
      { key: "notif_status", type: "key", attributes: ["status"] },
      { key: "notif_type", type: "key", attributes: ["type"] },
      { key: "notif_scheduled", type: "key", attributes: ["scheduledFor"] },
      { key: "notif_priority", type: "key", attributes: ["priority"] },
    ],
  },

  // ==========================================
  // BUSINESS INTELLIGENCE & ANALYTICS
  // ==========================================

  kpi_metrics: {
    id: "kpi_metrics",
    name: "KPI Metrics",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.user("admin"))],
    attributes: [
      {
        key: "locationId",
        type: "relationship",
        relatedCollection: "locations",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      {
        key: "metricType",
        type: "enum",
        elements: ["revenue", "orders", "clients", "inventory", "quality", "efficiency"],
        required: true,
      },
      { key: "metricName", type: "string", size: 100, required: true },
      { key: "value", type: "float", required: true },
      { key: "unit", type: "string", size: 20, required: false },
      {
        key: "period",
        type: "enum",
        elements: ["daily", "weekly", "monthly", "quarterly", "yearly"],
        required: true,
      },
      { key: "periodStart", type: "datetime", required: true },
      { key: "periodEnd", type: "datetime", required: true },
      { key: "previousValue", type: "float", required: false },
      { key: "target", type: "float", required: false },
      { key: "trend", type: "enum", elements: ["up", "down", "stable"], required: false },
      { key: "percentageChange", type: "float", required: false },
      { key: "metadata", type: "string", size: 2000, required: false }, // JSON for additional context
      { key: "calculatedAt", type: "datetime", required: true },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "kpi_location", type: "key", attributes: ["locationId"] },
      { key: "kpi_type", type: "key", attributes: ["metricType"] },
      { key: "kpi_name", type: "key", attributes: ["metricName"] },
      { key: "kpi_period", type: "key", attributes: ["period", "periodStart"] },
      { key: "kpi_calculated", type: "key", attributes: ["calculatedAt"] },
    ],
  },

  ai_insights: {
    id: "ai_insights",
    name: "AI Generated Insights",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.user("admin"))],
    attributes: [
      {
        key: "insightType",
        type: "enum",
        elements: [
          "revenue_optimization",
          "operational_efficiency",
          "client_satisfaction",
          "inventory_management",
          "growth_opportunity",
          "risk_alert",
        ],
        required: true,
      },
      { key: "category", type: "string", size: 100, required: true },
      { key: "title", type: "string", size: 500, required: true },
      { key: "summary", type: "string", size: 2000, required: true },
      { key: "analysis", type: "string", size: 10000, required: true },
      { key: "recommendations", type: "string", size: 5000, required: true, array: true },
      { key: "impact", type: "string", size: 2000, required: false }, // JSON array of impacts
      { key: "confidence", type: "float", required: true, min: 0, max: 100 },
      {
        key: "priority",
        type: "enum",
        elements: ["low", "medium", "high", "critical"],
        required: true,
      },
      {
        key: "status",
        type: "enum",
        elements: ["new", "reviewed", "actioned", "dismissed"],
        required: true,
        default: "new",
      },
      {
        key: "locationId",
        type: "relationship",
        relatedCollection: "locations",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      { key: "validFrom", type: "datetime", required: true },
      { key: "validUntil", type: "datetime", required: false },
      { key: "generatedBy", type: "string", size: 100, required: true, default: "claude-ai" },
      {
        key: "reviewedBy",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "setNull",
      },
      { key: "reviewedAt", type: "datetime", required: false },
      { key: "actionTaken", type: "string", size: 2000, required: false },
      { key: "createdAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "insight_type", type: "key", attributes: ["insightType"] },
      { key: "insight_category", type: "key", attributes: ["category"] },
      { key: "insight_priority", type: "key", attributes: ["priority"] },
      { key: "insight_status", type: "key", attributes: ["status"] },
      { key: "insight_location", type: "key", attributes: ["locationId"] },
      { key: "insight_valid", type: "key", attributes: ["validFrom", "validUntil"] },
    ],
  },

  // ==========================================
  // AUDIT & SECURITY
  // ==========================================

  audit_logs: {
    id: "audit_logs",
    name: "Audit Logs",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.user("admin")), Permission.create(Role.users())],
    attributes: [
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      { key: "action", type: "string", size: 100, required: true },
      { key: "resource", type: "string", size: 100, required: true },
      { key: "resourceId", type: "string", size: 100, required: false },
      { key: "changes", type: "string", size: 10000, required: false }, // JSON diff
      { key: "ipAddress", type: "ip", required: false },
      { key: "userAgent", type: "string", size: 500, required: false },
      {
        key: "locationId",
        type: "relationship",
        relatedCollection: "locations",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "setNull",
      },
      {
        key: "severity",
        type: "enum",
        elements: ["info", "warning", "error", "critical"],
        required: true,
        default: "info",
      },
      { key: "metadata", type: "string", size: 2000, required: false }, // JSON additional data
      { key: "timestamp", type: "datetime", required: true },
    ],
    indexes: [
      { key: "audit_user", type: "key", attributes: ["userId"] },
      { key: "audit_action", type: "key", attributes: ["action"] },
      { key: "audit_resource", type: "key", attributes: ["resource"] },
      { key: "audit_timestamp", type: "key", attributes: ["timestamp"] },
      { key: "audit_severity", type: "key", attributes: ["severity"] },
    ],
  },

  security_events: {
    id: "security_events",
    name: "Security Events",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.user("admin")), Permission.create(Role.users())],
    attributes: [
      {
        key: "eventType",
        type: "enum",
        elements: [
          "login_success",
          "login_failure",
          "password_reset",
          "permission_change",
          "suspicious_activity",
          "data_export",
          "api_limit_exceeded",
        ],
        required: true,
      },
      {
        key: "userId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      { key: "ipAddress", type: "ip", required: false },
      { key: "userAgent", type: "string", size: 500, required: false },
      { key: "details", type: "string", size: 2000, required: false },
      { key: "riskScore", type: "integer", required: false, min: 0, max: 100 },
      { key: "blocked", type: "boolean", required: false, default: false },
      { key: "timestamp", type: "datetime", required: true },
    ],
    indexes: [
      { key: "security_type", type: "key", attributes: ["eventType"] },
      { key: "security_user", type: "key", attributes: ["userId"] },
      { key: "security_timestamp", type: "key", attributes: ["timestamp"] },
      { key: "security_risk", type: "key", attributes: ["riskScore"] },
    ],
  },

  // ==========================================
  // REPORTING & EXPORTS
  // ==========================================

  scheduled_reports: {
    id: "scheduled_reports",
    name: "Scheduled Reports",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.write(Role.user("admin"))],
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "description", type: "string", size: 1000, required: false },
      {
        key: "reportType",
        type: "enum",
        elements: ["financial", "operational", "inventory", "customer", "custom"],
        required: true,
      },
      { key: "parameters", type: "string", size: 5000, required: true }, // JSON configuration
      { key: "schedule", type: "string", size: 100, required: true }, // Cron expression
      {
        key: "format",
        type: "enum",
        elements: ["pdf", "excel", "csv", "json"],
        required: true,
        default: "pdf",
      },
      { key: "recipients", type: "string", size: 100, required: true, array: true }, // Email addresses
      {
        key: "locationId",
        type: "relationship",
        relatedCollection: "locations",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      { key: "isActive", type: "boolean", required: true, default: true },
      { key: "lastRunAt", type: "datetime", required: false },
      {
        key: "lastRunStatus",
        type: "enum",
        elements: ["success", "failure", "running"],
        required: false,
      },
      { key: "nextRunAt", type: "datetime", required: false },
      {
        key: "createdBy",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "setNull",
      },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "report_type", type: "key", attributes: ["reportType"] },
      { key: "report_active", type: "key", attributes: ["isActive"] },
      { key: "report_next_run", type: "key", attributes: ["nextRunAt"] },
      { key: "report_location", type: "key", attributes: ["locationId"] },
    ],
  },

  report_history: {
    id: "report_history",
    name: "Report History",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      {
        key: "scheduledReportId",
        type: "relationship",
        relatedCollection: "scheduled_reports",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "history",
        onDelete: "cascade",
      },
      {
        key: "status",
        type: "enum",
        elements: ["pending", "generating", "completed", "failed"],
        required: true,
      },
      { key: "fileUrl", type: "url", required: false },
      { key: "fileSize", type: "integer", required: false }, // Bytes
      { key: "generationTime", type: "integer", required: false }, // Seconds
      { key: "error", type: "string", size: 2000, required: false },
      { key: "sentTo", type: "string", size: 100, required: false, array: true },
      { key: "generatedAt", type: "datetime", required: true },
      { key: "expiresAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "history_report", type: "key", attributes: ["scheduledReportId"] },
      { key: "history_status", type: "key", attributes: ["status"] },
      { key: "history_generated", type: "key", attributes: ["generatedAt"] },
      { key: "history_expires", type: "key", attributes: ["expiresAt"] },
    ],
  },
}

/**
 * Helper function to get all collection IDs
 */
export function getComprehensiveCollectionIds(): string[] {
  return Object.keys(COMPREHENSIVE_DATABASE_SCHEMA)
}

/**
 * Helper function to validate a document against its schema
 */
export function validateComprehensiveDocument(
  collectionId: string,
  document: Record<string, any>,
): { valid: boolean; errors: string[] } {
  const schema = COMPREHENSIVE_DATABASE_SCHEMA[collectionId]
  if (!schema) {
    return { valid: false, errors: [`Collection ${collectionId} not found`] }
  }

  const errors: string[] = []

  for (const attr of schema.attributes) {
    if (attr.required && !(attr.key in document)) {
      errors.push(`Required field ${attr.key} is missing`)
    }

    if (attr.key in document) {
      const value = document[attr.key]

      // Type validation
      switch (attr.type) {
        case "string":
        case "email":
        case "url":
        case "ip":
          if (typeof value !== "string") {
            errors.push(`Field ${attr.key} must be a string`)
          } else if (attr.size && value.length > attr.size) {
            errors.push(`Field ${attr.key} exceeds maximum length of ${attr.size}`)
          }
          break

        case "integer":
          if (!Number.isInteger(value)) {
            errors.push(`Field ${attr.key} must be an integer`)
          } else {
            if (attr.min !== undefined && value < attr.min) {
              errors.push(`Field ${attr.key} must be at least ${attr.min}`)
            }
            if (attr.max !== undefined && value > attr.max) {
              errors.push(`Field ${attr.key} must be at most ${attr.max}`)
            }
          }
          break

        case "float":
          if (typeof value !== "number") {
            errors.push(`Field ${attr.key} must be a number`)
          } else {
            if (attr.min !== undefined && value < attr.min) {
              errors.push(`Field ${attr.key} must be at least ${attr.min}`)
            }
            if (attr.max !== undefined && value > attr.max) {
              errors.push(`Field ${attr.key} must be at most ${attr.max}`)
            }
          }
          break

        case "boolean":
          if (typeof value !== "boolean") {
            errors.push(`Field ${attr.key} must be a boolean`)
          }
          break

        case "enum":
          if (!attr.elements?.includes(value)) {
            errors.push(`Field ${attr.key} must be one of: ${attr.elements?.join(", ")}`)
          }
          break

        case "datetime":
          if (!(value instanceof Date) && !Date.parse(value)) {
            errors.push(`Field ${attr.key} must be a valid date`)
          }
          break
      }

      // Array validation
      if (attr.array && !Array.isArray(value)) {
        errors.push(`Field ${attr.key} must be an array`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Get collection permissions for a user role
 */
export function getComprehensiveCollectionPermissions(
  collectionId: string,
  userId?: string,
  role?: "client" | "tailor" | "admin",
): string[] {
  const schema = COMPREHENSIVE_DATABASE_SCHEMA[collectionId]
  if (!schema) return []

  const permissions: string[] = []

  // Default permissions from schema
  permissions.push(...schema.permissions)

  // Additional role-based permissions
  if (role === "admin") {
    permissions.push(Permission.write(Role.user(userId!)))
    permissions.push(Permission.delete(Role.user(userId!)))
  } else if (role === "tailor") {
    // Tailors can manage their own data
    if (["orders", "measurements", "appointments"].includes(collectionId)) {
      permissions.push(Permission.write(Role.user(userId!)))
    }
  }

  return [...new Set(permissions)] // Remove duplicates
}

/**
 * Export comprehensive schema metadata for documentation
 */
export const COMPREHENSIVE_SCHEMA_METADATA = {
  version: "2.0.0",
  lastUpdated: new Date().toISOString(),
  totalCollections: Object.keys(COMPREHENSIVE_DATABASE_SCHEMA).length,
  categories: {
    core: ["users", "sessions", "businesses", "locations"],
    orders: ["orders", "order_stages", "order_items"],
    financial: ["invoices", "payments", "expenses"],
    inventory: ["inventory_items", "inventory_locations", "inventory_transactions", "fabrics"],
    crm: [
      "measurements",
      "appointments",
      "reviews",
      "favorites",
      "progress_updates",
      "client_segments",
      "client_segments_users",
      "loyalty_points",
      "loyalty_transactions",
    ],
    communication: ["notifications", "communications", "notifications_queue"],
    analytics: ["kpi_metrics", "ai_insights"],
    audit: ["audit_logs", "security_events"],
    reporting: ["scheduled_reports", "report_history"],
  },
  features: {
    multiLocation: true,
    multiCurrency: true,
    inventoryTracking: true,
    loyaltyProgram: true,
    aiInsights: true,
    advancedAnalytics: true,
    auditLogging: true,
    scheduledReporting: true,
  },
}
