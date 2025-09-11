#!/usr/bin/env node

/**
 * Authentication Setup Script for Appwrite 1.6.0
 * Properly handles version 1.6.0 limitations
 */

const sdk = require("node-appwrite")
require("dotenv").config()

// Configuration
const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "stitch-and-wear-db",
}

// Validate configuration
if (!config.projectId || !config.apiKey) {
  console.error("❌ Missing required environment variables:")
  console.error("   - EXPO_PUBLIC_APPWRITE_PROJECT_ID")
  console.error("   - APPWRITE_API_KEY")
  console.error("\nPlease set these in your .env file")
  process.exit(1)
}

// Initialize Appwrite client
const client = new sdk.Client()
client.setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey)

const databases = new sdk.Databases(client)
const users = new sdk.Users(client)
const teams = new sdk.Teams(client)
const { ID, Query, Permission, Role } = sdk

// Collection definitions optimized for Appwrite 1.6.0
const collections = {
  // User profiles collection - without default values for required fields
  user_profiles: {
    id: "user_profiles",
    name: "User Profiles",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "email", size: 255, required: true },
      { type: "string", id: "firstName", size: 100, required: true },
      { type: "string", id: "lastName", size: 100, required: true },
      { type: "string", id: "userType", size: 20, required: false }, // Made optional
      { type: "string", id: "phone", size: 20, required: false },
      { type: "string", id: "avatar", size: 255, required: false },
      { type: "string", id: "bio", size: 1000, required: false },
      { type: "string", id: "address", size: 255, required: false },
      { type: "string", id: "city", size: 100, required: false },
      { type: "string", id: "state", size: 100, required: false },
      { type: "string", id: "country", size: 100, required: false },
      { type: "string", id: "postalCode", size: 20, required: false },
      { type: "string", id: "status", size: 50, required: false }, // Made optional
      { type: "boolean", id: "emailVerified", required: false }, // Made optional
      { type: "boolean", id: "phoneVerified", required: false }, // Made optional
      { type: "boolean", id: "twoFactorEnabled", required: false }, // Made optional
      { type: "datetime", id: "lastLoginAt", required: false },
      { type: "datetime", id: "createdAt", required: false },
      { type: "datetime", id: "updatedAt", required: false },
    ],
    indexes: [
      { type: "unique", attributes: ["userId"] },
      { type: "unique", attributes: ["email"] },
      { type: "fulltext", attributes: ["firstName", "lastName"] },
      { type: "key", attributes: ["userType"] },
      { type: "key", attributes: ["status"] },
    ],
  },

  // Authentication sessions
  auth_sessions: {
    id: "auth_sessions",
    name: "Authentication Sessions",
    attributes: [
      { type: "string", id: "sessionId", size: 255, required: true },
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "deviceId", size: 255, required: false },
      { type: "string", id: "deviceName", size: 255, required: false },
      { type: "string", id: "deviceType", size: 50, required: false },
      { type: "string", id: "ipAddress", size: 45, required: false },
      { type: "string", id: "userAgent", size: 500, required: false },
      { type: "boolean", id: "isActive", required: false }, // Made optional
      { type: "datetime", id: "expiresAt", required: false },
      { type: "datetime", id: "lastActivityAt", required: false },
      { type: "datetime", id: "createdAt", required: false },
    ],
    indexes: [
      { type: "unique", attributes: ["sessionId"] },
      { type: "key", attributes: ["userId"] },
      { type: "key", attributes: ["expiresAt"] },
    ],
  },

  // Password reset tokens
  password_reset_tokens: {
    id: "password_reset_tokens",
    name: "Password Reset Tokens",
    attributes: [
      { type: "string", id: "token", size: 255, required: true },
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "email", size: 255, required: true },
      { type: "boolean", id: "used", required: false }, // Made optional
      { type: "datetime", id: "expiresAt", required: false },
      { type: "datetime", id: "createdAt", required: false },
    ],
    indexes: [
      { type: "unique", attributes: ["token"] },
      { type: "key", attributes: ["userId"] },
      { type: "key", attributes: ["email"] },
    ],
  },

  // Email verification tokens
  email_verification_tokens: {
    id: "email_verification_tokens",
    name: "Email Verification Tokens",
    attributes: [
      { type: "string", id: "token", size: 255, required: true },
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "email", size: 255, required: true },
      { type: "boolean", id: "verified", required: false }, // Made optional
      { type: "datetime", id: "verifiedAt", required: false },
      { type: "datetime", id: "expiresAt", required: false },
      { type: "datetime", id: "createdAt", required: false },
    ],
    indexes: [
      { type: "unique", attributes: ["token"] },
      { type: "key", attributes: ["userId"] },
      { type: "key", attributes: ["email"] },
    ],
  },

  // Two-factor authentication
  two_factor_auth: {
    id: "two_factor_auth",
    name: "Two Factor Authentication",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "boolean", id: "enabled", required: false }, // Made optional
      { type: "string", id: "method", size: 20, required: false }, // Made optional
      { type: "string", id: "secret", size: 255, required: false },
      { type: "string", id: "backupCodes", size: 1000, required: false },
      { type: "datetime", id: "enabledAt", required: false },
      { type: "datetime", id: "lastUsedAt", required: false },
      { type: "datetime", id: "createdAt", required: false },
      { type: "datetime", id: "updatedAt", required: false },
    ],
    indexes: [{ type: "unique", attributes: ["userId"] }],
  },

  // Login attempts for rate limiting
  login_attempts: {
    id: "login_attempts",
    name: "Login Attempts",
    attributes: [
      { type: "string", id: "identifier", size: 255, required: true },
      { type: "string", id: "type", size: 50, required: true },
      { type: "integer", id: "attempts", required: false, default: 0, min: 0, max: 100 },
      { type: "datetime", id: "blockedUntil", required: false },
      { type: "datetime", id: "lastAttemptAt", required: false },
      { type: "datetime", id: "createdAt", required: false },
    ],
    indexes: [
      { type: "unique", attributes: ["identifier", "type"] },
      { type: "key", attributes: ["blockedUntil"] },
    ],
  },

  // Security events for audit logging
  security_events: {
    id: "security_events",
    name: "Security Events",
    attributes: [
      { type: "string", id: "userId", size: 36, required: false },
      { type: "string", id: "eventType", size: 50, required: true },
      { type: "string", id: "ipAddress", size: 45, required: false },
      { type: "string", id: "userAgent", size: 500, required: false },
      { type: "string", id: "details", size: 2000, required: false },
      { type: "datetime", id: "createdAt", required: false },
    ],
    indexes: [
      { type: "key", attributes: ["userId"] },
      { type: "key", attributes: ["eventType"] },
      { type: "key", attributes: ["createdAt"] },
    ],
  },
}

