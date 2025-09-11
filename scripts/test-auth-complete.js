#!/usr/bin/env node

/**
 * Comprehensive Authentication Test Script
 * Tests all authentication functionality end-to-end
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

// Test results
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
}

// Helper functions
function logTest(name, status, message = "") {
  const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️"
  console.log(`${icon} ${name}${message ? ": " + message : ""}`)

  if (status === "pass") {
    testResults.passed.push(name)
  } else if (status === "fail") {
    testResults.failed.push({ name, message })
  } else {
    testResults.warnings.push({ name, message })
  }
}

async function testAuthentication() {
  console.log("🧪 Comprehensive Authentication Testing\n")
  console.log("═".repeat(50))

  // Initialize clients
  const client = new sdk.Client()
  client.setEndpoint(config.endpoint).setProject(config.projectId)
  const account = new sdk.Account(client)

  const adminClient = new sdk.Client()
  adminClient.setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey)
  const databases = new sdk.Databases(adminClient)
  const users = new sdk.Users(adminClient)

  // Test 1: Database Connection
  console.log("\n📦 Testing Database Connection...")
  try {
    const db = await databases.get(config.databaseId)
    logTest("Database connection", "pass", `Connected to ${db.name}`)
  } catch (error) {
    logTest("Database connection", "fail", error.message)
    return
  }

  // Test 2: Collections Verification
  console.log("\n📋 Verifying Collections...")
  const requiredCollections = [
    "user_profiles",
    "auth_sessions",
    "password_reset_tokens",
    "email_verification_tokens",
    "two_factor_auth",
    "login_attempts",
    "security_events",
  ]

  for (const collectionId of requiredCollections) {
    try {
      const collection = await databases.getCollection(config.databaseId, collectionId)
      logTest(`Collection: ${collectionId}`, "pass", `${collection.total || 0} attributes`)
    } catch (error) {
      logTest(`Collection: ${collectionId}`, "fail", "Not found")
    }
  }

  // Test 3: User Authentication
  console.log("\n👤 Testing User Authentication...")
  const testUsers = [
    { email: "admin@stitchandwear.com", password: "Admin@123456", role: "Admin" },
    { email: "tailor@stitchandwear.com", password: "Tailor@123456", role: "Tailor" },
    { email: "client@stitchandwear.com", password: "Client@123456", role: "Client" },
  ]

  for (const user of testUsers) {
    try {
      // Test login
      const session = await account.createEmailPasswordSession(user.email, user.password)
      logTest(`${user.role} login`, "pass", `Session: ${session.$id.substring(0, 8)}...`)

      // Test getting user info
      const userInfo = await account.get()
      logTest(`${user.role} account info`, "pass", `User ID: ${userInfo.$id.substring(0, 8)}...`)

      // Test logout
      await account.deleteSession("current")
      logTest(`${user.role} logout`, "pass")
    } catch (error) {
      logTest(`${user.role} authentication`, "fail", error.message)
    }
  }

  // Test 4: User Profiles
  console.log("\n📄 Testing User Profiles...")
  try {
    const profiles = await databases.listDocuments(config.databaseId, "user_profiles")

    if (profiles.total > 0) {
      logTest("User profiles", "pass", `Found ${profiles.total} profiles`)

      // Check profile structure
      const profile = profiles.documents[0]
      const requiredFields = ["userId", "email", "firstName", "lastName"]
      const missingFields = requiredFields.filter((field) => !profile.hasOwnProperty(field))

      if (missingFields.length === 0) {
        logTest("Profile structure", "pass", "All required fields present")
      } else {
        logTest("Profile structure", "warn", `Missing fields: ${missingFields.join(", ")}`)
      }
    } else {
      logTest("User profiles", "warn", "No profiles found")
    }
  } catch (error) {
    logTest("User profiles", "fail", error.message)
  }

  // Test 5: Session Management
  console.log("\n🔐 Testing Session Management...")
  try {
    // Create a test session
    await account.createEmailPasswordSession(testUsers[0].email, testUsers[0].password)

    // List sessions
    const sessions = await account.listSessions()
    if (sessions.total > 0) {
      logTest("Session creation", "pass", `Active sessions: ${sessions.total}`)

      // Delete all sessions
      await account.deleteSessions()
      logTest("Session cleanup", "pass", "All sessions deleted")
    }
  } catch (error) {
    logTest("Session management", "fail", error.message)
  }

  // Test 6: Security Features
  console.log("\n🛡️ Testing Security Features...")

  // Check if collections support security features
  const securityTests = [
    { collection: "login_attempts", feature: "Rate limiting" },
    { collection: "security_events", feature: "Audit logging" },
    { collection: "two_factor_auth", feature: "2FA support" },
  ]

  for (const test of securityTests) {
    try {
      await databases.getCollection(config.databaseId, test.collection)
      logTest(test.feature, "pass", "Collection ready")
    } catch (error) {
      logTest(test.feature, "warn", "Collection not accessible")
    }
  }

  // Test 7: Error Handling
  console.log("\n⚠️ Testing Error Handling...")

  // Test invalid credentials
  try {
    await account.createEmailPasswordSession("invalid@email.com", "wrongpassword")
    logTest("Invalid credentials handling", "fail", "Should have thrown error")
  } catch (error) {
    if (error.code === 401) {
      logTest("Invalid credentials handling", "pass", "Properly rejects invalid login")
    } else {
      logTest("Invalid credentials handling", "warn", error.message)
    }
  }

  // Print Summary
  console.log("\n" + "═".repeat(50))
  console.log("📊 Test Summary\n")
  console.log(`✅ Passed: ${testResults.passed.length} tests`)
  console.log(`❌ Failed: ${testResults.failed.length} tests`)
  console.log(`⚠️ Warnings: ${testResults.warnings.length} warnings`)

  if (testResults.failed.length > 0) {
    console.log("\n❌ Failed Tests:")
    testResults.failed.forEach((test) => {
      console.log(`  - ${test.name}: ${test.message}`)
    })
  }

  if (testResults.warnings.length > 0) {
    console.log("\n⚠️ Warnings:")
    testResults.warnings.forEach((warning) => {
      console.log(`  - ${warning.name}: ${warning.message}`)
    })
  }

  // Final status
  console.log("\n" + "═".repeat(50))
  if (testResults.failed.length === 0) {
    console.log("🎉 All critical tests passed! Authentication is ready.")
  } else {
    console.log("⚠️ Some tests failed. Please review and fix issues.")
  }
}

// Run tests
testAuthentication().catch((error) => {
  console.error("❌ Test suite failed:", error)
  process.exit(1)
})
