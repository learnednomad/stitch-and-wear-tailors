#!/usr/bin/env node

/**
 * Clear Auth Cache
 * Utility to clear any corrupted auth data in storage
 */

const { MMKV } = require("react-native-mmkv")

console.log("🧹 Clearing Authentication Cache\n")

try {
  const storage = new MMKV()

  // Clear auth-related keys
  const authKeys = ["auth.user", "auth.session", "auth.rememberUser", "auth.tokens", "auth.profile"]

  console.log("Removing auth keys:")
  authKeys.forEach((key) => {
    if (storage.contains(key)) {
      storage.delete(key)
      console.log(`  ✅ Deleted: ${key}`)
    } else {
      console.log(`  ⏭️ Not found: ${key}`)
    }
  })

  console.log("\n✅ Auth cache cleared successfully!")
  console.log("The app should now start fresh.")
} catch (error) {
  console.error("❌ Error clearing cache:", error.message)
  console.log("\nNote: This script should be run in the React Native environment.")
  console.log("You can also clear the app data from the iOS simulator:")
  console.log("  Device > Erase All Content and Settings...")
}