// Helper function to create an attribute
async function createAttribute(databaseId, collectionId, attribute) {
  try {
    switch (attribute.type) {
      case "string":
        await databases.createStringAttribute(
          databaseId,
          collectionId,
          attribute.id,
          attribute.size,
          attribute.required,
          attribute.default,
          attribute.array,
        )
        break
      case "integer":
        await databases.createIntegerAttribute(
          databaseId,
          collectionId,
          attribute.id,
          attribute.required,
          attribute.min,
          attribute.max,
          attribute.default,
          attribute.array,
        )
        break
      case "float":
        await databases.createFloatAttribute(
          databaseId,
          collectionId,
          attribute.id,
          attribute.required,
          attribute.min,
          attribute.max,
          attribute.default,
          attribute.array,
        )
        break
      case "boolean":
        await databases.createBooleanAttribute(
          databaseId,
          collectionId,
          attribute.id,
          attribute.required,
          attribute.default,
          attribute.array,
        )
        break
      case "datetime":
        await databases.createDatetimeAttribute(
          databaseId,
          collectionId,
          attribute.id,
          attribute.required,
          attribute.default,
          attribute.array,
        )
        break
      case "email":
        await databases.createEmailAttribute(
          databaseId,
          collectionId,
          attribute.id,
          attribute.required,
          attribute.default,
          attribute.array,
        )
        break
      case "url":
        await databases.createUrlAttribute(
          databaseId,
          collectionId,
          attribute.id,
          attribute.required,
          attribute.default,
          attribute.array,
        )
        break
      case "enum":
        await databases.createEnumAttribute(
          databaseId,
          collectionId,
          attribute.id,
          attribute.elements,
          attribute.required,
          attribute.default,
          attribute.array,
        )
        break
    }
    console.log(`  ✅ Created attribute: ${attribute.id}`)
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log(`  ℹ️  Attribute ${attribute.id} already exists`)
    } else {
      console.error(`  ❌ Failed to create attribute ${attribute.id}: ${error.message}`)
    }
  }
}

