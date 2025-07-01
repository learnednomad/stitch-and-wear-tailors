/**
 * These are configuration settings for the dev environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
export default {
  API_URL: "https://api.rss2json.com/v1/",
  APPWRITE_ENDPOINT: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
  APPWRITE_PROJECT_ID: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "",
  APPWRITE_DATABASE_ID: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "stitch-and-wear-db",
  APPWRITE_STORAGE_ID: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID || "stitch-and-wear-storage",
  APPWRITE_API_KEY: process.env.EXPO_PUBLIC_APPWRITE_API_KEY || "",
}
