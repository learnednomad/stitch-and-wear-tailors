#!/usr/bin/env node

/**
 * Test Appwrite Connection from React Native App Context
 */

const sdk = require("node-appwrite")
require("dotenv").config()

// Configuration matching the React Native app
const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "stitch-and-wear-db",
}

console.log("🔍 Testing Appwrite Connection\n")
console.log("Configuration:")
console.log(`  Endpoint: ${config.endpoint}`)
console.log(`  Project: ${config.projectId}`)
console.log(`  Database: ${config.databaseId}`)
console.log("")

async function testConnection() {
  try {
    // Initialize admin client
    const adminClient = new sdk.Client()
    adminClient.setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey)

    const databases = new sdk.Databases(adminClient)
    const users = new sdk.Users(adminClient)

    // Test 1: Check database connection
    console.log("📦 Testing database connection...")
    try {
      const db = await databases.get(config.databaseId)
      console.log("✅ Database connected:", db.name)
    } catch (error) {
      console.log("❌ Database connection failed:", error.message)
      return
    }

    // Test 2: Check if test user exists
    console.log("\n👤 Checking test users...")
    const testEmails = [
      "admin@stitchandwear.com",
      "tailor@stitchandwear.com",
      "client@stitchandwear.com",
    ]

    for (const email of testEmails) {
      try {
        const usersList = await users.list([sdk.Query.equal("email", email)])

        if (usersList.total > 0) {
          const user = usersList.users[0]
          console.log(`✅ ${email}: Found (ID: ${user.$id.substring(0, 8)}...)`)
        } else {
          console.log(`⚠️ ${email}: Not found`)
        }
      } catch (error) {
        console.log(`❌ ${email}: Error - ${error.message}`)
      }
    }

    // Test 3: Test user authentication (as a regular client)
    console.log("\n🔐 Testing user authentication...")
    const userClient = new sdk.Client()
    userClient.setEndpoint(config.endpoint).setProject(config.projectId)

    const account = new sdk.Account(userClient)

    try {
      // Try to login with test user
      const session = await account.createEmailPasswordSession(
        "client@stitchandwear.com",
        "Client@123456",
      )
      console.log("✅ Authentication successful")
      console.log(`  Session ID: ${session.$id.substring(0, 8)}...`)
      console.log(`  Expires: ${new Date(session.expire).toLocaleString()}`)

      // Get user info
      const user = await account.get()
      console.log("✅ User info retrieved:")
      console.log(`  Name: ${user.name}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Verified: ${user.emailVerification}`)

      // Cleanup - logout
      await account.deleteSession("current")
      console.log("✅ Logout successful")
    } catch (error) {
      console.log("❌ Authentication test failed:", error.message)
    }

    console.log("\n✅ All connection tests completed!")
  } catch (error) {
    console.error("\n❌ Connection test failed:", error)
    process.exit(1)
  }
}

testConnection()
