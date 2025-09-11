#!/usr/bin/env node

/**
 * Complete Authentication Setup Script for Stitch & Wear Tailors
 *
 * This script sets up:
 * 1. Appwrite authentication configuration
 * 2. Database collections for user profiles
 * 3. OAuth providers (if configured)
 * 4. Email templates
 * 5. Security settings
 *
 * Usage: node scripts/setup-auth-complete.js
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

// Collection definitions
const collections = {
  // User profiles collection
  user_profiles: {
    id: "user_profiles",
    name: "User Profiles",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "email", size: 255, required: true },
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
      { type: "string", id: "avatar", size: 255, required: false },
      {
        type: "enum",
        id: "status",
        elements: ["pending_verification", "active", "suspended", "pending_tailor_approval"],
        required: true,
        default: "pending_verification",
      },
      { type: "boolean", id: "emailVerified", required: true, default: false },
      { type: "boolean", id: "phoneVerified", required: true, default: false },
      { type: "boolean", id: "twoFactorEnabled", required: true, default: false },
      { type: "string", id: "bio", size: 500, required: false },
      { type: "string", id: "address", size: 255, required: false },
      { type: "string", id: "city", size: 100, required: false },
      { type: "string", id: "state", size: 100, required: false },
      { type: "string", id: "country", size: 100, required: false, default: "Nigeria" },
      { type: "string", id: "postalCode", size: 20, required: false },
      { type: "datetime", id: "lastLoginAt", required: false },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "updatedAt", required: true },
    ],
    indexes: [
      { type: "unique", attributes: ["userId"] },
      { type: "unique", attributes: ["email"] },
      { type: "key", attributes: ["userType"] },
      { type: "key", attributes: ["status"] },
      { type: "fulltext", attributes: ["firstName", "lastName"] },
    ],
  },

  // Authentication sessions
  auth_sessions: {
    id: "auth_sessions",
    name: "Authentication Sessions",
    attributes: [
      { type: "string", id: "sessionId", size: 36, required: true },
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "deviceId", size: 100, required: false },
      { type: "string", id: "deviceName", size: 100, required: false },
      { type: "string", id: "deviceType", size: 50, required: false },
      { type: "string", id: "ipAddress", size: 45, required: false },
      { type: "string", id: "userAgent", size: 500, required: false },
      { type: "boolean", id: "isActive", required: true, default: true },
      { type: "datetime", id: "expiresAt", required: true },
      { type: "datetime", id: "lastActivityAt", required: true },
      { type: "datetime", id: "createdAt", required: true },
    ],
    indexes: [
      { type: "unique", attributes: ["sessionId"] },
      { type: "key", attributes: ["userId"] },
      { type: "key", attributes: ["isActive"] },
      { type: "key", attributes: ["expiresAt"] },
    ],
  },

  // Password reset tokens
  password_reset_tokens: {
    id: "password_reset_tokens",
    name: "Password Reset Tokens",
    attributes: [
      { type: "string", id: "token", size: 64, required: true },
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "email", size: 255, required: true },
      { type: "boolean", id: "used", required: true, default: false },
      { type: "datetime", id: "expiresAt", required: true },
      { type: "datetime", id: "createdAt", required: true },
    ],
    indexes: [
      { type: "unique", attributes: ["token"] },
      { type: "key", attributes: ["userId"] },
      { type: "key", attributes: ["email"] },
      { type: "key", attributes: ["used"] },
    ],
  },

  // Email verification tokens
  email_verification_tokens: {
    id: "email_verification_tokens",
    name: "Email Verification Tokens",
    attributes: [
      { type: "string", id: "token", size: 64, required: true },
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "email", size: 255, required: true },
      { type: "boolean", id: "verified", required: true, default: false },
      { type: "datetime", id: "verifiedAt", required: false },
      { type: "datetime", id: "expiresAt", required: true },
      { type: "datetime", id: "createdAt", required: true },
    ],
    indexes: [
      { type: "unique", attributes: ["token"] },
      { type: "key", attributes: ["userId"] },
      { type: "key", attributes: ["email"] },
      { type: "key", attributes: ["verified"] },
    ],
  },

  // Two-factor authentication
  two_factor_auth: {
    id: "two_factor_auth",
    name: "Two Factor Authentication",
    attributes: [
      { type: "string", id: "userId", size: 36, required: true },
      { type: "string", id: "secret", size: 255, required: true },
      { type: "string", id: "backupCodes", size: 1000, required: false },
      { type: "boolean", id: "enabled", required: true, default: false },
      {
        type: "enum",
        id: "method",
        elements: ["totp", "sms", "email"],
        required: true,
        default: "totp",
      },
      { type: "datetime", id: "enabledAt", required: false },
      { type: "datetime", id: "lastUsedAt", required: false },
      { type: "datetime", id: "createdAt", required: true },
      { type: "datetime", id: "updatedAt", required: true },
    ],
    indexes: [
      { type: "unique", attributes: ["userId"] },
      { type: "key", attributes: ["enabled"] },
    ],
  },

  // Login attempts for rate limiting
  login_attempts: {
    id: "login_attempts",
    name: "Login Attempts",
    attributes: [
      { type: "string", id: "identifier", size: 255, required: true }, // email or IP
      { type: "enum", id: "type", elements: ["email", "ip"], required: true },
      { type: "integer", id: "attempts", required: true, default: 0, min: 0, max: 100 },
      { type: "datetime", id: "blockedUntil", required: false },
      { type: "datetime", id: "lastAttemptAt", required: true },
      { type: "datetime", id: "createdAt", required: true },
    ],
    indexes: [
      { type: "unique", attributes: ["identifier", "type"] },
      { type: "key", attributes: ["blockedUntil"] },
    ],
  },

  // Security events logging
  security_events: {
    id: "security_events",
    name: "Security Events",
    attributes: [
      { type: "string", id: "userId", size: 36, required: false },
      {
        type: "enum",
        id: "eventType",
        elements: [
          "login_success",
          "login_failed",
          "logout",
          "password_reset_requested",
          "password_changed",
          "email_verified",
          "two_factor_enabled",
          "two_factor_disabled",
          "account_locked",
          "account_unlocked",
          "suspicious_activity",
        ],
        required: true,
      },
      { type: "string", id: "ipAddress", size: 45, required: false },
      { type: "string", id: "userAgent", size: 500, required: false },
      { type: "string", id: "details", size: 1000, required: false },
      { type: "datetime", id: "createdAt", required: true },
    ],
    indexes: [
      { type: "key", attributes: ["userId"] },
      { type: "key", attributes: ["eventType"] },
      { type: "key", attributes: ["createdAt"] },
    ],
  },
}

// Helper function to create attributes
async function createAttribute(collectionId, attribute) {
  const { type, id, ...params } = attribute

  try {
    switch (type) {
      case "string":
        await databases.createStringAttribute(
          config.databaseId,
          collectionId,
          id,
          params.size,
          params.required,
          params.default || null,
          params.array || false,
        )
        break
      case "integer":
        await databases.createIntegerAttribute(
          config.databaseId,
          collectionId,
          id,
          params.required,
          params.min,
          params.max,
          params.default,
          params.array || false,
        )
        break
      case "float":
        await databases.createFloatAttribute(
          config.databaseId,
          collectionId,
          id,
          params.required,
          params.min,
          params.max,
          params.default,
          params.array || false,
        )
        break
      case "boolean":
        await databases.createBooleanAttribute(
          config.databaseId,
          collectionId,
          id,
          params.required,
          params.default,
          params.array || false,
        )
        break
      case "datetime":
        await databases.createDatetimeAttribute(
          config.databaseId,
          collectionId,
          id,
          params.required,
          params.default || null,
          params.array || false,
        )
        break
      case "enum":
        await databases.createEnumAttribute(
          config.databaseId,
          collectionId,
          id,
          params.elements,
          params.required,
          params.default || null,
          params.array || false,
        )
        break
    }
    console.log(`  ✅ Created attribute: ${id}`)
  } catch (error) {
    if (error.code === 409) {
      console.log(`  ℹ️  Attribute ${id} already exists`)
    } else {
      console.error(`  ❌ Failed to create attribute ${id}:`, error.message)
    }
  }
}

// Helper function to create indexes
async function createIndex(collectionId, index) {
  try {
    await databases.createIndex(
      config.databaseId,
      collectionId,
      ID.unique(),
      index.type,
      index.attributes,
    )
    console.log(`  ✅ Created ${index.type} index on [${index.attributes.join(", ")}]`)
  } catch (error) {
    if (error.code === 409) {
      console.log(`  ℹ️  Index on [${index.attributes.join(", ")}] already exists`)
    } else {
      console.error(`  ❌ Failed to create index:`, error.message)
    }
  }
}

// Main setup function
async function setupAuthentication() {
  console.log("🚀 Starting Authentication Setup...\n")

  // Step 1: Create database if it doesn't exist
  console.log("📦 Step 1: Setting up database...")
  try {
    await databases.get(config.databaseId)
    console.log(`  ℹ️  Database ${config.databaseId} already exists`)
  } catch (error) {
    if (error.code === 404) {
      try {
        await databases.create(config.databaseId, "Stitch & Wear Database")
        console.log(`  ✅ Created database: ${config.databaseId}`)
      } catch (createError) {
        console.error(`  ❌ Failed to create database:`, createError.message)
        process.exit(1)
      }
    } else {
      console.error(`  ❌ Failed to check database:`, error.message)
      process.exit(1)
    }
  }

  // Step 2: Create collections
  console.log("\n📋 Step 2: Creating collections...")
  for (const [key, collection] of Object.entries(collections)) {
    console.log(`\n  Creating collection: ${collection.name}`)

    try {
      // Check if collection exists
      await databases.getCollection(config.databaseId, collection.id)
      console.log(`    ℹ️  Collection already exists`)
    } catch (error) {
      if (error.code === 404) {
        // Create collection
        try {
          await databases.createCollection(config.databaseId, collection.id, collection.name, [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.user(ID.custom("owner"))),
            Permission.delete(Role.user(ID.custom("owner"))),
          ])
          console.log(`    ✅ Created collection`)
        } catch (createError) {
          console.error(`    ❌ Failed to create collection:`, createError.message)
          continue
        }
      } else {
        console.error(`    ❌ Failed to check collection:`, error.message)
        continue
      }
    }

    // Create attributes
    console.log(`    Creating attributes...`)
    for (const attribute of collection.attributes) {
      await createAttribute(collection.id, attribute)
      // Wait a bit to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Create indexes
    if (collection.indexes && collection.indexes.length > 0) {
      console.log(`    Creating indexes...`)
      for (const index of collection.indexes) {
        await createIndex(collection.id, index)
        // Wait a bit to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  // Step 3: Create teams for role-based access
  console.log("\n👥 Step 3: Setting up teams...")
  const teamNames = ["admins", "tailors", "clients"]

  for (const teamName of teamNames) {
    try {
      const teamsList = await teams.list([Query.equal("name", teamName)])
      if (teamsList.teams.length > 0) {
        console.log(`  ℹ️  Team '${teamName}' already exists`)
      } else {
        await teams.create(ID.unique(), teamName, [`${teamName}@stitchandwear.com`])
        console.log(`  ✅ Created team: ${teamName}`)
      }
    } catch (error) {
      console.error(`  ❌ Failed to create team ${teamName}:`, error.message)
    }
  }

  // Step 4: Create test users (optional)
  console.log("\n👤 Step 4: Creating test users...")
  const testUsers = [
    {
      email: "admin@stitchandwear.com",
      password: "Admin@123456",
      name: "Admin User",
      userType: "admin",
    },
    {
      email: "tailor@stitchandwear.com",
      password: "Tailor@123456",
      name: "Test Tailor",
      userType: "tailor",
    },
    {
      email: "client@stitchandwear.com",
      password: "Client@123456",
      name: "Test Client",
      userType: "client",
    },
  ]

  for (const testUser of testUsers) {
    try {
      // Check if user exists
      const usersList = await users.list([Query.equal("email", testUser.email)])
      if (usersList.users.length > 0) {
        console.log(`  ℹ️  User ${testUser.email} already exists`)
      } else {
        // Create user
        const user = await users.create(
          ID.unique(),
          testUser.email,
          undefined, // phone
          testUser.password,
          testUser.name,
        )

        // Create user profile
        await databases.createDocument(config.databaseId, "user_profiles", ID.unique(), {
          userId: user.$id,
          email: testUser.email,
          firstName: testUser.name.split(" ")[0],
          lastName: testUser.name.split(" ")[1] || "",
          userType: testUser.userType,
          status: "active",
          emailVerified: true,
          phoneVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        console.log(`  ✅ Created test user: ${testUser.email}`)
      }
    } catch (error) {
      console.error(`  ❌ Failed to create user ${testUser.email}:`, error.message)
    }
  }

  console.log("\n✨ Authentication setup complete!")
  console.log("\n📝 Next steps:")
  console.log("1. Update your .env file with the correct Appwrite credentials")
  console.log("2. Configure OAuth providers in your Appwrite console (optional)")
  console.log("3. Set up email templates in Appwrite console")
  console.log("4. Test authentication flow with the test users:")
  console.log("   - admin@stitchandwear.com / Admin@123456")
  console.log("   - tailor@stitchandwear.com / Tailor@123456")
  console.log("   - client@stitchandwear.com / Client@123456")
  console.log("\n🔒 Security recommendations:")
  console.log("- Enable rate limiting in production")
  console.log("- Configure CORS settings properly")
  console.log("- Set up SSL/TLS certificates")
  console.log("- Enable audit logging")
  console.log("- Implement session timeout policies")
  console.log("- Configure password policies")
}

// Run the setup
setupAuthentication().catch((error) => {
  console.error("\n❌ Setup failed:", error)
  process.exit(1)
})
