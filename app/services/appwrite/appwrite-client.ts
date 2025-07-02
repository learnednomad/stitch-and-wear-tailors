/**
 * Appwrite Client Integration
 *
 * Provides Appwrite-specific client setup and configuration for the
 * Stitch and Wear Tailors application backend integration.
 */

import {
  Client,
  Account,
  Databases,
  Storage,
  Functions,
  Teams,
  Avatars,
} from "react-native-appwrite"

import Config from "../../config"

/**
 * Appwrite client configuration
 */
export interface AppwriteConfig {
  endpoint: string
  projectId: string
  databaseId?: string
  storageId?: string
}

/**
 * Default Appwrite configuration
 */
export const DEFAULT_APPWRITE_CONFIG: AppwriteConfig = {
  endpoint: Config.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
  projectId: Config.APPWRITE_PROJECT_ID || "",
  databaseId: Config.APPWRITE_DATABASE_ID || "stitch-and-wear-db",
  storageId: Config.APPWRITE_STORAGE_ID || "stitch-and-wear-storage",
}

/**
 * Appwrite client wrapper with typed services
 */
export class AppwriteClient {
  private client: Client
  private config: AppwriteConfig

  // Appwrite services
  public account: Account
  public databases: Databases
  public storage: Storage
  public functions: Functions
  public teams: Teams
  public avatars: Avatars

  constructor(config: AppwriteConfig = DEFAULT_APPWRITE_CONFIG) {
    this.config = config

    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId)
      .setPlatform("com.stitchandwear") // Required for React Native

    // Initialize services
    this.account = new Account(this.client)
    this.databases = new Databases(this.client)
    this.storage = new Storage(this.client)
    this.functions = new Functions(this.client)
    this.teams = new Teams(this.client)
    this.avatars = new Avatars(this.client)
  }

  /**
   * Set user session for authenticated requests
   */
  setSession(session: string): void {
    this.client.setSession(session)
  }

  /**
   * Set JWT for server-side authentication
   */
  setJWT(jwt: string): void {
    this.client.setJWT(jwt)
  }

  /**
   * Set API key for server-side operations
   */
  setKey(key: string): void {
    this.client.setKey(key)
  }

  /**
   * Get current configuration
   */
  getConfig(): AppwriteConfig {
    return { ...this.config }
  }

  /**
   * Get database ID
   */
  getDatabaseId(): string {
    return this.config.databaseId || "default"
  }

  /**
   * Get storage bucket ID
   */
  getStorageId(): string {
    return this.config.storageId || "default"
  }

  /**
   * Test connection to Appwrite
   */
  async testConnection(): Promise<{
    success: boolean
    endpoint: string
    projectId: string
    version?: string
    error?: string
  }> {
    try {
      // Try to get account info or health check
      const health = await this.account.get()

      return {
        success: true,
        endpoint: this.config.endpoint,
        projectId: this.config.projectId,
        version: "1.0", // Could be retrieved from health endpoint
      }
    } catch (error) {
      return {
        success: false,
        endpoint: this.config.endpoint,
        projectId: this.config.projectId,
        error: error instanceof Error ? error.message : "Connection failed",
      }
    }
  }

  /**
   * Get client health status
   */
  async getHealthStatus(): Promise<{
    client: boolean
    database: boolean
    storage: boolean
    functions: boolean
  }> {
    const status = {
      client: false,
      database: false,
      storage: false,
      functions: false,
    }

    try {
      // Test client connection
      await this.account.get()
      status.client = true
    } catch {
      // Client test failed
    }

    try {
      // Test database connection
      await this.databases.list()
      status.database = true
    } catch {
      // Database test failed
    }

    try {
      // Test storage connection
      await this.storage.listBuckets()
      status.storage = true
    } catch {
      // Storage test failed
    }

    try {
      // Test functions connection
      await this.functions.list()
      status.functions = true
    } catch {
      // Functions test failed
    }

    return status
  }
}

/**
 * Singleton Appwrite client instance
 */
let appwriteClient: AppwriteClient | null = null

/**
 * Get the global Appwrite client instance
 */
export function getAppwriteClient(config?: AppwriteConfig): AppwriteClient {
  if (!appwriteClient) {
    appwriteClient = new AppwriteClient(config)
  }
  return appwriteClient
}

/**
 * Initialize Appwrite client with custom configuration
 */
export function initializeAppwriteClient(config: AppwriteConfig): AppwriteClient {
  appwriteClient = new AppwriteClient(config)
  return appwriteClient
}

/**
 * Reset the Appwrite client (useful for testing)
 */
export function resetAppwriteClient(): void {
  appwriteClient = null
}

/**
 * Collection IDs for the Stitch and Wear Tailors database
 * These IDs match the schema definitions in database-schema.ts
 */
export const COLLECTION_IDS = {
  USERS: "users",
  ORDERS: "orders",
  ORDER_ITEMS: "order_items",
  FABRICS: "fabrics",
  MEASUREMENTS: "measurements",
  APPOINTMENTS: "appointments",
  NOTIFICATIONS: "notifications",
  REVIEWS: "reviews",
  FAVORITES: "favorites",
  PROGRESS_UPDATES: "progress_updates",
} as const

/**
 * Bucket IDs for file storage
 */
export const BUCKET_IDS = {
  AVATARS: "avatars",
  FABRIC_IMAGES: "fabric_images",
  PROGRESS_PHOTOS: "progress_photos",
  MEASUREMENT_PHOTOS: "measurement_photos",
  DOCUMENTS: "documents",
} as const

/**
 * Function IDs for serverless functions
 */
export const FUNCTION_IDS = {
  SEND_NOTIFICATION: "send_notification",
  PROCESS_PAYMENT: "process_payment",
  GENERATE_INVOICE: "generate_invoice",
  CALCULATE_PRICING: "calculate_pricing",
  SYNC_INVENTORY: "sync_inventory",
} as const

/**
 * Team IDs for role-based access
 */
export const TEAM_IDS = {
  ADMINS: "admins",
  TAILORS: "tailors",
  CLIENTS: "clients",
} as const
