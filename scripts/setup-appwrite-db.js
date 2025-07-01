/**
 * Appwrite Database Setup Script
 * 
 * This script creates the comprehensive database schema for Stitch and Wear Tailors
 * using the Appwrite SDK.
 * 
 * Run with: node scripts/setup-appwrite-db.js
 */

const { Client, Databases } = require("appwrite")

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || ""
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || ""
const DATABASE_ID = "stitch-and-wear-db"

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setDevKey(APPWRITE_API_KEY)

const databases = new Databases(client)

/**
 * Core collections with essential attributes
 */
const ESSENTIAL_COLLECTIONS = {
  users: {
    name: "Users",
    attributes: [
      { key: "email", type: "email", required: true },
      { key: "role", type: "enum", elements: ["client", "tailor", "admin"], required: true },
      { key: "status", type: "enum", elements: ["active", "inactive", "suspended"], required: false, default: "active" },
      { key: "profile", type: "string", size: 5000, required: false },
      { key: "phoneNumber", type: "string", size: 20, required: false },
      { key: "businessId", type: "string", size: 255, required: false },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false }
    ],
    indexes: [
      { key: "email_unique", type: "unique", attributes: ["email"] },
      { key: "role_index", type: "key", attributes: ["role"] },
      { key: "status_index", type: "key", attributes: ["status"] }
    ]
  },
  
  orders: {
    name: "Orders",
    attributes: [
      { key: "orderNumber", type: "string", size: 50, required: true },
      { key: "userId", type: "string", size: 255, required: true },
      { key: "tailorId", type: "string", size: 255, required: false },
      { key: "type", type: "enum", elements: ["custom", "alteration", "repair"], required: true },
      { key: "status", type: "enum", elements: ["pending", "confirmed", "in_progress", "ready", "delivered", "cancelled"], required: true, default: "pending" },
      { key: "style", type: "enum", elements: ["agbada", "kaftan", "plain_kaftan", "senator", "traditional", "modern", "custom"], required: false },
      { key: "fabric", type: "string", size: 255, required: false },
      { key: "totalAmount", type: "float", required: true, min: 0 },
      { key: "notes", type: "string", size: 2000, required: false },
      { key: "orderDate", type: "datetime", required: true },
      { key: "deliveryDate", type: "datetime", required: false },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false }
    ],
    indexes: [
      { key: "order_number_unique", type: "unique", attributes: ["orderNumber"] },
      { key: "user_orders", type: "key", attributes: ["userId"] },
      { key: "tailor_orders", type: "key", attributes: ["tailorId"] },
      { key: "status_index", type: "key", attributes: ["status"] }
    ]
  },
  
  businesses: {
    name: "Businesses",
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "type", type: "enum", elements: ["single", "franchise", "chain"], required: true, default: "single" },
      { key: "currency", type: "string", size: 10, required: true, default: "USD" },
      { key: "timezone", type: "string", size: 50, required: true, default: "UTC" },
      { key: "createdAt", type: "datetime", required: false },
      { key: "updatedAt", type: "datetime", required: false }
    ],
    indexes: [
      { key: "business_name", type: "key", attributes: ["name"] },
      { key: "business_type", type: "key", attributes: ["type"] }
    ]
  },
  
  styles_catalog: {
    name: "Styles Catalog",
    attributes: [
      { key: "code", type: "string", size: 50, required: true },
      { key: "name", type: "string", size: 100, required: true },
      { key: "category", type: "enum", elements: ["agbada", "kaftan", "plain_kaftan", "senator", "traditional", "modern", "western", "custom"], required: true },
      { key: "description", type: "string", size: 1000, required: false },
      { key: "basePrice", type: "float", required: true, min: 0 },
      { key: "isActive", type: "boolean", required: true, default: true },
      { key: "createdAt", type: "datetime", required: false }
    ],
    indexes: [
      { key: "style_code_unique", type: "unique", attributes: ["code"] },
      { key: "style_category", type: "key", attributes: ["category"] },
      { key: "style_active", type: "key", attributes: ["isActive"] }
    ]
  },
  
  notifications_queue: {
    name: "Notification Queue",
    attributes: [
      { key: "userId", type: "string", size: 255, required: true },
      { key: "type", type: "enum", elements: ["order_update", "appointment_reminder", "payment_due", "promotion", "system", "message"], required: true },
      { key: "title", type: "string", size: 255, required: true },
      { key: "message", type: "string", size: 2000, required: true },
      { key: "status", type: "enum", elements: ["pending", "sent", "delivered", "failed", "cancelled"], required: true, default: "pending" },
      { key: "createdAt", type: "datetime", required: false }
    ],
    indexes: [
      { key: "notif_user", type: "key", attributes: ["userId"] },
      { key: "notif_status", type: "key", attributes: ["status"] },
      { key: "notif_type", type: "key", attributes: ["type"] }
    ]
  }
}

