#!/usr/bin/env node

/**
 * Authentication Database Setup Script for Appwrite
 * Creates all required collections and attributes for the authentication system
 *
 * Usage: node scripts/setup-auth-database.js
 *
 * Prerequisites:
 * - Appwrite CLI installed and configured
 * - Environment variables set in .env
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

// Collection definitions for authentication system
const authCollections = [
  {
    id: "user_profiles",
    name: "User Profiles",
    attributes: [
      { type: "email", id: "email", size: 255, required: true },
      { type: "string", id: "firstName", size: 100, required: true },
      { type: "string", id: "lastName", size: 100, required: true },
      {
        type: "enum",
        id: "userType",
        elements: ["client", "tailor", "admin"],
        required: true,
        default: "client",
      },
      { type: "string", id: "phone", size: 20, required: false },
      {
        type: "enum",
        id: "status",
        elements: ["pending_verification", "active", "suspended", "pending_tailor_approval"],
        required: true,
        default: "pending_verification",
      },
      { type: "boolean", id: "emailVerified", required: true, default: false },
      { type: "datetime", id: "emailVerifiedAt", required: false },
      { type: "boolean", id: "has2FA", required: true, default: false },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "updatedAt", required: true },
      { type: "datetime", id: "lastLoginAt", required: false },
    ],
  },
  {
    id: "sessions",
    name: "User Sessions",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "deviceId", size: 100, required: false },
      { type: "string", id: "deviceName", size: 100, required: false },
      { type: "string", id: "deviceFingerprint", size: 255, required: false },
      { type: "string", id: "ipAddress", size: 45, required: false },
      { type: "string", id: "userAgent", size: 500, required: false },
      { type: "boolean", id: "active", required: true, default: true },
      {
        type: "enum",
        id: "trustLevel",
        elements: ["none", "session", "persistent"],
        required: true,
        default: "none",
      },
      { type: "boolean", id: "mfaCompleted", required: true, default: false },
      { type: "integer", id: "riskScore", min: 0, max: 100, required: true, default: 0 },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "lastActivity", required: true },
      { type: "datetime", id: "expiresAt", required: true },
      { type: "datetime", id: "idleSince", required: false },
      { type: "datetime", id: "revokedAt", required: false },
    ],
  },
  {
    id: "verification_tokens",
    name: "Email Verification Tokens",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "tokenHash", size: 64, required: true },
      { type: "string", id: "code", size: 10, required: true },
      {
        type: "enum",
        id: "tokenType",
        elements: ["registration", "email_change", "security"],
        required: true,
        default: "registration",
      },
      { type: "integer", id: "attemptCount", min: 0, max: 10, required: true, default: 0 },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "expiresAt", required: true },
      { type: "datetime", id: "usedAt", required: false },
      { type: "datetime", id: "invalidatedAt", required: false },
    ],
  },
  {
    id: "verification_attempts",
    name: "Verification Attempts Tracking",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "integer", id: "attemptCount", min: 0, required: true, default: 1 },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "lastAttemptAt", required: true },
    ],
  },
  {
    id: "password_recovery_tokens",
    name: "Password Recovery Tokens",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "tokenHash", size: 64, required: true },
      { type: "string", id: "code", size: 10, required: true },
      { type: "enum", id: "method", elements: ["email", "sms"], required: true, default: "email" },
      { type: "integer", id: "attemptCount", min: 0, max: 10, required: true, default: 0 },
      { type: "string", id: "ipAddress", size: 45, required: false },
      { type: "string", id: "userAgent", size: 500, required: false },
      { type: "integer", id: "riskScore", min: 0, max: 100, required: true, default: 0 },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "expiresAt", required: true },
      { type: "datetime", id: "usedAt", required: false },
    ],
  },
  {
    id: "token_metadata",
    name: "JWT Token Metadata",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "refreshTokenHash", size: 64, required: true },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "expiresAt", required: true },
      { type: "datetime", id: "usedAt", required: false },
      { type: "datetime", id: "lastRefreshed", required: false },
    ],
  },
  {
    id: "security_events",
    name: "Security Events Log",
    attributes: [
      { type: "string", id: "type", size: 50, required: true },
      {
        type: "enum",
        id: "severity",
        elements: ["info", "warning", "critical"],
        required: true,
        default: "info",
      },
      { type: "string", id: "userId", size: 36, required: false },
      { type: "string", id: "sessionId", size: 36, required: false },
      { type: "string", id: "details", size: 5000, required: false },
      { type: "string", id: "ipAddress", size: 45, required: false },
      { type: "datetime", id: "timestamp", required: true },
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
async function setupAuthDatabase() {
  console.log("🚀 Starting Authentication Database Setup...\n")
  console.log(`Database ID: ${DATABASE_ID}\n`)

  // First, try to create the database
  try {
    await databases.create(DATABASE_ID, "Stitch & Wear Database")
    console.log(`✓ Created database: ${DATABASE_ID}\n`)
  } catch (error) {
    if (error.code === 409) {
      console.log(`- Database ${DATABASE_ID} already exists\n`)
    } else {
      console.error(`✗ Failed to create database:`, error.message)
      console.log("\nPlease ensure:")
      console.log("1. APPWRITE_API_KEY is set in your .env file")
      console.log("2. The API key has database write permissions")
      console.log("3. Appwrite server is running and accessible")
      process.exit(1)
    }
  }

  // Create collections
  for (const collection of authCollections) {
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

  console.log("🎉 Authentication Database Setup Complete!")
  console.log("\n📋 Next steps:")
  console.log("1. Update collection permissions in Appwrite console as needed")
  console.log("2. Add indexes for better query performance")
  console.log("3. Test the authentication flow")
  console.log("\n💡 To add indexes, use the Appwrite console or CLI:")
  console.log(
    "   appwrite databases createIndex --databaseId=" +
      DATABASE_ID +
      " --collectionId=user_profiles --key=email --type=unique --attributes=email",
  )
}

// Run setup
setupAuthDatabase().catch((error) => {
  console.error("Setup failed:", error)
  process.exit(1)
})
