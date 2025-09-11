/**
 * Appwrite Service Configuration
 * Central configuration and client setup for Appwrite backend
 */

import { Client, Databases, Account, Storage, Functions, Realtime } from "appwrite"
import Config from "../config"

// Initialize Appwrite client
export const appwriteClient = new Client()
  .setEndpoint(Config.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(Config.APPWRITE_PROJECT_ID || "")

// Export Appwrite services
export const appwriteDatabases = new Databases(appwriteClient)
export const appwriteAccount = new Account(appwriteClient)
export const appwriteStorage = new Storage(appwriteClient)
export const appwriteFunctions = new Functions(appwriteClient)
export const appwriteRealtime = new Realtime(appwriteClient)

// Database and collection IDs
export const DATABASE_ID = Config.APPWRITE_DATABASE_ID || "stitch_and_wear_db"

export const COLLECTIONS = {
  // Authentication collections
  USERS: "users",
  SESSIONS: "sessions",
  VERIFICATION_TOKENS: "verification_tokens",
  PASSWORD_RESET_TOKENS: "password_reset_tokens",
  EMAIL_VERIFICATION_LOGS: "email_verification_logs",
  PASSWORD_HISTORY: "password_history",
  SECURITY_EVENTS: "security_events",
  AUTH_PROVIDERS: "auth_providers",
  MFA_SETTINGS: "mfa_settings",
  MFA_RECOVERY_CODES: "mfa_recovery_codes",
  TRUSTED_DEVICES: "trusted_devices",
  RATE_LIMITS: "rate_limits",

  // Business collections
  ORDERS: "orders",
  ORDER_ITEMS: "order_items",
  MEASUREMENTS: "measurements",
  MEASUREMENT_PROFILES: "measurement_profiles",
  FABRICS: "fabrics",
  FABRIC_INVENTORY: "fabric_inventory",
  MESSAGES: "messages",
  PAYMENTS: "payments",
  PAYMENT_METHODS: "payment_methods",
  INVOICES: "invoices",
  APPOINTMENTS: "appointments",
  REVIEWS: "reviews",
  NOTIFICATIONS: "notifications",
  ANALYTICS_EVENTS: "analytics_events",
} as const

// Storage bucket IDs
export const BUCKETS = {
  ORDER_ATTACHMENTS: "order_attachments",
  FABRIC_IMAGES: "fabric_images",
  MEASUREMENT_PHOTOS: "measurement_photos",
  PROFILE_IMAGES: "profile_images",
  DESIGN_REFERENCES: "design_references",
} as const

// Function IDs for serverless functions
export const FUNCTIONS = {
  SEND_EMAIL: "send_email",
  SEND_SMS: "send_sms",
  PROCESS_PAYMENT: "process_payment",
  GENERATE_INVOICE: "generate_invoice",
  CALCULATE_PRICING: "calculate_pricing",
  NOTIFY_STATUS_CHANGE: "notify_status_change",
} as const

/**
 * Set JWT token for authenticated requests
 */
export function setAuthToken(jwt: string) {
  appwriteClient.setJWT(jwt)
}

/**
 * Clear authentication
 */
export function clearAuth() {
  appwriteClient.setJWT("")
}

/**
 * Subscribe to realtime updates
 */
export function subscribeToChannel(channel: string, callback: (response: any) => void): () => void {
  return appwriteClient.subscribe(channel, callback)
}

/**
 * Helper to build collection channel for realtime
 */
export function getCollectionChannel(collectionId: string): string {
  return `databases.${DATABASE_ID}.collections.${collectionId}.documents`
}

/**
 * Helper to build document channel for realtime
 */
export function getDocumentChannel(collectionId: string, documentId: string): string {
  return `databases.${DATABASE_ID}.collections.${collectionId}.documents.${documentId}`
}

/**
 * Error handler for Appwrite errors
 */
export function handleAppwriteError(error: any): string {
  if (error.code === 401) {
    return "Authentication required. Please login."
  }
  if (error.code === 403) {
    return "You do not have permission to perform this action."
  }
  if (error.code === 404) {
    return "The requested resource was not found."
  }
  if (error.code === 409) {
    return "A conflict occurred. The resource may already exist."
  }
  if (error.code === 429) {
    return "Too many requests. Please try again later."
  }
  if (error.code === 500) {
    return "An internal server error occurred. Please try again."
  }

  return error.message || "An unexpected error occurred."
}

export default {
  client: appwriteClient,
  databases: appwriteDatabases,
  account: appwriteAccount,
  storage: appwriteStorage,
  functions: appwriteFunctions,
  realtime: appwriteRealtime,
  setAuthToken,
  clearAuth,
  subscribeToChannel,
  getCollectionChannel,
  getDocumentChannel,
  handleAppwriteError,
}
