/**
 * Appwrite API Adapter
 * 
 * Bridges the existing API service pattern with Appwrite's SDK,
 * maintaining compatibility with the current service architecture
 * while providing Appwrite-specific functionality.
 */

import { getAppwriteClient, AppwriteClient } from "../appwrite/appwrite-client"
import { ApiResponse } from "apisauce"
import { GeneralApiProblem } from "./apiProblem"

/**
 * Appwrite API response wrapper to match apisauce ApiResponse format
 */
export interface AppwriteApiResponse<T> extends ApiResponse<T> {
  data?: T
  problem?: GeneralApiProblem
}

/**
 * Query options for Appwrite database operations
 */
export interface AppwriteQueryOptions {
  queries?: string[]
  limit?: number
  offset?: number
  orderBy?: string[]
  search?: string
}

/**
 * Appwrite API adapter that provides a unified interface
 * for Appwrite operations while maintaining compatibility
 * with the existing API service pattern.
 */
export class AppwriteApiAdapter {
  private client: AppwriteClient
  private databaseId: string

  constructor(client?: AppwriteClient) {
    this.client = client || getAppwriteClient()
    this.databaseId = this.client.getDatabaseId()
  }

  /**
   * Wrap Appwrite operations in ApiResponse format
   */
  private async wrapResponse<T>(
    operation: () => Promise<T>,
    errorContext?: string
  ): Promise<AppwriteApiResponse<T>> {
    try {
      const data = await operation()
      return {
        ok: true,
        status: 200,
        data,
        problem: null,
        originalError: null,
        config: {},
        duration: 0,
        headers: {},
      } as AppwriteApiResponse<T>
    } catch (error) {
      console.error(`Appwrite API Error ${errorContext}:`, error)
      
      const problem: GeneralApiProblem = this.mapAppwriteError(error)
      
      return {
        ok: false,
        status: problem === "NETWORK_ERROR" ? 0 : 400,
        data: undefined,
        problem,
        originalError: error,
        config: {},
        duration: 0,
        headers: {},
      } as AppwriteApiResponse<T>
    }
  }

  /**
   * Map Appwrite errors to API problems
   */
  private mapAppwriteError(error: any): GeneralApiProblem {
    if (!error) return "UNKNOWN_ERROR"
    
    const message = error.message || error.toString()
    const code = error.code || error.type
    
    // Map common Appwrite errors
    if (code === 401 || message.includes("unauthorized")) return "UNAUTHORIZED"
    if (code === 404 || message.includes("not found")) return "NOT_FOUND"
    if (code === 429 || message.includes("rate limit")) return "TIMEOUT"
    if (message.includes("network") || message.includes("connection")) return "NETWORK_ERROR"
    if (code >= 500) return "SERVER_ERROR"
    if (code >= 400) return "CLIENT_ERROR"
    
    return "UNKNOWN_ERROR"
  }

  /**
   * Set authentication session
   */
  setSession(session: string): void {
    this.client.setSession(session)
  }

  /**
   * Set API key for server operations
   */
  setApiKey(key: string): void {
    this.client.setKey(key)
  }

  // ========================================
  // AUTHENTICATION OPERATIONS
  // ========================================

