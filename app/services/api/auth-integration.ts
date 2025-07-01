/**
 * Authentication Integration Layer
 *
 * Provides integration between the AuthAPI service and MST AuthStore.
 * Handles token management, session persistence, and state synchronization.
 */

import { AuthApiService } from "./auth-api"
import { AuthTokenProviderImpl, createAuthTokenProvider } from "./auth-token-provider"
import { ServiceResult } from "./base-api-service"
import { LoginRequest, LoginResponse, RegisterRequest } from "./api.types"

/**
 * AuthStore integration interface (will be connected to actual AuthStore)
 */
export interface AuthStoreIntegration {
  setUser(user: any): void
  setSession(session: any): void
  clearAuth(): void
  setLoading(loading: boolean): void
  setError(error: string | null): void
}

/**
 * Authentication Integration Configuration
 */
export interface AuthIntegrationConfig {
  authService: AuthApiService
  tokenProvider: AuthTokenProviderImpl
  authStore?: AuthStoreIntegration
  enableAutoLogin?: boolean
  sessionTimeout?: number
}

/**
 * Authentication Integration Class
 *
 * Provides high-level authentication operations that integrate
 * API service calls with state management and token handling.
 */
export class AuthIntegration {
  private authService: AuthApiService
  private tokenProvider: AuthTokenProviderImpl
  private authStore?: AuthStoreIntegration
  private enableAutoLogin: boolean
  private sessionTimeout: number

  constructor(config: AuthIntegrationConfig) {
    this.authService = config.authService
    this.tokenProvider = config.tokenProvider
    this.authStore = config.authStore
    this.enableAutoLogin = config.enableAutoLogin ?? true
    this.sessionTimeout = config.sessionTimeout ?? 24 * 60 * 60 * 1000 // 24 hours

    // Set up token provider callbacks
    this.setupTokenProviderCallbacks()
  }

  /**
   * Configure token provider callbacks for store integration
   */
  private setupTokenProviderCallbacks(): void {
    // Update auth service reference in token provider
    this.tokenProvider.setAuthService(this.authService)

    // Token provider callbacks are handled internally
    // Setup is minimal since token provider manages its own callbacks
  }

  /**
   * Perform user login with credentials
   */
  async login(credentials: LoginRequest): Promise<ServiceResult<LoginResponse>> {
    this.authStore?.setLoading(true)
    this.authStore?.setError(null)

    try {
      const result = await this.authService.login(credentials)

      if (result.success) {
        // Store tokens
        this.tokenProvider.setTokens(
          result.data.session.accessToken,
          result.data.session.refreshToken,
        )

        // Update auth store
        this.authStore?.setUser(result.data.user)
        this.authStore?.setSession(result.data.session)

        console.log("✅ Login successful for user:", result.data.user.email)
        return result
      } else {
        // Handle login failure
        this.authStore?.setError(result.message || "Login failed")
        console.error("❌ Login failed:", result.problem)
        return result
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed"
      this.authStore?.setError(errorMessage)
      console.error("💥 Login error:", error)

      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: errorMessage,
      }
    } finally {
      this.authStore?.setLoading(false)
    }
  }

  /**
   * Perform user registration
   */
  async register(userData: RegisterRequest): Promise<ServiceResult<LoginResponse>> {
    this.authStore?.setLoading(true)
    this.authStore?.setError(null)

    try {
      const result = await this.authService.register(userData)

      if (result.success) {
        // Store tokens
        this.tokenProvider.setTokens(
          result.data.session.accessToken,
          result.data.session.refreshToken,
        )

        // Update auth store
        this.authStore?.setUser(result.data.user)
        this.authStore?.setSession(result.data.session)

        console.log("✅ Registration successful for user:", result.data.user.email)
        return result
      } else {
        // Handle registration failure
        this.authStore?.setError(result.message || "Registration failed")
        console.error("❌ Registration failed:", result.problem)
        return result
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Registration failed"
      this.authStore?.setError(errorMessage)
      console.error("💥 Registration error:", error)

      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: errorMessage,
      }
    } finally {
      this.authStore?.setLoading(false)
    }
  }

  /**
   * Perform user logout
   */
  async logout(): Promise<ServiceResult<void>> {
    this.authStore?.setLoading(true)

    try {
      // Call API logout endpoint
      const result = await this.authService.logout()

      // Always clear local state regardless of API response
      this.handleLogout()

      if (result.success) {
        console.log("✅ Logout successful")
      } else {
        console.warn("⚠️ API logout failed, but local state cleared:", result.problem)
      }

      return { success: true, data: undefined }
    } catch (error) {
      // Clear local state even if API call fails
      this.handleLogout()
      console.error("💥 Logout error:", error)

      // Return success since local logout always succeeds
      return { success: true, data: undefined }
    } finally {
      this.authStore?.setLoading(false)
    }
  }

