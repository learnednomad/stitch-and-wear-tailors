#!/usr/bin/env node

/**
 * Business Collections Database Setup Script for Appwrite
 * Creates all required collections for orders, measurements, fabrics, etc.
 *
 * Usage: node scripts/setup-business-database.js
 *
 * Prerequisites:
 * - Appwrite CLI installed and configured
 * - Environment variables set in .env
 * - Run after setup-auth-database.js
 */

const { Client, Databases, ID } = require("appwrite")

// Load environment variables
require("dotenv").config()

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY) // Requires API key with database write permissions

const databases = new Databases(client)

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "stitch_and_wear_db"

// Business collections definitions
const businessCollections = [
  {
    id: "measurements",
    name: "Measurements",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "name", size: 100, required: true },
      {
        type: "enum",
        id: "measurementType",
        elements: ["suit", "shirt", "trouser", "dress", "traditional"],
        required: true,
      },
      { type: "enum", id: "unit", elements: ["cm", "inch"], required: true, default: "cm" },
      { type: "float", id: "chest", required: false, min: 0, max: 200 },
      { type: "float", id: "waist", required: false, min: 0, max: 200 },
      { type: "float", id: "hips", required: false, min: 0, max: 200 },
      { type: "float", id: "shoulderWidth", required: false, min: 0, max: 100 },
      { type: "float", id: "sleeveLength", required: false, min: 0, max: 100 },
      { type: "float", id: "armhole", required: false, min: 0, max: 100 },
      { type: "float", id: "bicep", required: false, min: 0, max: 100 },
      { type: "float", id: "wrist", required: false, min: 0, max: 100 },
      { type: "float", id: "neck", required: false, min: 0, max: 100 },
      { type: "float", id: "backLength", required: false, min: 0, max: 150 },
      { type: "float", id: "frontLength", required: false, min: 0, max: 150 },
      { type: "float", id: "inseam", required: false, min: 0, max: 150 },
      { type: "float", id: "outseam", required: false, min: 0, max: 150 },
      { type: "float", id: "thigh", required: false, min: 0, max: 100 },
      { type: "float", id: "knee", required: false, min: 0, max: 100 },
      { type: "float", id: "ankle", required: false, min: 0, max: 100 },
      { type: "float", id: "rise", required: false, min: 0, max: 100 },
      { type: "string", id: "customMeasurements", size: 2000, required: false },
      { type: "string", id: "notes", size: 500, required: false },
      { type: "boolean", id: "isDefault", required: true, default: false },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "updatedAt", required: true },
    ],
  },
  {
    id: "orders",
    name: "Orders",
    attributes: [
      { type: "string", id: "orderNumber", size: 20, required: true },
      { type: "string", id: "customerId", size: 36, required: true },
      { type: "string", id: "tailorId", size: 36, required: false },
      {
        type: "enum",
        id: "status",
        elements: [
          "pending",
          "accepted",
          "rejected",
          "measuring",
          "cutting",
          "sewing",
          "finishing",
          "ready",
          "delivered",
          "cancelled",
        ],
        required: true,
        default: "pending",
      },
      {
        type: "enum",
        id: "priority",
        elements: ["normal", "express", "urgent"],
        required: true,
        default: "normal",
      },
      {
        type: "enum",
        id: "orderType",
        elements: ["new_clothing", "alteration", "repair"],
        required: true,
      },
      { type: "string", id: "measurementId", size: 36, required: false },
      { type: "float", id: "totalAmount", required: true, default: 0, min: 0, max: 1000000 },
      { type: "float", id: "depositAmount", required: true, default: 0, min: 0, max: 1000000 },
      { type: "float", id: "balanceAmount", required: true, default: 0, min: 0, max: 1000000 },
      {
        type: "enum",
        id: "currency",
        elements: ["NGN", "USD", "GBP", "EUR"],
        required: true,
        default: "NGN",
      },
      { type: "datetime", id: "estimatedDelivery", required: false },
      { type: "datetime", id: "actualDelivery", required: false },
      { type: "string", id: "specialInstructions", size: 1000, required: false },
      { type: "string", id: "internalNotes", size: 1000, required: false },
      {
        type: "enum",
        id: "fabricSource",
        elements: ["customer", "tailor", "shop"],
        required: true,
        default: "customer",
      },
      {
        type: "enum",
        id: "paymentStatus",
        elements: ["pending", "deposit_paid", "fully_paid", "refunded"],
        required: true,
        default: "pending",
      },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "updatedAt", required: true },
      { type: "datetime", id: "acceptedAt", required: false },
      { type: "datetime", id: "completedAt", required: false },
    ],
  },
  {
    id: "order_items",
    name: "Order Items",
    attributes: [
      { type: "string", id: "orderId", size: 36, required: true },
      {
        type: "enum",
        id: "itemType",
        elements: ["suit", "shirt", "trouser", "dress", "blouse", "skirt", "traditional", "other"],
        required: true,
      },
      { type: "integer", id: "quantity", required: true, default: 1, min: 1, max: 100 },
      { type: "string", id: "fabricId", size: 36, required: false },
      { type: "string", id: "designStyle", size: 200, required: false },
      { type: "float", id: "itemPrice", required: true, default: 0, min: 0, max: 1000000 },
      { type: "float", id: "totalPrice", required: true, default: 0, min: 0, max: 1000000 },
      { type: "string", id: "specifications", size: 2000, required: false },
      {
        type: "enum",
        id: "status",
        elements: ["pending", "in_progress", "completed"],
        required: true,
        default: "pending",
      },
      { type: "datetime", id: "createdAt", required: true },
    ],
  },
  {
    id: "fabrics",
    name: "Fabrics",
    attributes: [
      { type: "string", id: "name", size: 100, required: true },
      {
        type: "enum",
        id: "type",
        elements: ["cotton", "silk", "wool", "linen", "polyester", "mixed", "other"],
        required: true,
      },
      { type: "string", id: "color", size: 50, required: true },
      { type: "string", id: "pattern", size: 50, required: false },
      { type: "float", id: "pricePerMeter", required: false, default: 0, min: 0, max: 100000 },
      { type: "float", id: "availableQuantity", required: false, default: 0, min: 0, max: 10000 },
      { type: "string", id: "supplier", size: 100, required: false },
      { type: "string", id: "imageUrl", size: 500, required: false },
      { type: "string", id: "description", size: 500, required: false },
      { type: "string", id: "ownerId", size: 36, required: false },
      { type: "boolean", id: "isActive", required: true, default: true },
      { type: "datetime", id: "createdAt", required: true },
    ],
  },
  {
    id: "order_attachments",
    name: "Order Attachments",
    attributes: [
      { type: "string", id: "orderId", size: 36, required: true },
      { type: "string", id: "fileId", size: 36, required: true },
      { type: "string", id: "fileName", size: 255, required: true },
      {
        type: "enum",
        id: "fileType",
        elements: [
          "design_reference",
          "fabric_sample",
          "measurement_photo",
          "completed_photo",
          "other",
        ],
        required: true,
      },
      { type: "integer", id: "fileSize", required: true, min: 0, max: 52428800 }, // Max 50MB
      { type: "string", id: "mimeType", size: 50, required: true },
      { type: "string", id: "uploadedBy", size: 36, required: true },
      { type: "string", id: "description", size: 500, required: false },
      { type: "datetime", id: "createdAt", required: true },
    ],
  },
  {
    id: "messages",
    name: "Messages",
    attributes: [
      { type: "string", id: "orderId", size: 36, required: true },
      { type: "string", id: "senderId", size: 36, required: true },
      { type: "string", id: "recipientId", size: 36, required: true },
      {
        type: "enum",
        id: "messageType",
        elements: ["text", "image", "voice_note"],
        required: true,
        default: "text",
      },
      { type: "string", id: "content", size: 2000, required: false },
      { type: "string", id: "attachmentId", size: 36, required: false },
      { type: "boolean", id: "isRead", required: true, default: false },
      { type: "datetime", id: "readAt", required: false },
      { type: "datetime", id: "createdAt", required: true },
    ],
  },
  {
    id: "payments",
    name: "Payments",
    attributes: [
      { type: "string", id: "orderId", size: 36, required: true },
      { type: "string", id: "userId", size: 36, required: true },
      { type: "float", id: "amount", required: true, min: 0, max: 10000000 },
      {
        type: "enum",
        id: "currency",
        elements: ["NGN", "USD", "GBP", "EUR"],
        required: true,
        default: "NGN",
      },
      {
        type: "enum",
        id: "provider",
        elements: ["stripe", "paystack", "flutterwave", "cash", "bank_transfer"],
        required: true,
      },
      { type: "string", id: "providerTransactionId", size: 100, required: false },
      {
        type: "enum",
        id: "status",
        elements: ["pending", "processing", "success", "failed", "refunded"],
        required: true,
        default: "pending",
      },
      {
        type: "enum",
        id: "paymentType",
        elements: ["deposit", "final_payment", "full_payment", "refund"],
        required: true,
      },
      { type: "string", id: "metadata", size: 2000, required: false },
      { type: "string", id: "failureReason", size: 500, required: false },
      { type: "datetime", id: "paidAt", required: false },
      { type: "datetime", id: "createdAt", required: true },
    ],
  },
  {
    id: "tailor_analytics",
    name: "Tailor Analytics",
    attributes: [
      { type: "string", id: "tailorId", size: 36, required: true },
      { type: "enum", id: "period", elements: ["daily", "weekly", "monthly"], required: true },
      { type: "datetime", id: "periodDate", required: true },
      { type: "integer", id: "totalOrders", required: true, default: 0, min: 0, max: 10000 },
      { type: "integer", id: "completedOrders", required: true, default: 0, min: 0, max: 10000 },
      { type: "float", id: "totalRevenue", required: true, default: 0, min: 0, max: 100000000 },
      { type: "float", id: "averageOrderValue", required: true, default: 0, min: 0, max: 1000000 },
      { type: "integer", id: "newCustomers", required: true, default: 0, min: 0, max: 1000 },
      { type: "integer", id: "repeatCustomers", required: true, default: 0, min: 0, max: 1000 },
      {
        type: "float",
        id: "averageCompletionTime",
        required: true,
        default: 0,
        min: 0,
        max: 10000,
      },
      { type: "float", id: "customerSatisfaction", required: false, min: 0, max: 5 },
      { type: "datetime", id: "createdAt", required: true },
    ],
  },
  {
    id: "notifications",
    name: "Notifications",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      {
        type: "enum",
        id: "type",
        elements: ["order_update", "new_message", "payment_received", "reminder"],
        required: true,
      },
      { type: "string", id: "title", size: 200, required: true },
      { type: "string", id: "body", size: 500, required: true },
      { type: "string", id: "data", size: 1000, required: false },
      { type: "boolean", id: "isRead", required: true, default: false },
      { type: "datetime", id: "readAt", required: false },
      { type: "datetime", id: "createdAt", required: true },
    ],
  },
]