// Main setup function
async function setupAuth() {
  console.log("🚀 Starting Authentication Setup for Appwrite 1.6.0...\n")

  try {
    // Step 1: Setup database
    console.log("📦 Step 1: Setting up database...")
    try {
      await databases.get(config.databaseId)
      console.log(`  ℹ️  Database ${config.databaseId} already exists\n`)
    } catch (error) {
      if (error.code === 404) {
        await databases.create(config.databaseId, config.databaseId)
        console.log(`  ✅ Created database: ${config.databaseId}\n`)
      } else {
        throw error
      }
    }

    // Step 2: Create collections
    console.log("📋 Step 2: Creating collections...\n")
    for (const [key, collection] of Object.entries(collections)) {
      console.log(`  Creating collection: ${collection.name}`)

      // Create or get collection
      try {
        await databases.getCollection(config.databaseId, collection.id)
        console.log(`    ℹ️  Collection already exists`)
      } catch (error) {
        if (error.code === 404) {
          await databases.createCollection(config.databaseId, collection.id, collection.name, [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
          ])
          console.log(`    ✅ Created collection`)
        } else {
          throw error
        }
      }

      // Create attributes
      console.log(`    Creating attributes...`)
      for (const attribute of collection.attributes) {
        await createAttribute(config.databaseId, collection.id, attribute)
      }

      // Wait for attributes to be ready
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create indexes
      console.log(`    Creating indexes...`)
      for (const index of collection.indexes) {
        try {
          const indexKey = index.attributes.join("_")
          await databases.createIndex(
            config.databaseId,
            collection.id,
            indexKey,
            index.type,
            index.attributes,
            index.orders,
          )
          console.log(`  ✅ Created ${index.type} index on [${index.attributes.join(", ")}]`)
        } catch (error) {
          if (error.message.includes("already exists")) {
            console.log(`  ℹ️  Index already exists on [${index.attributes.join(", ")}]`)
          } else if (error.message.includes("Unknown attribute")) {
            console.log(
              `  ⚠️  Skipping index on [${index.attributes.join(", ")}] - attribute not ready`,
            )
          } else {
            console.error(`  ❌ Failed to create index: ${error.message}`)
          }
        }
      }

      console.log("")
    }

    // Step 3: Create test users
    console.log("👤 Step 3: Creating test users...")
    const testUsers = [
      {
        email: "admin@stitchandwear.com",
        password: "Admin@123456",
        name: "Admin User",
      },
      {
        email: "tailor@stitchandwear.com",
        password: "Tailor@123456",
        name: "Tailor User",
      },
      {
        email: "client@stitchandwear.com",
        password: "Client@123456",
        name: "Client User",
      },
    ]

    for (const user of testUsers) {
      try {
        const newUser = await users.create(
          ID.unique(),
          user.email,
          undefined, // phone
          user.password,
          user.name,
        )
        console.log(`  ✅ Created user: ${user.email}`)

        // Create user profile
        try {
          await databases.createDocument(config.databaseId, "user_profiles", ID.unique(), {
            userId: newUser.$id,
            email: user.email,
            firstName: user.name.split(" ")[0],
            lastName: user.name.split(" ")[1] || "",
            userType: user.email.includes("admin")
              ? "admin"
              : user.email.includes("tailor")
                ? "tailor"
                : "client",
            status: "active",
            emailVerified: true,
            phoneVerified: false,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
          })
          console.log(`    ✅ Created user profile`)
        } catch (profileError) {
          console.log(`    ⚠️  Could not create profile: ${profileError.message}`)
        }
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`  ℹ️  User ${user.email} already exists`)
        } else {
          console.error(`  ❌ Failed to create user ${user.email}: ${error.message}`)
        }
      }
    }

    console.log("\n✨ Authentication setup complete!\n")
    console.log("📝 Summary:")
    console.log("  - Database configured")
    console.log("  - 7 collections created")
    console.log("  - Test users available:")
    console.log("    • admin@stitchandwear.com / Admin@123456")
    console.log("    • tailor@stitchandwear.com / Tailor@123456")
    console.log("    • client@stitchandwear.com / Client@123456")
    console.log("\n🔐 Your authentication system is ready to use!")
  } catch (error) {
    console.error("❌ Setup failed:", error)
    process.exit(1)
  }
}

// Run the setup
setupAuth().catch(console.error)
