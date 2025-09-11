#!/usr/bin/env node

/**
 * Setup script for Enhanced Authentication collections in Appwrite
 * Creates collections for 2FA, biometric config, and social accounts
 */

const { Client, Databases, ID, Permission, Role } = require("appwrite")
require("dotenv").config()

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "stitch-and-wear-db"

async function createCollections() {
  console.log("🔧 Setting up Enhanced Authentication collections...\n")

  try {
    // 1. Two-Factor Authentication Collection
    console.log("Creating 2FA Collection...")
    const twoFactorCollection = await databases.createCollection(
      DATABASE_ID,
      "two_factor_auth",
      "Two Factor Authentication",
      [
        Permission.read(Role.user("self")),
        Permission.write(Role.user("self")),
        Permission.delete(Role.user("self")),
      ],
    )

    // 2FA Attributes
    await databases.createStringAttribute(DATABASE_ID, "two_factor_auth", "userId", 255, true)

    await databases.createStringAttribute(DATABASE_ID, "two_factor_auth", "secret", 255, true)

    await databases.createStringAttribute(
      DATABASE_ID,
      "two_factor_auth",
      "backupCodes",
      5000,
      false,
      null,
      true, // array
    )

    await databases.createEnumAttribute(
      DATABASE_ID,
      "two_factor_auth",
      "method",
      ["2fa_totp", "2fa_sms"],
      true,
    )

    await databases.createBooleanAttribute(DATABASE_ID, "two_factor_auth", "enabled", true, false)

    await databases.createBooleanAttribute(DATABASE_ID, "two_factor_auth", "verified", true, false)

    await databases.createStringAttribute(DATABASE_ID, "two_factor_auth", "phoneNumber", 20, false)

    await databases.createDatetimeAttribute(DATABASE_ID, "two_factor_auth", "createdAt", true)

    await databases.createDatetimeAttribute(DATABASE_ID, "two_factor_auth", "lastUsedAt", false)

    console.log("✅ 2FA Collection created\n")

    // 2. Biometric Configuration Collection
    console.log("Creating Biometric Config Collection...")
    const biometricCollection = await databases.createCollection(
      DATABASE_ID,
      "biometric_config",
      "Biometric Configuration",
      [
        Permission.read(Role.user("self")),
        Permission.write(Role.user("self")),
        Permission.delete(Role.user("self")),
      ],
    )

    // Biometric Attributes
    await databases.createStringAttribute(DATABASE_ID, "biometric_config", "userId", 255, true)

    await databases.createBooleanAttribute(DATABASE_ID, "biometric_config", "enabled", true, false)

    await databases.createEnumAttribute(
      DATABASE_ID,
      "biometric_config",
      "biometricType",
      ["face", "fingerprint", "iris", "none"],
      true,
    )

    await databases.createStringAttribute(DATABASE_ID, "biometric_config", "deviceId", 255, true)

    await databases.createStringAttribute(
      DATABASE_ID,
      "biometric_config",
      "encryptedCredentials",
      500,
      false,
    )

    await databases.createDatetimeAttribute(DATABASE_ID, "biometric_config", "createdAt", true)

    await databases.createDatetimeAttribute(DATABASE_ID, "biometric_config", "lastUsedAt", false)

    await databases.createDatetimeAttribute(DATABASE_ID, "biometric_config", "disabledAt", false)

    console.log("✅ Biometric Config Collection created\n")

    // 3. Social Accounts Collection
    console.log("Creating Social Accounts Collection...")
    const socialAccountsCollection = await databases.createCollection(
      DATABASE_ID,
      "social_accounts",
      "Social Account Links",
      [
        Permission.read(Role.user("self")),
        Permission.write(Role.user("self")),
        Permission.delete(Role.user("self")),
      ],
    )

    // Social Accounts Attributes
    await databases.createStringAttribute(DATABASE_ID, "social_accounts", "userId", 255, true)

    await databases.createEnumAttribute(
      DATABASE_ID,
      "social_accounts",
      "provider",
      ["google", "facebook", "apple"],
      true,
    )

    await databases.createStringAttribute(
      DATABASE_ID,
      "social_accounts",
      "providerUserId",
      255,
      true,
    )

    await databases.createStringAttribute(DATABASE_ID, "social_accounts", "email", 255, true)

    await databases.createDatetimeAttribute(DATABASE_ID, "social_accounts", "linkedAt", true)

    console.log("✅ Social Accounts Collection created\n")

    // 4. Session Management Collection (Enhanced)
    console.log("Creating Enhanced Sessions Collection...")
    const sessionsCollection = await databases.createCollection(
      DATABASE_ID,
      "sessions_enhanced",
      "Enhanced Session Management",
      [
        Permission.read(Role.user("self")),
        Permission.write(Role.user("self")),
        Permission.delete(Role.user("self")),
      ],
    )

    // Session Attributes
    await databases.createStringAttribute(DATABASE_ID, "sessions_enhanced", "sessionId", 255, true)

    await databases.createStringAttribute(DATABASE_ID, "sessions_enhanced", "userId", 255, true)

    await databases.createStringAttribute(
      DATABASE_ID,
      "sessions_enhanced",
      "deviceFingerprint",
      500,
      true,
    )

    await databases.createStringAttribute(DATABASE_ID, "sessions_enhanced", "ipAddress", 45, false)

    await databases.createStringAttribute(DATABASE_ID, "sessions_enhanced", "userAgent", 500, false)

    await databases.createBooleanAttribute(DATABASE_ID, "sessions_enhanced", "isActive", true, true)

    await databases.createBooleanAttribute(
      DATABASE_ID,
      "sessions_enhanced",
      "rememberMe",
      true,
      false,
    )

    await databases.createDatetimeAttribute(DATABASE_ID, "sessions_enhanced", "createdAt", true)

    await databases.createDatetimeAttribute(
      DATABASE_ID,
      "sessions_enhanced",
      "lastActivityAt",
      true,
    )

    await databases.createDatetimeAttribute(DATABASE_ID, "sessions_enhanced", "expiresAt", true)

    console.log("✅ Enhanced Sessions Collection created\n")

    // 5. Security Logs Collection
    console.log("Creating Security Logs Collection...")
    const securityLogsCollection = await databases.createCollection(
      DATABASE_ID,
      "security_logs",
      "Security Audit Logs",
      [Permission.read(Role.user("self")), Permission.create(Role.users())],
    )

    // Security Log Attributes
    await databases.createStringAttribute(DATABASE_ID, "security_logs", "userId", 255, true)

    await databases.createEnumAttribute(
      DATABASE_ID,
      "security_logs",
      "eventType",
      [
        "login_success",
        "login_failed",
        "logout",
        "2fa_enabled",
        "2fa_disabled",
        "2fa_success",
        "2fa_failed",
        "biometric_enabled",
        "biometric_disabled",
        "biometric_success",
        "biometric_failed",
        "social_linked",
        "social_unlinked",
        "password_changed",
        "session_expired",
        "suspicious_activity",
      ],
      true,
    )

    await databases.createStringAttribute(DATABASE_ID, "security_logs", "ipAddress", 45, false)

    await databases.createStringAttribute(DATABASE_ID, "security_logs", "userAgent", 500, false)

    await databases.createStringAttribute(DATABASE_ID, "security_logs", "metadata", 1000, false)

    await databases.createDatetimeAttribute(DATABASE_ID, "security_logs", "timestamp", true)

    console.log("✅ Security Logs Collection created\n")

    // Create Indexes for better query performance
    console.log("Creating indexes...")

    // Index for 2FA lookups
    await databases.createIndex(DATABASE_ID, "two_factor_auth", "idx_userId", "key", ["userId"])

    // Index for biometric lookups
    await databases.createIndex(DATABASE_ID, "biometric_config", "idx_userId_deviceId", "key", [
      "userId",
      "deviceId",
    ])

    // Index for social account lookups
    await databases.createIndex(DATABASE_ID, "social_accounts", "idx_userId_provider", "key", [
      "userId",
      "provider",
    ])

    // Index for session lookups
    await databases.createIndex(DATABASE_ID, "sessions_enhanced", "idx_userId_active", "key", [
      "userId",
      "isActive",
    ])

    // Index for security log queries
    await databases.createIndex(DATABASE_ID, "security_logs", "idx_userId_timestamp", "key", [
      "userId",
      "timestamp",
    ])

    console.log("✅ All indexes created\n")

    console.log("🎉 Enhanced Authentication setup complete!")
    console.log("\nCreated collections:")
    console.log("  - two_factor_auth")
    console.log("  - biometric_config")
    console.log("  - social_accounts")
    console.log("  - sessions_enhanced")
    console.log("  - security_logs")
  } catch (error) {
    console.error("❌ Error setting up collections:", error)
    if (error.code === 409) {
      console.log(
        "\n⚠️  Some collections may already exist. This is normal if running the script multiple times.",
      )
    } else {
      process.exit(1)
    }
  }
}

// Run the setup
createCollections().catch(console.error)