// Helper function to create an attribute based on type
async function createAttribute(databaseId, collectionId, attr) {
  const { type, id, ...params } = attr

  try {
    switch (type) {
      case "string":
        await databases.createStringAttribute(
          databaseId,
          collectionId,
          id,
          params.size,
          params.required,
          params.default,
          params.array,
        )
        break
      case "email":
        await databases.createEmailAttribute(
          databaseId,
          collectionId,
          id,
          params.required,
          params.default,
          params.array,
        )
        break
      case "enum":
        await databases.createEnumAttribute(
          databaseId,
          collectionId,
          id,
          params.elements,
          params.required,
          params.default,
          params.array,
        )
        break
      case "boolean":
        await databases.createBooleanAttribute(
          databaseId,
          collectionId,
          id,
          params.required,
          params.default,
          params.array,
        )
        break
      case "integer":
        await databases.createIntegerAttribute(
          databaseId,
          collectionId,
          id,
          params.required,
          params.min,
          params.max,
          params.default,
          params.array,
        )
        break
      case "float":
        await databases.createFloatAttribute(
          databaseId,
          collectionId,
          id,
          params.required,
          params.min,
          params.max,
          params.default,
          params.array,
        )
        break
      case "datetime":
        await databases.createDatetimeAttribute(
          databaseId,
          collectionId,
          id,
          params.required,
          params.default,
          params.array,
        )
        break
      default:
        console.warn(`Unknown attribute type: ${type}`)
    }
    console.log(`  ✓ Created attribute: ${id}`)
  } catch (error) {
    if (error.code === 409) {
      console.log(`  - Attribute ${id} already exists`)
    } else {
      console.error(`  ✗ Failed to create attribute ${id}:`, error.message)
    }
  }
}

