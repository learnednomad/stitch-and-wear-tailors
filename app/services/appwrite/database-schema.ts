/**
 * Database Schema Definitions
 *
 * Defines the complete schema for all Appwrite collections including
 * attributes, indexes, and relationships for the Stitch and Wear Tailors app.
 */

import { Permission, Role } from "appwrite"

/**
 * Attribute types supported by Appwrite
 */
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

/**
 * Base attribute definition
 */
export interface AttributeDefinition {
  key: string
  type: AttributeType
  required: boolean
  array?: boolean
  size?: number
  default?: any
  min?: number
  max?: number
  elements?: string[] // For enum type
  relatedCollection?: string // For relationship type
  relationType?: "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany"
  twoWay?: boolean
  twoWayKey?: string
  onDelete?: "restrict" | "cascade" | "setNull"
}

/**
 * Index definition
 */
export interface IndexDefinition {
  key: string
  type: "key" | "unique" | "fulltext"
  attributes: string[]
  orders?: Array<"ASC" | "DESC">
}

/**
 * Collection schema definition
 */
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
 * Database schema for all collections
 */
export const DATABASE_SCHEMA: Record<string, CollectionSchema> = {
  // Users Collection
  users: {
    id: "users",
    name: "Users",
    enabled: true,
    documentSecurity: true,
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.user("{document}")),
      Permission.delete(Role.user("{document}")),
    ],
    attributes: [
      { key: "email", type: "email", required: true },
      { key: "role", type: "enum", required: true, elements: ["client", "tailor", "admin"] },
      { key: "firstName", type: "string", required: true, size: 100 },
      { key: "lastName", type: "string", required: true, size: 100 },
      { key: "phone", type: "string", required: false, size: 20 },
      { key: "avatar", type: "url", required: false },
      { key: "dateOfBirth", type: "datetime", required: false },
      {
        key: "gender",
        type: "enum",
        required: false,
        elements: ["male", "female", "other", "prefer_not_to_say"],
      },
      { key: "bio", type: "string", required: false, size: 500 },
      { key: "emailVerified", type: "boolean", required: true, default: false },
      { key: "isActive", type: "boolean", required: true, default: true },
      { key: "lastLoginAt", type: "datetime", required: false },
      { key: "notificationPreferences", type: "string", required: false, size: 1000 }, // JSON string
      {
        key: "measurementUnit",
        type: "enum",
        required: false,
        elements: ["metric", "imperial"],
        default: "metric",
      },
      { key: "currency", type: "string", required: false, size: 3, default: "USD" },
      { key: "timezone", type: "string", required: false, size: 50, default: "UTC" },
      { key: "language", type: "string", required: false, size: 5, default: "en" },
    ],
    indexes: [
      { key: "email_unique", type: "unique", attributes: ["email"] },
      { key: "role_index", type: "key", attributes: ["role"] },
      { key: "phone_index", type: "key", attributes: ["phone"] },
      { key: "active_role_index", type: "key", attributes: ["isActive", "role"] },
    ],
  },

  // Orders Collection
  orders: {
    id: "orders",
    name: "Orders",
    enabled: true,
    documentSecurity: true,
    permissions: [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.team("admins")),
    ],
    attributes: [
      { key: "orderNumber", type: "string", required: true, size: 20 },
      {
        key: "clientId",
        type: "relationship",
        required: true,
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "clientOrders",
        onDelete: "restrict",
      },
      {
        key: "tailorId",
        type: "relationship",
        required: false,
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "tailorOrders",
        onDelete: "restrict",
      },
      {
        key: "status",
        type: "enum",
        required: true,
        elements: [
          "draft",
          "pending",
          "confirmed",
          "in_progress",
          "ready_for_fitting",
          "fitting_scheduled",
          "alterations_needed",
          "completed",
          "delivered",
          "cancelled",
        ],
        default: "draft",
      },
      {
        key: "priority",
        type: "enum",
        required: false,
        elements: ["low", "medium", "high", "urgent"],
        default: "medium",
      },
      { key: "totalAmount", type: "float", required: true, min: 0 },
      { key: "paidAmount", type: "float", required: false, default: 0, min: 0 },
      { key: "currency", type: "string", required: true, size: 3, default: "USD" },
      {
        key: "style",
        type: "enum",
        required: false,
        elements: [
          "agbada",
          "kaftan",
          "plain_kaftan",
          "senator",
          "traditional",
          "modern",
          "custom",
        ],
      },
      { key: "notes", type: "string", required: false, size: 2000 },
      { key: "internalNotes", type: "string", required: false, size: 2000 },
      { key: "dueDate", type: "datetime", required: false },
      { key: "fittingDate", type: "datetime", required: false },
      { key: "deliveryDate", type: "datetime", required: false },
      { key: "completedAt", type: "datetime", required: false },
      { key: "cancelledAt", type: "datetime", required: false },
      { key: "cancellationReason", type: "string", required: false, size: 500 },
    ],
    indexes: [
      { key: "orderNumber_unique", type: "unique", attributes: ["orderNumber"] },
      {
        key: "status_date_index",
        type: "key",
        attributes: ["status", "$createdAt"],
        orders: ["ASC", "DESC"],
      },
      { key: "client_status_index", type: "key", attributes: ["clientId", "status"] },
      { key: "tailor_status_index", type: "key", attributes: ["tailorId", "status"] },
      { key: "due_date_index", type: "key", attributes: ["dueDate"] },
    ],
  },

  // Order Items Collection
  order_items: {
    id: "order_items",
    name: "Order Items",
    enabled: true,
    documentSecurity: true,
    permissions: [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.team("admins")),
    ],
    attributes: [
      {
        key: "orderId",
        type: "relationship",
        required: true,
        relatedCollection: "orders",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "items",
        onDelete: "cascade",
      },
      {
        key: "fabricId",
        type: "relationship",
        required: true,
        relatedCollection: "fabrics",
        relationType: "manyToOne",
        onDelete: "restrict",
      },
      {
        key: "garmentType",
        type: "enum",
        required: true,
        elements: [
          "shirt",
          "pants",
          "dress",
          "suit",
          "blazer",
          "skirt",
          "blouse",
          "agbada",
          "kaftan",
          "plain_kaftan",
          "senator",
          "traditional",
          "custom",
        ],
      },
      { key: "quantity", type: "integer", required: true, min: 1, default: 1 },
      { key: "unitPrice", type: "float", required: true, min: 0 },
      { key: "totalPrice", type: "float", required: true, min: 0 },
      {
        key: "style",
        type: "enum",
        required: false,
        elements: [
          "agbada",
          "kaftan",
          "plain_kaftan",
          "senator",
          "traditional",
          "modern",
          "custom",
        ],
      },
      { key: "measurements", type: "string", required: false, size: 5000 }, // JSON string
      { key: "customizations", type: "string", required: false, size: 2000 }, // JSON string
      {
        key: "status",
        type: "enum",
        required: true,
        elements: ["pending", "cutting", "sewing", "finishing", "completed"],
        default: "pending",
      },
      { key: "notes", type: "string", required: false, size: 1000 },
    ],
    indexes: [
      { key: "order_index", type: "key", attributes: ["orderId"] },
      { key: "fabric_index", type: "key", attributes: ["fabricId"] },
      { key: "garment_type_index", type: "key", attributes: ["garmentType"] },
    ],
  },

  // Fabrics Collection
  fabrics: {
    id: "fabrics",
    name: "Fabrics",
    enabled: true,
    documentSecurity: false,
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.team("admins")),
      Permission.update(Role.team("admins")),
      Permission.delete(Role.team("admins")),
    ],
    attributes: [
      { key: "code", type: "string", required: true, size: 50 },
      { key: "name", type: "string", required: true, size: 200 },
      { key: "description", type: "string", required: false, size: 2000 },
      {
        key: "category",
        type: "enum",
        required: true,
        elements: [
          "cotton",
          "silk",
          "wool",
          "linen",
          "polyester",
          "blend",
          "denim",
          "velvet",
          "satin",
          "other",
        ],
      },
      { key: "color", type: "string", required: true, size: 50 },
      { key: "pattern", type: "string", required: false, size: 100 },
      { key: "weight", type: "float", required: false, min: 0 }, // grams per square meter
      { key: "width", type: "float", required: false, min: 0 }, // in cm
      { key: "pricePerMeter", type: "float", required: true, min: 0 },
      { key: "currency", type: "string", required: true, size: 3, default: "USD" },
      { key: "stockQuantity", type: "float", required: true, min: 0 },
      { key: "minOrderQuantity", type: "float", required: false, min: 0, default: 1 },
      { key: "images", type: "url", required: false, array: true },
      { key: "supplier", type: "string", required: false, size: 200 },
      { key: "origin", type: "string", required: false, size: 100 },
      { key: "careInstructions", type: "string", required: false, size: 500 },
      { key: "tags", type: "string", required: false, array: true, size: 50 },
      { key: "isFeatured", type: "boolean", required: false, default: false },
      { key: "isActive", type: "boolean", required: true, default: true },
    ],
    indexes: [
      { key: "code_unique", type: "unique", attributes: ["code"] },
      { key: "category_index", type: "key", attributes: ["category"] },
      { key: "color_index", type: "key", attributes: ["color"] },
      { key: "price_index", type: "key", attributes: ["pricePerMeter"] },
      { key: "featured_active_index", type: "key", attributes: ["isFeatured", "isActive"] },
      { key: "name_search", type: "fulltext", attributes: ["name"] },
      { key: "tags_search", type: "fulltext", attributes: ["tags"] },
    ],
  },

  // Measurements Collection
  measurements: {
    id: "measurements",
    name: "Measurements",
    enabled: true,
    documentSecurity: true,
    permissions: [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    attributes: [
      {
        key: "clientId",
        type: "relationship",
        required: true,
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "measurements",
        onDelete: "cascade",
      },
      {
        key: "tailorId",
        type: "relationship",
        required: false,
        relatedCollection: "users",
        relationType: "manyToOne",
        onDelete: "setNull",
      },
      {
        key: "garmentType",
        type: "enum",
        required: true,
        elements: [
          "shirt",
          "pants",
          "dress",
          "suit",
          "blazer",
          "skirt",
          "blouse",
          "agbada",
          "kaftan",
          "plain_kaftan",
          "senator",
          "traditional",
          "custom",
        ],
      },
      { key: "name", type: "string", required: true, size: 100 },
      { key: "measurements", type: "string", required: true, size: 5000 }, // JSON string with measurement details
      { key: "unit", type: "enum", required: true, elements: ["cm", "inches"], default: "cm" },
      { key: "notes", type: "string", required: false, size: 1000 },
      { key: "photos", type: "url", required: false, array: true },
      { key: "isDefault", type: "boolean", required: false, default: false },
      { key: "lastUsedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "client_garment_index", type: "key", attributes: ["clientId", "garmentType"] },
      {
        key: "tailor_date_index",
        type: "key",
        attributes: ["tailorId", "$createdAt"],
        orders: ["ASC", "DESC"],
      },
      { key: "default_index", type: "key", attributes: ["clientId", "isDefault"] },
    ],
  },

  // Appointments Collection
  appointments: {
    id: "appointments",
    name: "Appointments",
    enabled: true,
    documentSecurity: true,
    permissions: [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    attributes: [
      {
        key: "clientId",
        type: "relationship",
        required: true,
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "clientAppointments",
        onDelete: "cascade",
      },
      {
        key: "tailorId",
        type: "relationship",
        required: true,
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "tailorAppointments",
        onDelete: "cascade",
      },
      {
        key: "orderId",
        type: "relationship",
        required: false,
        relatedCollection: "orders",
        relationType: "manyToOne",
        onDelete: "setNull",
      },
      {
        key: "type",
        type: "enum",
        required: true,
        elements: [
          "consultation",
          "measurement",
          "fitting",
          "delivery",
          "alteration",
          "design_review",
        ],
      },
      {
        key: "status",
        type: "enum",
        required: true,
        elements: ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"],
        default: "scheduled",
      },
      { key: "title", type: "string", required: true, size: 200 },
      { key: "description", type: "string", required: false, size: 1000 },
      { key: "scheduledDate", type: "datetime", required: true },
      { key: "duration", type: "integer", required: true, min: 15, default: 60 }, // in minutes
      {
        key: "locationType",
        type: "enum",
        required: true,
        elements: ["studio", "client_home", "virtual", "other"],
        default: "studio",
      },
      { key: "locationAddress", type: "string", required: false, size: 500 },
      { key: "locationInstructions", type: "string", required: false, size: 500 },
      { key: "virtualMeetingLink", type: "url", required: false },
      { key: "requiresMeasurements", type: "boolean", required: false, default: false },
      { key: "requiresFabricSamples", type: "boolean", required: false, default: false },
      { key: "requiresGarment", type: "boolean", required: false, default: false },
      { key: "reminderSent", type: "boolean", required: false, default: false },
      { key: "completedAt", type: "datetime", required: false },
      { key: "cancelledAt", type: "datetime", required: false },
      { key: "cancellationReason", type: "string", required: false, size: 500 },
      { key: "notes", type: "string", required: false, size: 1000 },
    ],
    indexes: [
      { key: "client_date_index", type: "key", attributes: ["clientId", "scheduledDate"] },
      { key: "tailor_date_index", type: "key", attributes: ["tailorId", "scheduledDate"] },
      { key: "status_date_index", type: "key", attributes: ["status", "scheduledDate"] },
      { key: "type_index", type: "key", attributes: ["type"] },
      { key: "order_index", type: "key", attributes: ["orderId"] },
    ],
  },

  // Notifications Collection
  notifications: {
    id: "notifications",
    name: "Notifications",
    enabled: true,
    documentSecurity: true,
    permissions: [
      Permission.read(Role.user("{document.userId}")),
      Permission.create(Role.users()),
      Permission.update(Role.user("{document.userId}")),
      Permission.delete(Role.user("{document.userId}")),
    ],
    attributes: [
      {
        key: "userId",
        type: "relationship",
        required: true,
        relatedCollection: "users",
        relationType: "manyToOne",
        onDelete: "cascade",
      },
      {
        key: "type",
        type: "enum",
        required: true,
        elements: [
          "order_update",
          "appointment_reminder",
          "measurement_alert",
          "promotional_offer",
          "system_announcement",
          "feedback_request",
          "payment_reminder",
          "delivery_notification",
        ],
      },
      {
        key: "priority",
        type: "enum",
        required: true,
        elements: ["low", "medium", "high", "urgent"],
        default: "medium",
      },
      { key: "title", type: "string", required: true, size: 200 },
      { key: "body", type: "string", required: true, size: 1000 },
      { key: "actionText", type: "string", required: false, size: 100 },
      { key: "actionUrl", type: "string", required: false, size: 500 },
      { key: "metadata", type: "string", required: false, size: 1000 }, // JSON string
      { key: "isRead", type: "boolean", required: true, default: false },
      { key: "readAt", type: "datetime", required: false },
      { key: "channels", type: "string", required: false, array: true, size: 20 }, // ["push", "email", "sms", "in_app"]
      { key: "sentAt", type: "datetime", required: false },
      { key: "scheduledFor", type: "datetime", required: false },
      { key: "expiresAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "user_read_index", type: "key", attributes: ["userId", "isRead"] },
      { key: "user_type_index", type: "key", attributes: ["userId", "type"] },
      {
        key: "user_date_index",
        type: "key",
        attributes: ["userId", "$createdAt"],
        orders: ["ASC", "DESC"],
      },
      { key: "scheduled_index", type: "key", attributes: ["scheduledFor"] },
    ],
  },

  // Reviews Collection
  reviews: {
    id: "reviews",
    name: "Reviews",
    enabled: true,
    documentSecurity: true,
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.user("{document.clientId}")),
      Permission.delete(Role.team("admins")),
    ],
    attributes: [
      {
        key: "orderId",
        type: "relationship",
        required: true,
        relatedCollection: "orders",
        relationType: "oneToOne",
        twoWay: true,
        twoWayKey: "review",
        onDelete: "cascade",
      },
      {
        key: "clientId",
        type: "relationship",
        required: true,
        relatedCollection: "users",
        relationType: "manyToOne",
        onDelete: "cascade",
      },
      {
        key: "tailorId",
        type: "relationship",
        required: true,
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "reviews",
        onDelete: "cascade",
      },
      { key: "rating", type: "integer", required: true, min: 1, max: 5 },
      { key: "comment", type: "string", required: false, size: 2000 },
      { key: "aspects", type: "string", required: false, size: 1000 }, // JSON string with ratings for different aspects
      { key: "photos", type: "url", required: false, array: true },
      { key: "isVerified", type: "boolean", required: true, default: true }, // verified purchase
      { key: "isPublic", type: "boolean", required: true, default: true },
      { key: "helpfulCount", type: "integer", required: false, default: 0 },
      { key: "response", type: "string", required: false, size: 1000 }, // tailor's response
      { key: "respondedAt", type: "datetime", required: false },
    ],
    indexes: [
      { key: "order_unique", type: "unique", attributes: ["orderId"] },
      { key: "tailor_rating_index", type: "key", attributes: ["tailorId", "rating"] },
      { key: "client_index", type: "key", attributes: ["clientId"] },
      {
        key: "public_date_index",
        type: "key",
        attributes: ["isPublic", "$createdAt"],
        orders: ["ASC", "DESC"],
      },
    ],
  },

  // Favorites Collection
  favorites: {
    id: "favorites",
    name: "Favorites",
    enabled: true,
    documentSecurity: true,
    permissions: [
      Permission.read(Role.user("{document.userId}")),
      Permission.create(Role.users()),
      Permission.delete(Role.user("{document.userId}")),
    ],
    attributes: [
      {
        key: "userId",
        type: "relationship",
        required: true,
        relatedCollection: "users",
        relationType: "manyToOne",
        onDelete: "cascade",
      },
      {
        key: "fabricId",
        type: "relationship",
        required: false,
        relatedCollection: "fabrics",
        relationType: "manyToOne",
        onDelete: "cascade",
      },
      {
        key: "tailorId",
        type: "relationship",
        required: false,
        relatedCollection: "users",
        relationType: "manyToOne",
        onDelete: "cascade",
      },
      { key: "type", type: "enum", required: true, elements: ["fabric", "tailor"] },
      { key: "notes", type: "string", required: false, size: 500 },
    ],
    indexes: [
      { key: "user_type_index", type: "key", attributes: ["userId", "type"] },
      { key: "user_fabric_unique", type: "unique", attributes: ["userId", "fabricId"] },
      { key: "user_tailor_unique", type: "unique", attributes: ["userId", "tailorId"] },
    ],
  },

  // Progress Updates Collection
  progress_updates: {
    id: "progress_updates",
    name: "Progress Updates",
    enabled: true,
    documentSecurity: true,
    permissions: [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.user("{document.tailorId}")),
      Permission.delete(Role.team("admins")),
    ],
    attributes: [
      {
        key: "orderId",
        type: "relationship",
        required: true,
        relatedCollection: "orders",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "progressUpdates",
        onDelete: "cascade",
      },
      {
        key: "orderItemId",
        type: "relationship",
        required: false,
        relatedCollection: "order_items",
        relationType: "manyToOne",
        onDelete: "cascade",
      },
      {
        key: "tailorId",
        type: "relationship",
        required: true,
        relatedCollection: "users",
        relationType: "manyToOne",
        onDelete: "cascade",
      },
      { key: "status", type: "string", required: true, size: 100 },
      { key: "title", type: "string", required: true, size: 200 },
      { key: "description", type: "string", required: false, size: 1000 },
      { key: "photos", type: "url", required: false, array: true },
      { key: "percentageComplete", type: "integer", required: false, min: 0, max: 100 },
      { key: "estimatedCompletionDate", type: "datetime", required: false },
      { key: "isVisibleToClient", type: "boolean", required: true, default: true },
    ],
    indexes: [
      {
        key: "order_date_index",
        type: "key",
        attributes: ["orderId", "$createdAt"],
        orders: ["ASC", "DESC"],
      },
      { key: "item_index", type: "key", attributes: ["orderItemId"] },
      { key: "tailor_index", type: "key", attributes: ["tailorId"] },
      { key: "visible_index", type: "key", attributes: ["orderId", "isVisibleToClient"] },
    ],
  },
}