/**
 * Create attributes for a collection
 */
async function createAttributes(collectionId, attributes) {
  console.log(`Creating attributes for collection: ${collectionId}`)
  
  for (const attr of attributes) {
    try {
      console.log(`  Creating attribute: ${attr.key} (${attr.type})`)
      
      let result
      switch (attr.type) {
        case "string":
          result = await databases.createStringAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.size || 255,
            attr.required || false,
            attr.default,
            attr.array || false
          )
          break
          
        case "email":
          result = await databases.createEmailAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required || false,
            attr.default,
            attr.array || false
          )
          break
          
        case "integer":
          result = await databases.createIntegerAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required || false,
            attr.min,
            attr.max,
            attr.default,
            attr.array || false
          )
          break
          
        case "float":
          result = await databases.createFloatAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required || false,
            attr.min,
            attr.max,
            attr.default,
            attr.array || false
          )
          break
          
        case "boolean":
          result = await databases.createBooleanAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required || false,
            attr.default,
            attr.array || false
          )
          break
          
        case "datetime":
          result = await databases.createDatetimeAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required || false,
            attr.default,
            attr.array || false
          )
          break
          
        case "enum":
          result = await databases.createEnumAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.elements || [],
            attr.required || false,
            attr.default,
            attr.array || false
          )
          break
          
        default:
          console.warn(`Unknown attribute type: ${attr.type}`)
          continue
      }
      
      console.log(`    ✅ Created: ${attr.key}`)
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (error) {
      console.error(`    ❌ Failed to create attribute ${attr.key}:`, error.message)
    }
  }
}

/**
 * Create indexes for a collection
 */
async function createIndexes(collectionId, indexes) {
  console.log(`Creating indexes for collection: ${collectionId}`)
  
  for (const index of indexes) {
    try {
      console.log(`  Creating index: ${index.key}`)
      
      await databases.createIndex(
        DATABASE_ID,
        collectionId,
        index.key,
        index.type,
        index.attributes,
        index.orders
      )
      
      console.log(`    ✅ Created index: ${index.key}`)
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (error) {
      console.error(`    ❌ Failed to create index ${index.key}:`, error.message)
    }
  }
}

/**
 * Setup essential collections
 */
async function setupEssentialCollections() {
  console.log("Setting up essential collections for Stitch and Wear Tailors...")
  
  try {
    for (const [collectionId, schema] of Object.entries(ESSENTIAL_COLLECTIONS)) {
      console.log(`\n📁 Processing collection: ${collectionId}`)
      
      try {
        // Check if collection exists
        await databases.getCollection(DATABASE_ID, collectionId)
        console.log(`Collection ${collectionId} already exists`)
      } catch {
        console.log(`Creating collection: ${collectionId}`)
        await databases.createCollection(
          DATABASE_ID,
          collectionId,
          schema.name,
          ["read(\"users\")", "create(\"users\")"], // Default permissions
          true, // Document security
          true  // Enabled
        )
        
        // Wait for collection to be ready
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Create attributes
      await createAttributes(collectionId, schema.attributes)
      
      // Wait before creating indexes
      console.log("Waiting for attributes to be ready...")
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Create indexes
      await createIndexes(collectionId, schema.indexes)
      
      console.log(`✅ Completed collection: ${collectionId}`)
    }
    
    console.log("\n🎉 Essential database setup completed successfully!")
    console.log("Collections created:")
    Object.keys(ESSENTIAL_COLLECTIONS).forEach(id => {
      console.log(`  - ${id}`)
    })
    
  } catch (error) {
    console.error("❌ Database setup failed:", error)
    process.exit(1)
  }
}

/**
 * Main execution
 */
async function main() {
  if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    console.error("❌ Please set APPWRITE_PROJECT_ID and APPWRITE_API_KEY environment variables")
    process.exit(1)
  }
  
  console.log("🚀 Starting Appwrite database setup...")
  console.log(`📡 Endpoint: ${APPWRITE_ENDPOINT}`)
  console.log(`🆔 Project: ${APPWRITE_PROJECT_ID}`)
  console.log(`🗄️  Database: ${DATABASE_ID}`)
  
  await setupEssentialCollections()
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { setupEssentialCollections }