// Main setup function
async function setupBusinessDatabase() {
  console.log("🚀 Starting Business Database Setup...\n")
  console.log(`Database ID: ${DATABASE_ID}\n`)

  // Create collections
  for (const collection of businessCollections) {
    console.log(`📦 Setting up collection: ${collection.name}`)

    // Create collection
    try {
      await databases.createCollection(
        DATABASE_ID,
        collection.id,
        collection.name,
        ['read("any")', 'write("any")'], // Adjust permissions as needed
        false, // Document security
      )
      console.log(`  ✓ Created collection: ${collection.id}`)
    } catch (error) {
      if (error.code === 409) {
        console.log(`  - Collection ${collection.id} already exists`)
      } else {
        console.error(`  ✗ Failed to create collection:`, error.message)
        continue
      }
    }

    // Create attributes
    console.log("  📝 Creating attributes...")
    for (const attr of collection.attributes) {
      await createAttribute(DATABASE_ID, collection.id, attr)
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`  ✅ Collection ${collection.name} setup complete\n`)
  }

  // Create indexes for better performance
  console.log("🔍 Creating indexes for better performance...\n")

  const indexes = [
    { collection: "measurements", key: "userId", type: "key", attributes: ["userId"] },
    { collection: "measurements", key: "isDefault", type: "key", attributes: ["isDefault"] },
    { collection: "orders", key: "orderNumber", type: "unique", attributes: ["orderNumber"] },
    { collection: "orders", key: "customerId", type: "key", attributes: ["customerId"] },
    { collection: "orders", key: "tailorId", type: "key", attributes: ["tailorId"] },
    { collection: "orders", key: "status", type: "key", attributes: ["status"] },
    { collection: "order_items", key: "orderId", type: "key", attributes: ["orderId"] },
    { collection: "messages", key: "orderId", type: "key", attributes: ["orderId"] },
    { collection: "payments", key: "orderId", type: "key", attributes: ["orderId"] },
    { collection: "notifications", key: "userId", type: "key", attributes: ["userId"] },
    { collection: "notifications", key: "isRead", type: "key", attributes: ["isRead"] },
  ]

  for (const index of indexes) {
    try {
      await databases.createIndex(
        DATABASE_ID,
        index.collection,
        index.key,
        index.type,
        index.attributes,
      )
      console.log(`  ✓ Created index: ${index.collection}.${index.key}`)
    } catch (error) {
      if (error.code === 409) {
        console.log(`  - Index ${index.collection}.${index.key} already exists`)
      } else {
        console.error(`  ✗ Failed to create index ${index.collection}.${index.key}:`, error.message)
      }
    }
    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  console.log("\n🎉 Business Database Setup Complete!")
  console.log("\n📋 Next steps:")
  console.log("1. Update collection permissions in Appwrite console for proper access control")
  console.log("2. Configure storage buckets for file uploads")
  console.log("3. Set up Appwrite Functions for payment webhooks")
  console.log("4. Test the Order creation flow")
  console.log("\n💡 To run this script:")
  console.log("   node scripts/setup-business-database.js")
}

// Run setup
setupBusinessDatabase().catch((error) => {
  console.error("Setup failed:", error)
  process.exit(1)
})