/**
 * Get collection permissions based on user role
 */
export function getCollectionPermissions(
  collectionId: string,
  userId?: string,
  role?: string,
): string[] {
  const schema = DATABASE_SCHEMA[collectionId]
  if (!schema) return []

  // Return base permissions for the collection
  // Additional logic can be added here for role-based permissions
  return schema.permissions
}

/**
 * Validate document data against collection schema
 */
export function validateDocument(
  collectionId: string,
  data: Record<string, any>,
): {
  isValid: boolean
  errors: string[]
} {
  const schema = DATABASE_SCHEMA[collectionId]
  if (!schema) {
    return { isValid: false, errors: [`Collection ${collectionId} not found`] }
  }

  const errors: string[] = []

  // Check required fields
  for (const attr of schema.attributes) {
    if (attr.required && !(attr.key in data)) {
      errors.push(`Missing required field: ${attr.key}`)
    }

    // Validate data types
    if (attr.key in data) {
      const value = data[attr.key]

      // Check array type
      if (attr.array && !Array.isArray(value)) {
        errors.push(`Field ${attr.key} must be an array`)
      }

      // Validate enum values
      if (attr.type === "enum" && attr.elements) {
        const checkValue = attr.array ? value : [value]
        for (const v of checkValue) {
          if (!attr.elements.includes(v)) {
            errors.push(
              `Invalid value for ${attr.key}: ${v}. Must be one of: ${attr.elements.join(", ")}`,
            )
          }
        }
      }

      // Validate numeric ranges
      if ((attr.type === "integer" || attr.type === "float") && typeof value === "number") {
        if (attr.min !== undefined && value < attr.min) {
          errors.push(`${attr.key} must be at least ${attr.min}`)
        }
        if (attr.max !== undefined && value > attr.max) {
          errors.push(`${attr.key} must be at most ${attr.max}`)
        }
      }

      // Validate string size
      if (
        attr.type === "string" &&
        attr.size &&
        typeof value === "string" &&
        value.length > attr.size
      ) {
        errors.push(`${attr.key} exceeds maximum length of ${attr.size}`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
