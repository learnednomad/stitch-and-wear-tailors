/**
 * Appwrite Database Adapter
 *
 * Provides database operations for all business entities using Appwrite's
 * database service, with proper error handling and type safety.
 */

import { Databases, ID, Query, Permission, Role } from "appwrite"
import { AppwriteClient, getAppwriteClient, COLLECTION_IDS } from "./appwrite-client"
import { ServiceResult } from "../api/base-api-service"

/**
 * Database query parameters
 */
export interface DatabaseQueryParams {
  queries?: string[]
  limit?: number
  offset?: number
  cursor?: string
  orderType?: "ASC" | "DESC"
}

/**
 * Database document structure
 */
export interface AppwriteDocument {
  $id: string
  $collection: string
  $database: string
  $permissions: string[]
  $createdAt: string
  $updatedAt: string
  [key: string]: any
}

/**
 * Database list response
 */
export interface DatabaseListResponse<T = AppwriteDocument> {
  total: number
  documents: T[]
}

/**
 * Database adapter for Appwrite
 */
export class AppwriteDatabaseAdapter {
  private client: AppwriteClient
  private databases: Databases

  constructor(client?: AppwriteClient) {
    this.client = client || getAppwriteClient()
    this.databases = this.client.databases
  }

  /**
   * Get database ID
   */
  private getDatabaseId(): string {
    return this.client.getDatabaseId()
  }

  /**
   * Create document
   */
  async createDocument<T = AppwriteDocument>(
    collectionId: string,
    data: Record<string, any>,
    permissions?: string[],
    documentId?: string,
  ): Promise<ServiceResult<T>> {
    try {
      const document = await this.databases.createDocument(
        this.getDatabaseId(),
        collectionId,
        documentId || ID.unique(),
        data,
        permissions,
      )

      return {
        success: true,
        data: document as T,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Failed to create document",
      }
    }
  }