  /**
   * Create user account
   */
  async createAccount(email: string, password: string, name?: string): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.account.create("unique()", email, password, name),
      "createAccount"
    )
  }

  /**
   * Create email session (login)
   */
  async createSession(email: string, password: string): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.account.createEmailSession(email, password),
      "createSession"
    )
  }

  /**
   * Get current user session
   */
  async getCurrentUser(): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.account.get(),
      "getCurrentUser"
    )
  }

  /**
   * Delete current session (logout)
   */
  async deleteSession(): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.account.deleteSession("current"),
      "deleteSession"
    )
  }

  /**
   * Update user preferences
   */
  async updateUserPrefs(prefs: Record<string, any>): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.account.updatePrefs(prefs),
      "updateUserPrefs"
    )
  }

  /**
   * Create password recovery
   */
  async createPasswordRecovery(email: string, url?: string): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.account.createRecovery(email, url || "https://localhost:3000/reset-password"),
      "createPasswordRecovery"
    )
  }

  /**
   * Complete password recovery
   */
  async updatePasswordRecovery(token: string, password: string): Promise<AppwriteApiResponse<any>> {
    // Note: For Appwrite, we need to parse userId and secret from the token
    // This assumes token contains "userId:secret" format
    const [userId, secret] = token.split(":")
    
    return this.wrapResponse(
      () => this.client.account.updateRecovery(userId, secret, password, password),
      "updatePasswordRecovery"
    )
  }

  /**
   * Update password for authenticated user
   */
  async updatePassword(newPassword: string, oldPassword?: string): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.account.updatePassword(newPassword, oldPassword),
      "updatePassword"
    )
  }

  /**
   * Delete all sessions (logout from all devices)
   */
  async deleteAllSessions(): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.account.deleteSessions(),
      "deleteAllSessions"
    )
  }

  /**
   * Create email verification
   */
  async createEmailVerification(url?: string): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.account.createVerification(url || "https://localhost:3000/verify-email"),
      "createEmailVerification"
    )
  }

  /**
   * Complete email verification
   */
  async updateEmailVerification(token: string): Promise<AppwriteApiResponse<any>> {
    // Note: For Appwrite, we need to parse userId and secret from the token
    // This assumes token contains "userId:secret" format
    const [userId, secret] = token.split(":")
    
    return this.wrapResponse(
      () => this.client.account.updateVerification(userId, secret),
      "updateEmailVerification"
    )
  }

  // ========================================
  // DATABASE OPERATIONS
  // ========================================

  /**
   * Create document in collection
   */
  async createDocument(
    collectionId: string,
    data: Record<string, any>,
    documentId?: string,
    permissions?: string[]
  ): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.databases.createDocument(
        this.databaseId,
        collectionId,
        documentId || "unique()",
        data,
        permissions
      ),
      `createDocument:${collectionId}`
    )
  }

  /**
   * Get document by ID
   */
  async getDocument(collectionId: string, documentId: string): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.databases.getDocument(this.databaseId, collectionId, documentId),
      `getDocument:${collectionId}:${documentId}`
    )
  }

  /**
   * Update document
   */
  async updateDocument(
    collectionId: string,
    documentId: string,
    data: Record<string, any>,
    permissions?: string[]
  ): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.databases.updateDocument(
        this.databaseId,
        collectionId,
        documentId,
        data,
        permissions
      ),
      `updateDocument:${collectionId}:${documentId}`
    )
  }

  /**
   * Delete document
   */
  async deleteDocument(collectionId: string, documentId: string): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.databases.deleteDocument(this.databaseId, collectionId, documentId),
      `deleteDocument:${collectionId}:${documentId}`
    )
  }

  /**
   * List documents with query options
   */
  async listDocuments(
    collectionId: string,
    options: AppwriteQueryOptions = {}
  ): Promise<AppwriteApiResponse<any>> {
    const { queries = [], limit, offset } = options
    
    return this.wrapResponse(
      () => this.client.databases.listDocuments(
        this.databaseId,
        collectionId,
        queries
      ),
      `listDocuments:${collectionId}`
    )
  }

  // ========================================
  // STORAGE OPERATIONS
  // ========================================

  /**
   * Upload file to storage
   */
  async uploadFile(
    bucketId: string,
    file: File,
    fileId?: string,
    permissions?: string[]
  ): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.storage.createFile(
        bucketId,
        fileId || "unique()",
        file,
        permissions
      ),
      `uploadFile:${bucketId}`
    )
  }

  /**
   * Get file preview URL
   */
  getFilePreview(
    bucketId: string,
    fileId: string,
    width?: number,
    height?: number,
    quality?: number
  ): string {
    return this.client.storage.getFilePreview(bucketId, fileId, width, height, undefined, quality)
  }

  /**
   * Get file download URL
   */
  getFileDownload(bucketId: string, fileId: string): string {
    return this.client.storage.getFileDownload(bucketId, fileId)
  }

  /**
   * Delete file
   */
  async deleteFile(bucketId: string, fileId: string): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.storage.deleteFile(bucketId, fileId),
      `deleteFile:${bucketId}:${fileId}`
    )
  }

  // ========================================
  // UTILITY OPERATIONS
  // ========================================

  /**
   * Test connection to Appwrite
   */
  async testConnection(): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.testConnection(),
      "testConnection"
    )
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<AppwriteApiResponse<any>> {
    return this.wrapResponse(
      () => this.client.getHealthStatus(),
      "getHealthStatus"
    )
  }

  /**
   * Get current database ID
   */
  getDatabaseId(): string {
    return this.databaseId
  }

  /**
   * Get current storage bucket ID
   */
  getStorageId(): string {
    return this.client.getStorageId()
  }
}

/**
 * Singleton instance of the Appwrite API adapter
 */
let appwriteApiAdapter: AppwriteApiAdapter | null = null

/**
 * Get the global Appwrite API adapter instance
 */
export function getAppwriteAdapter(): AppwriteApiAdapter {
  if (!appwriteApiAdapter) {
    appwriteApiAdapter = new AppwriteApiAdapter()
  }
  return appwriteApiAdapter
}

/**
 * Initialize Appwrite API adapter with custom client
 */
export function initializeAppwriteAdapter(client: AppwriteClient): AppwriteApiAdapter {
  appwriteApiAdapter = new AppwriteApiAdapter(client)
  return appwriteApiAdapter
}

/**
 * Reset the adapter (useful for testing)
 */
export function resetAppwriteAdapter(): void {
  appwriteApiAdapter = null
}