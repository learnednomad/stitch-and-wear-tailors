/**
 * Authentication Token Provider
 *
 * Provides authentication tokens for API requests and handles token lifecycle.
 * Integrates with MST AuthStore for token management.
 */

import { AuthTokenProvider } from "./interceptors"
import { AuthApiService } from "./auth-api"

/**
 * Token storage interface for different storage implementations
 */
export interface TokenStorage {
  getAccessToken(): string | null
  getRefreshToken(): string | null
  setTokens(accessToken: string, refreshToken: string): void
  clearTokens(): void
  isTokenExpired(token: string): boolean
}

/**
 * Memory-based token storage (default implementation)
 */
export class MemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null
  private refreshToken: string | null = null

  getAccessToken(): string | null {
    return this.accessToken
  }

  getRefreshToken(): string | null {
    return this.refreshToken
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  clearTokens(): void {
    this.accessToken = null
    this.refreshToken = null
  }

  isTokenExpired(token: string): boolean {
    try {
      // Basic JWT expiration check (assumes JWT format)
      const payload = JSON.parse(atob(token.split(".")[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      return payload.exp < currentTime
    } catch {
      // If we can't parse the token, assume it's expired
      return true
    }
  }
}

/**
 * MMKV-based token storage for React Native
 * (Requires react-native-mmkv to be properly configured)
 */
export class MMKVTokenStorage implements TokenStorage {
  private storage: any // MMKV instance

  constructor(storage: any) {
    this.storage = storage
  }

  getAccessToken(): string | null {
    return this.storage.getString("auth.accessToken") || null
  }

  getRefreshToken(): string | null {
    return this.storage.getString("auth.refreshToken") || null
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.storage.set("auth.accessToken", accessToken)
    this.storage.set("auth.refreshToken", refreshToken)
  }

  clearTokens(): void {
    this.storage.delete("auth.accessToken")
    this.storage.delete("auth.refreshToken")
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      return payload.exp < currentTime
    } catch {
      return true
    }
  }
}

/**
 * Configuration for the auth token provider
 */
export interface AuthTokenProviderConfig {
  storage: TokenStorage
  authService?: AuthApiService
  onTokenRefreshed?: (accessToken: string, refreshToken: string) => void
  onTokenExpired?: () => void
  onRefreshFailed?: (error: any) => void
}

/**
 * Authentication Token Provider Implementation
 *
 * Handles token management, automatic refresh, and integration with storage.
 * Implements the AuthTokenProvider interface required by API interceptors.
 */
export class AuthTokenProviderImpl implements AuthTokenProvider {
  private storage: TokenStorage
  private authService?: AuthApiService
  private onTokenRefreshedCallback?: (accessToken: string, refreshToken: string) => void
  private onTokenExpiredCallback?: () => void
  private onRefreshFailedCallback?: (error: any) => void
  private refreshPromise: Promise<void> | null = null

  constructor(config: AuthTokenProviderConfig) {
    this.storage = config.storage
    this.authService = config.authService
    this.onTokenRefreshedCallback = config.onTokenRefreshed
    this.onTokenExpiredCallback = config.onTokenExpired
    this.onRefreshFailedCallback = config.onRefreshFailed
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    const token = this.storage.getAccessToken()

    // Check if token is expired
    if (token && this.storage.isTokenExpired(token)) {
      // Token is expired, trigger refresh but return null for now
      this.onTokenExpiredCallback?.()
      return null
    }

    return token
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return this.storage.getRefreshToken()
  }

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.storage.setTokens(accessToken, refreshToken)
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.storage.clearTokens()
  }

  /**
   * Implement the AuthTokenProvider interface method
   */
  async onTokenExpired(): Promise<void> {
    return this.handleTokenExpiration()
  }

  /**
   * Handle token expiration - attempt to refresh tokens
   */
  async handleTokenExpiration(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.performTokenRefresh()

    try {
      await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Perform actual token refresh
   */
  private async performTokenRefresh(): Promise<void> {
    const refreshToken = this.getRefreshToken()

    if (!refreshToken || !this.authService) {
      console.warn("No refresh token or auth service available for token refresh")
      this.onTokenExpiredCallback?.()
      return
    }

    try {
      const result = await this.authService.refreshToken()

      if (result.success) {
        // Update stored tokens
        this.setTokens(result.data.accessToken, result.data.refreshToken)

        // Notify listeners
        this.onTokenRefreshedCallback?.(result.data.accessToken, result.data.refreshToken)

        console.log("✅ Token refresh successful")
      } else {
        console.error("❌ Token refresh failed:", result.problem)

        // Clear invalid tokens
        this.clearTokens()

        // Notify failure handlers
        this.onRefreshFailedCallback?.(result.problem)
        this.onTokenExpiredCallback?.()
      }
    } catch (error) {
      console.error("💥 Token refresh error:", error)

      // Clear tokens on error
      this.clearTokens()

      // Notify failure handlers
      this.onRefreshFailedCallback?.(error)
      this.onTokenExpiredCallback?.()
    }
  }

  /**
   * Update the auth service instance
   */
  setAuthService(authService: AuthApiService): void {
    this.authService = authService
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken()
    return !!accessToken && !this.storage.isTokenExpired(accessToken)
  }

  /**
   * Get token status information
   */
  getTokenStatus() {
    const accessToken = this.storage.getAccessToken()
    const refreshToken = this.storage.getRefreshToken()

    return {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      isAccessTokenExpired: accessToken ? this.storage.isTokenExpired(accessToken) : false,
      isRefreshTokenExpired: refreshToken ? this.storage.isTokenExpired(refreshToken) : false,
      isAuthenticated: this.isAuthenticated(),
    }
  }
}

/**
 * Factory function to create auth token provider with default memory storage
 */
export function createAuthTokenProvider(
  config?: Partial<AuthTokenProviderConfig>,
): AuthTokenProviderImpl {
  return new AuthTokenProviderImpl({
    storage: new MemoryTokenStorage(),
    ...config,
  })
}

/**
 * Factory function to create auth token provider with MMKV storage
 */
export function createMMKVAuthTokenProvider(
  mmkvInstance: any,
  config?: Omit<AuthTokenProviderConfig, "storage">,
): AuthTokenProviderImpl {
  return new AuthTokenProviderImpl({
    storage: new MMKVTokenStorage(mmkvInstance),
    ...config,
  })
}