  /**
   * Get document by ID
   */
  async getDocument<T = AppwriteDocument>(
    collectionId: string,
    documentId: string,
  ): Promise<ServiceResult<T>> {
    try {
      const document = await this.databases.getDocument(
        this.getDatabaseId(),
        collectionId,
        documentId,
      )

      return {
        success: true,
        data: document as T,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "not-found" },
        message: error.message || "Document not found",
      }
    }
  }

  /**
   * Update document
   */
  async updateDocument<T = AppwriteDocument>(
    collectionId: string,
    documentId: string,
    data: Record<string, any>,
    permissions?: string[],
  ): Promise<ServiceResult<T>> {
    try {
      const document = await this.databases.updateDocument(
        this.getDatabaseId(),
        collectionId,
        documentId,
        data,
        permissions,
      )

      return {
        success: true,
        data: document as T,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Failed to update document",
      }
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(collectionId: string, documentId: string): Promise<ServiceResult<void>> {
    try {
      await this.databases.deleteDocument(this.getDatabaseId(), collectionId, documentId)

      return {
        success: true,
        data: undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Failed to delete document",
      }
    }
  }

  /**
   * List documents with filtering and pagination
   */
  async listDocuments<T = AppwriteDocument>(
    collectionId: string,
    params?: DatabaseQueryParams,
  ): Promise<ServiceResult<DatabaseListResponse<T>>> {
    try {
      const queries = []

      if (params?.limit) {
        queries.push(Query.limit(params.limit))
      }

      if (params?.offset) {
        queries.push(Query.offset(params.offset))
      }

      if (params?.cursor) {
        queries.push(Query.cursorAfter(params.cursor))
      }

      if (params?.orderType) {
        queries.push(
          params.orderType === "ASC" ? Query.orderAsc("$createdAt") : Query.orderDesc("$createdAt"),
        )
      }

      if (params?.queries) {
        queries.push(...params.queries)
      }

      const response = await this.databases.listDocuments(
        this.getDatabaseId(),
        collectionId,
        queries,
      )

      return {
        success: true,
        data: {
          total: response.total,
          documents: response.documents as T[],
        },
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Failed to list documents",
      }
    }
  }

  /**
   * Search documents by field
   */
  async searchDocuments<T = AppwriteDocument>(
    collectionId: string,
    field: string,
    value: string,
    params?: DatabaseQueryParams,
  ): Promise<ServiceResult<DatabaseListResponse<T>>> {
    try {
      const searchQueries = [Query.search(field, value)]

      const updatedParams = {
        ...params,
        queries: [...(params?.queries || []), ...searchQueries],
      }

      return this.listDocuments<T>(collectionId, updatedParams)
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Search failed",
      }
    }
  }

  /**
   * Filter documents by field value
   */
  async filterDocuments<T = AppwriteDocument>(
    collectionId: string,
    field: string,
    operator:
      | "equal"
      | "notEqual"
      | "lessThan"
      | "lessThanEqual"
      | "greaterThan"
      | "greaterThanEqual"
      | "contains",
    value: any,
    params?: DatabaseQueryParams,
  ): Promise<ServiceResult<DatabaseListResponse<T>>> {
    try {
      let filterQuery

      switch (operator) {
        case "equal":
          filterQuery = Query.equal(field, value)
          break
        case "notEqual":
          filterQuery = Query.notEqual(field, value)
          break
        case "lessThan":
          filterQuery = Query.lessThan(field, value)
          break
        case "lessThanEqual":
          filterQuery = Query.lessThanEqual(field, value)
          break
        case "greaterThan":
          filterQuery = Query.greaterThan(field, value)
          break
        case "greaterThanEqual":
          filterQuery = Query.greaterThanEqual(field, value)
          break
        case "contains":
          filterQuery = Query.search(field, value)
          break
        default:
          filterQuery = Query.equal(field, value)
      }

      const updatedParams = {
        ...params,
        queries: [...(params?.queries || []), filterQuery],
      }

      return this.listDocuments<T>(collectionId, updatedParams)
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Filter failed",
      }
    }
  }

  /**
   * Count documents in collection
   */
  async countDocuments(collectionId: string, queries?: string[]): Promise<ServiceResult<number>> {
    try {
      const response = await this.databases.listDocuments(this.getDatabaseId(), collectionId, [
        ...(queries || []),
        Query.limit(1),
      ])

      return {
        success: true,
        data: response.total,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Count failed",
      }
    }
  }

  /**
   * Batch create documents
   */
  async batchCreateDocuments<T = AppwriteDocument>(
    collectionId: string,
    documents: Array<{
      data: Record<string, any>
      permissions?: string[]
      documentId?: string
    }>,
  ): Promise<ServiceResult<T[]>> {
    try {
      const results = await Promise.allSettled(
        documents.map((doc) =>
          this.createDocument<T>(collectionId, doc.data, doc.permissions, doc.documentId),
        ),
      )

      const successful: T[] = []
      const failed: string[] = []

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          successful.push(result.value.data)
        } else {
          const reason =
            result.status === "rejected" ? result.reason : (result.value as any).message
          failed.push(`Document ${index}: ${reason}`)
        }
      })

      if (failed.length > 0) {
        return {
          success: false,
          problem: { kind: "rejected" },
          message: `Some documents failed: ${failed.join(", ")}`,
        }
      }

      return {
        success: true,
        data: successful,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Batch create failed",
      }
    }
  }

  /**
   * Batch update documents
   */
  async batchUpdateDocuments<T = AppwriteDocument>(
    collectionId: string,
    updates: Array<{
      documentId: string
      data: Record<string, any>
      permissions?: string[]
    }>,
  ): Promise<ServiceResult<T[]>> {
    try {
      const results = await Promise.allSettled(
        updates.map((update) =>
          this.updateDocument<T>(collectionId, update.documentId, update.data, update.permissions),
        ),
      )

      const successful: T[] = []
      const failed: string[] = []

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          successful.push(result.value.data)
        } else {
          const reason =
            result.status === "rejected" ? result.reason : (result.value as any).message
          failed.push(`Document ${updates[index].documentId}: ${reason}`)
        }
      })

      if (failed.length > 0) {
        return {
          success: false,
          problem: { kind: "rejected" },
          message: `Some updates failed: ${failed.join(", ")}`,
        }
      }

      return {
        success: true,
        data: successful,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: error.message || "Batch update failed",
      }
    }
  }

  /**
   * Get collection info
   */
  async getCollection(collectionId: string): Promise<ServiceResult<any>> {
    try {
      const collection = await this.databases.getCollection(this.getDatabaseId(), collectionId)

      return {
        success: true,
        data: collection,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "not-found" },
        message: error.message || "Collection not found",
      }
    }
  }

  /**
   * Create collection permissions for user
   */
  createUserPermissions(userId: string): string[] {
    return [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ]
  }

  /**
   * Create public read permissions
   */
  createPublicReadPermissions(): string[] {
    return [Permission.read(Role.any())]
  }

  /**
   * Create team permissions
   */
  createTeamPermissions(teamId: string): string[] {
    return [
      Permission.read(Role.team(teamId)),
      Permission.create(Role.team(teamId)),
      Permission.update(Role.team(teamId)),
      Permission.delete(Role.team(teamId)),
    ]
  }

  /**
   * Health check for database service
   */
  async testConnection(): Promise<ServiceResult<boolean>> {
    try {
      await this.databases.list()
      return {
        success: true,
        data: true,
      }
    } catch (error: any) {
      return {
        success: false,
        problem: { kind: "network" },
        message: error.message || "Database connection test failed",
      }
    }
  }
}

/**
 * Create singleton database adapter
 */
let appwriteDatabaseAdapter: AppwriteDatabaseAdapter | null = null

export function getAppwriteDatabaseAdapter(): AppwriteDatabaseAdapter {
  if (!appwriteDatabaseAdapter) {
    appwriteDatabaseAdapter = new AppwriteDatabaseAdapter()
  }
  return appwriteDatabaseAdapter
}

export function resetAppwriteDatabaseAdapter(): void {
  appwriteDatabaseAdapter = null
}
