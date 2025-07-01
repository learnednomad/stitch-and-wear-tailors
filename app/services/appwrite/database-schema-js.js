/**
 * Database Schema for JavaScript
 * This is a JavaScript version of database-schema.ts for use in Node.js scripts
 */

const { Permission, Role } = require("node-appwrite")

const DATABASE_SCHEMA = {
  users: {
    id: "users",
    name: "Users",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.any()), Permission.create(Role.users())],
    attributes: [
      {
        key: "email",
        type: "email",
        required: true,
      },
      {
        key: "role",
        type: "enum",
        elements: ["client", "tailor", "admin"],
        required: true,
      },
      {
        key: "profile",
        type: "string",
        size: 5000,
        required: false,
      },
      {
        key: "createdAt",
        type: "datetime",
        required: false,
      },
      {
        key: "updatedAt",
        type: "datetime",
        required: false,
      },
    ],
    indexes: [
      {
        key: "email_unique",
        type: "unique",
        attributes: ["email"],
      },
    ],
  },

  orders: {
    id: "orders",
    name: "Orders",
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
        key: "type",
        type: "enum",
        elements: ["custom", "alteration", "repair"],
        required: true,
      },
      {
        key: "status",
        type: "enum",
        elements: ["pending", "confirmed", "in_progress", "ready", "delivered", "cancelled"],
        required: true,
        default: "pending",
      },
      {
        key: "totalAmount",
        type: "float",
        required: true,
        min: 0,
      },
      {
        key: "deliveryDate",
        type: "datetime",
        required: false,
      },
      {
        key: "createdAt",
        type: "datetime",
        required: false,
      },
      {
        key: "updatedAt",
        type: "datetime",
        required: false,
      },
    ],
    indexes: [
      {
        key: "user_orders",
        type: "key",
        attributes: ["userId"],
      },
      {
        key: "tailor_orders",
        type: "key",
        attributes: ["tailorId"],
      },
      {
        key: "status_index",
        type: "key",
        attributes: ["status"],
      },
    ],
  },

  order_items: {
    id: "order_items",
    name: "Order Items",
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
        twoWayKey: "items",
        onDelete: "cascade",
      },
      {
        key: "fabricId",
        type: "relationship",
        relatedCollection: "fabrics",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "restrict",
      },
      {
        key: "quantity",
        type: "integer",
        required: true,
        min: 1,
      },
      {
        key: "price",
        type: "float",
        required: true,
        min: 0,
      },
      {
        key: "customizations",
        type: "string",
        size: 5000,
        required: false,
      },
    ],
    indexes: [
      {
        key: "order_items_index",
        type: "key",
        attributes: ["orderId"],
      },
    ],
  },

  fabrics: {
    id: "fabrics",
    name: "Fabrics",
    enabled: true,
    documentSecurity: false,
    permissions: [Permission.read(Role.any()), Permission.write(Role.users())],
    attributes: [
      {
        key: "name",
        type: "string",
        size: 255,
        required: true,
      },
      {
        key: "description",
        type: "string",
        size: 1000,
        required: false,
      },
      {
        key: "category",
        type: "enum",
        elements: ["cotton", "silk", "wool", "linen", "synthetic", "blend"],
        required: true,
      },
      {
        key: "color",
        type: "string",
        size: 100,
        required: true,
      },
      {
        key: "pattern",
        type: "string",
        size: 100,
        required: false,
      },
      {
        key: "pricePerMeter",
        type: "float",
        required: true,
        min: 0,
      },
      {
        key: "stockQuantity",
        type: "integer",
        required: true,
        min: 0,
      },
      {
        key: "imageUrl",
        type: "url",
        required: false,
      },
      {
        key: "isAvailable",
        type: "boolean",
        required: true,
        default: true,
      },
    ],
    indexes: [
      {
        key: "category_index",
        type: "key",
        attributes: ["category"],
      },
      {
        key: "available_index",
        type: "key",
        attributes: ["isAvailable"],
      },
    ],
  },

  measurements: {
    id: "measurements",
    name: "Measurements",
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
        twoWayKey: "measurements",
        onDelete: "cascade",
      },
      {
        key: "type",
        type: "enum",
        elements: ["shirt", "trouser", "suit", "dress", "traditional"],
        required: true,
      },
      {
        key: "measurements",
        type: "string",
        size: 5000,
        required: true,
      },
      {
        key: "notes",
        type: "string",
        size: 1000,
        required: false,
      },
      {
        key: "createdAt",
        type: "datetime",
        required: false,
      },
      {
        key: "updatedAt",
        type: "datetime",
        required: false,
      },
    ],
    indexes: [
      {
        key: "user_measurements",
        type: "key",
        attributes: ["userId"],
      },
      {
        key: "measurement_type",
        type: "key",
        attributes: ["type"],
      },
    ],
  },

  appointments: {
    id: "appointments",
    name: "Appointments",
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
        twoWayKey: "appointments",
        onDelete: "cascade",
      },
      {
        key: "tailorId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "tailorAppointments",
        onDelete: "cascade",
      },
      {
        key: "date",
        type: "datetime",
        required: true,
      },
      {
        key: "time",
        type: "string",
        size: 10,
        required: true,
      },
      {
        key: "type",
        type: "enum",
        elements: ["consultation", "measurement", "fitting", "delivery"],
        required: true,
      },
      {
        key: "status",
        type: "enum",
        elements: ["scheduled", "confirmed", "completed", "cancelled"],
        required: true,
        default: "scheduled",
      },
      {
        key: "notes",
        type: "string",
        size: 1000,
        required: false,
      },
    ],
    indexes: [
      {
        key: "user_appointments",
        type: "key",
        attributes: ["userId"],
      },
      {
        key: "tailor_appointments",
        type: "key",
        attributes: ["tailorId"],
      },
      {
        key: "appointment_date",
        type: "key",
        attributes: ["date"],
      },
    ],
  },

  notifications: {
    id: "notifications",
    name: "Notifications",
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
        elements: ["order_update", "appointment_reminder", "message", "promotion"],
        required: true,
      },
      {
        key: "title",
        type: "string",
        size: 255,
        required: true,
      },
      {
        key: "message",
        type: "string",
        size: 1000,
        required: true,
      },
      {
        key: "data",
        type: "string",
        size: 5000,
        required: false,
      },
      {
        key: "isRead",
        type: "boolean",
        required: true,
        default: false,
      },
      {
        key: "createdAt",
        type: "datetime",
        required: false,
      },
    ],
    indexes: [
      {
        key: "user_notifications",
        type: "key",
        attributes: ["userId"],
      },
      {
        key: "unread_notifications",
        type: "key",
        attributes: ["userId", "isRead"],
      },
    ],
  },

  reviews: {
    id: "reviews",
    name: "Reviews",
    enabled: true,
    documentSecurity: true,
    permissions: [Permission.read(Role.any()), Permission.create(Role.users())],
    attributes: [
      {
        key: "orderId",
        type: "relationship",
        relatedCollection: "orders",
        relationType: "oneToOne",
        twoWay: true,
        twoWayKey: "review",
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
        key: "tailorId",
        type: "relationship",
        relatedCollection: "users",
        relationType: "manyToOne",
        twoWay: true,
        twoWayKey: "reviews",
        onDelete: "cascade",
      },
      {
        key: "rating",
        type: "integer",
        required: true,
        min: 1,
        max: 5,
      },
      {
        key: "comment",
        type: "string",
        size: 2000,
        required: false,
      },
      {
        key: "createdAt",
        type: "datetime",
        required: false,
      },
    ],
    indexes: [
      {
        key: "tailor_reviews",
        type: "key",
        attributes: ["tailorId"],
      },
      {
        key: "review_rating",
        type: "key",
        attributes: ["rating"],
      },
    ],
  },

  favorites: {
    id: "favorites",
    name: "Favorites",
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
        key: "fabricId",
        type: "relationship",
        relatedCollection: "fabrics",
        relationType: "manyToOne",
        twoWay: false,
        onDelete: "cascade",
      },
      {
        key: "createdAt",
        type: "datetime",
        required: false,
      },
    ],
    indexes: [
      {
        key: "user_favorites",
        type: "key",
        attributes: ["userId"],
      },
    ],
  },

  progress_updates: {
    id: "progress_updates",
    name: "Progress Updates",
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
        twoWayKey: "progressUpdates",
        onDelete: "cascade",
      },
      {
        key: "status",
        type: "string",
        size: 100,
        required: true,
      },
      {
        key: "description",
        type: "string",
        size: 1000,
        required: true,
      },
      {
        key: "imageUrl",
        type: "url",
        required: false,
      },
      {
        key: "createdAt",
        type: "datetime",
        required: false,
      },
    ],
    indexes: [
      {
        key: "order_updates",
        type: "key",
        attributes: ["orderId"],
      },
    ],
  },
}

module.exports = { DATABASE_SCHEMA }
