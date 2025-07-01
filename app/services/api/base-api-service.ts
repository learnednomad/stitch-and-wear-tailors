/**
 * Base API Service Class
 *
 * Provides common patterns and utilities for all domain-specific API services.
 * Follows Infinite Red patterns for service architecture.
 */

import { Api, AuthTokenProvider } from "./api"
import { ApiResponse, SearchParams, PaginationParams } from "./api.types"
import { GeneralApiProblem } from "./apiProblem"
import { RetryConfig } from "./interceptors"

/**
 * Result type for API service operations
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; problem: GeneralApiProblem; message?: string }

/**
 * Configuration for API service instances
 */
export interface ServiceConfig {
  api: Api
  authProvider?: AuthTokenProvider
  baseEndpoint: string
  defaultRetryConfig?: RetryConfig
}

/**
 * Base class for all API services
 *
 * Provides common functionality:
 * - Standardized error handling
 * - Request/response processing
 * - Authentication integration
 * - Retry logic configuration
 * - Common CRUD patterns
 */
export abstract class BaseApiService {
  protected api: Api
  protected authProvider?: AuthTokenProvider
  protected baseEndpoint: string
  protected defaultRetryConfig?: RetryConfig

  constructor(config: ServiceConfig) {
    this.api = config.api
    this.authProvider = config.authProvider
    this.baseEndpoint = config.baseEndpoint
    this.defaultRetryConfig = config.defaultRetryConfig
  }

  /**
   * Builds the full endpoint URL by combining base endpoint with path
   */
  protected buildEndpoint(path: string = ""): string {
    const cleanBase = this.baseEndpoint.replace(/\/$/, "")
    const cleanPath = path.replace(/^\//, "")
    return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase
  }

  /**
   * Processes API response and returns standardized service result
   */
  protected processResponse<T>(
    response: { success: boolean; data?: T; problem?: GeneralApiProblem },
    errorMessage?: string,
  ): ServiceResult<T> {
    if (response.success && response.data !== undefined) {
      return { success: true, data: response.data }
    }

    return {
      success: false,
      problem: response.problem || { kind: "unknown", temporary: true },
      message: errorMessage,
    }
  }

  /**
   * Standard GET operation with optional retry configuration
   */
  protected async get<T>(
    path: string = "",
    params?: any,
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    try {
      const endpoint = this.buildEndpoint(path)
      const response = await this.api.get<T>(
        endpoint,
        params,
        retryConfig || this.defaultRetryConfig,
      )
      return this.processResponse(response)
    } catch (error) {
      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  /**
   * Standard POST operation with optional retry configuration
   */
  protected async post<T>(
    path: string = "",
    data?: any,
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    try {
      const endpoint = this.buildEndpoint(path)
      const response = await this.api.post<T>(
        endpoint,
        data,
        retryConfig || this.defaultRetryConfig,
      )
      return this.processResponse(response)
    } catch (error) {
      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  /**
   * Standard PUT operation with optional retry configuration
   */
  protected async put<T>(
    path: string = "",
    data?: any,
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    try {
      const endpoint = this.buildEndpoint(path)
      const response = await this.api.put<T>(endpoint, data, retryConfig || this.defaultRetryConfig)
      return this.processResponse(response)
    } catch (error) {
      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  /**
   * Standard PATCH operation with optional retry configuration
   */
  protected async patch<T>(
    path: string = "",
    data?: any,
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    try {
      const endpoint = this.buildEndpoint(path)
      const response = await this.api.patch<T>(
        endpoint,
        data,
        retryConfig || this.defaultRetryConfig,
      )
      return this.processResponse(response)
    } catch (error) {
      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  /**
   * Standard DELETE operation with optional retry configuration
   */
  protected async delete<T>(
    path: string = "",
    params?: any,
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    try {
      const endpoint = this.buildEndpoint(path)
      const response = await this.api.delete<T>(
        endpoint,
        params,
        retryConfig || this.defaultRetryConfig,
      )
      return this.processResponse(response)
    } catch (error) {
      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  /**
   * Standard paginated list operation
   */
  protected async getList<T>(
    path: string = "",
    params?: SearchParams,
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<ApiResponse<T[]>>> {
    return this.get<ApiResponse<T[]>>(path, params, retryConfig)
  }

  /**
   * Standard get by ID operation
   */
  protected async getById<T>(
    id: string,
    path: string = "",
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    const endpoint = path ? `${path}/${id}` : id
    return this.get<T>(endpoint, undefined, retryConfig)
  }

  /**
   * Standard create operation
   */
  protected async create<T, U = any>(
    data: U,
    path: string = "",
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    return this.post<T>(path, data, retryConfig)
  }

  /**
   * Standard update operation using PUT
   */
  protected async update<T, U = any>(
    id: string,
    data: U,
    path: string = "",
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    const endpoint = path ? `${path}/${id}` : id
    return this.put<T>(endpoint, data, retryConfig)
  }

  /**
   * Standard partial update operation using PATCH
   */
  protected async partialUpdate<T, U = any>(
    id: string,
    data: Partial<U>,
    path: string = "",
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    const endpoint = path ? `${path}/${id}` : id
    return this.patch<T>(endpoint, data, retryConfig)
  }

  /**
   * Standard delete by ID operation
   */
  protected async deleteById<T = any>(
    id: string,
    path: string = "",
    retryConfig?: RetryConfig,
  ): Promise<ServiceResult<T>> {
    const endpoint = path ? `${path}/${id}` : id
    return this.delete<T>(endpoint, undefined, retryConfig)
  }

  /**
   * Utility method to check if authentication is available
   */
  protected isAuthenticated(): boolean {
    return !!this.authProvider?.getAccessToken()
  }

  /**
   * Utility method to require authentication for operations
   */
  protected requireAuthentication(): ServiceResult<never> | null {
    if (!this.isAuthenticated()) {
      return {
        success: false,
        problem: { kind: "unauthorized" },
        message: "Authentication required for this operation",
      }
    }
    return null
  }
}