  /**
   * Handle logout cleanup (tokens and state)
   */
  private handleLogout(): void {
    // Clear tokens
    this.tokenProvider.clearTokens()

    // Clear auth store
    this.authStore?.clearAuth()

    console.log("🔓 Auth state cleared")
  }

  /**
   * Attempt to restore session from stored tokens
   */
  async restoreSession(): Promise<ServiceResult<LoginResponse | null>> {
    if (!this.enableAutoLogin) {
      return { success: true, data: null }
    }

    const tokenStatus = this.tokenProvider.getTokenStatus()

    if (!tokenStatus.hasAccessToken || !tokenStatus.hasRefreshToken) {
      console.log("📱 No stored tokens found")
      return { success: true, data: null }
    }

    if (tokenStatus.isAccessTokenExpired && tokenStatus.isRefreshTokenExpired) {
      console.log("🔓 All tokens expired, clearing auth state")
      this.handleLogout()
      return { success: true, data: null }
    }

    this.authStore?.setLoading(true)

    try {
      // Try to get current session
      const result = await this.authService.getCurrentSession()

      if (result.success) {
        // Update auth store with restored session
        this.authStore?.setUser(result.data.user)
        this.authStore?.setSession(result.data.session)

        console.log("✅ Session restored for user:", result.data.user.email)
        return result
      } else {
        // Session restore failed, clear tokens
        console.warn("⚠️ Session restore failed:", result.problem)
        this.handleLogout()
        return { success: true, data: null }
      }
    } catch (error) {
      console.error("💥 Session restore error:", error)
      this.handleLogout()
      return { success: true, data: null }
    } finally {
      this.authStore?.setLoading(false)
    }
  }

  /**
   * Refresh current session data
   */
  async refreshCurrentSession(): Promise<ServiceResult<LoginResponse | null>> {
    if (!this.tokenProvider.isAuthenticated()) {
      return { success: true, data: null }
    }

    try {
      const result = await this.authService.getCurrentSession()

      if (result.success) {
        // Update auth store with fresh session data
        this.authStore?.setUser(result.data.user)
        this.authStore?.setSession(result.data.session)

        console.log("🔄 Session refreshed")
        return result
      } else {
        console.warn("⚠️ Session refresh failed:", result.problem)
        return result
      }
    } catch (error) {
      console.error("💥 Session refresh error:", error)
      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: error instanceof Error ? error.message : "Session refresh failed",
      }
    }
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ServiceResult<void>> {
    this.authStore?.setLoading(true)
    this.authStore?.setError(null)

    try {
      const result = await this.authService.changePassword(currentPassword, newPassword)

      if (result.success) {
        console.log("✅ Password changed successfully")
      } else {
        this.authStore?.setError(result.message || "Password change failed")
        console.error("❌ Password change failed:", result.problem)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Password change failed"
      this.authStore?.setError(errorMessage)
      console.error("💥 Password change error:", error)

      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: errorMessage,
      }
    } finally {
      this.authStore?.setLoading(false)
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ServiceResult<void>> {
    this.authStore?.setLoading(true)
    this.authStore?.setError(null)

    try {
      const result = await this.authService.forgotPassword(email)

      if (result.success) {
        console.log("✅ Password reset email sent to:", email)
      } else {
        this.authStore?.setError(result.message || "Password reset request failed")
        console.error("❌ Password reset request failed:", result.problem)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Password reset request failed"
      this.authStore?.setError(errorMessage)
      console.error("💥 Password reset request error:", error)

      return {
        success: false,
        problem: { kind: "unknown", temporary: true },
        message: errorMessage,
      }
    } finally {
      this.authStore?.setLoading(false)
    }
  }

  /**
   * Get current authentication status
   */
  getAuthStatus() {
    const tokenStatus = this.tokenProvider.getTokenStatus()

    return {
      isAuthenticated: this.tokenProvider.isAuthenticated(),
      tokenStatus,
      authService: this.authService.getStatus(),
    }
  }

  /**
   * Update auth store integration
   */
  setAuthStore(authStore: AuthStoreIntegration): void {
    this.authStore = authStore
  }
}

/**
 * Factory function to create auth integration
 */
export function createAuthIntegration(
  authService: AuthApiService,
  config?: Partial<AuthIntegrationConfig>,
): AuthIntegration {
  const tokenProvider = createAuthTokenProvider()

  return new AuthIntegration({
    authService,
    tokenProvider,
    ...config,
  })
}
