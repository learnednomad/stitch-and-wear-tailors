#!/usr/bin/env node

/**
 * Test Authentication Script
 * Tests if the authentication setup is working correctly
 */

const sdk = require("node-appwrite")
require("dotenv").config()

// Configuration
const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
}

// Initialize client
const client = new sdk.Client()
client.setEndpoint(config.endpoint).setProject(config.projectId)

const account = new sdk.Account(client)

async function testAuthentication() {
  console.log("🧪 Testing Authentication Setup...\n")

  // Test credentials
  const testUsers = [
    { email: "admin@stitchandwear.com", password: "Admin@123456", role: "Admin" },
    { email: "tailor@stitchandwear.com", password: "Tailor@123456", role: "Tailor" },
    { email: "client@stitchandwear.com", password: "Client@123456", role: "Client" },
  ]

  for (const user of testUsers) {
    console.log(`Testing ${user.role} login...`)

    try {
      // Try to create a session
      const session = await account.createEmailPasswordSession(user.email, user.password)

      console.log(`✅ ${user.role} login successful!`)
      console.log(`   Session ID: ${session.$id}`)

      // Get account details
      const accountInfo = await account.get()
      console.log(`   User ID: ${accountInfo.$id}`)
      console.log(`   Email: ${accountInfo.email}`)

      // Delete session
      await account.deleteSession("current")
      console.log(`   Session closed successfully\n`)
    } catch (error) {
      console.error(`❌ ${user.role} login failed: ${error.message}\n`)
    }
  }

  console.log("✨ Authentication test complete!")
}

// Run the test
testAuthentication().catch(console.error)
