/**
 * AuthStore Connector
 *
 * Provides integration between AuthAPI services and MST AuthStore.
 * This connector bridges the service layer with the state management layer.
 */

import { AuthIntegration, AuthStoreIntegration } from "./auth-integration"
import { LoginRequest, RegisterRequest } from "./api.types"

/**
 * Generic AuthStore interface for any store implementation
 */
interface GenericAuthStore {
  setUser(user: any): void
  setSession(session: any): void
  logout(): void
  setLoading(loading: boolean): void
  setError(error: string | null): void
  isAuthenticated: boolean
  user: any
  session: any
  isLoading: boolean
  error: string | null
}

/**
 * AuthStore connector implementation
 *
 * Implements AuthStoreIntegration interface to connect with any AuthStore
 */
export class AuthStoreConnector implements AuthStoreIntegration {
  private authStore: GenericAuthStore

  constructor(authStore: GenericAuthStore) {
    this.authStore = authStore
  }

  /**
   * Set authenticated user data
   */
  setUser(user: any): void {
    this.authStore.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        avatar: user.profile.avatar || "",
        phone: user.profile.phone || "",
        dateOfBirth: user.profile.dateOfBirth || "",
        gender: user.profile.gender || "prefer_not_to_say",
        bio: user.profile.bio || "",
      },
      emailVerified: user.emailVerified,
      preferences: user.preferences || {
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        language: "en",
        timezone: "UTC",
        currency: "USD",
        theme: "light",
        measurementUnit: "metric",
      },
    })
  }

  /**
   * Set session data
   */
  setSession(session: any): void {
    this.authStore.setSession({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    })
  }

  /**
   * Clear authentication state
   */
  clearAuth(): void {
    this.authStore.logout()
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.authStore.setLoading(loading)
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    this.authStore.setError(error)
  }
}

/**
 * Enhanced AuthStore with service integration
 *
 * Provides high-level authentication methods that use the AuthIntegration
 */
export class AuthStoreServiceConnector {
  private authStore: GenericAuthStore
  private authIntegration: AuthIntegration
  private connector: AuthStoreConnector

  constructor(authStore: GenericAuthStore, authIntegration: AuthIntegration) {
    this.authStore = authStore
    this.authIntegration = authIntegration
    this.connector = new AuthStoreConnector(authStore)

    // Connect the auth integration with the store
    this.authIntegration.setAuthStore(this.connector)
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string, rememberMe = false) {
    const credentials: LoginRequest = {
      email,
      password,
      rememberMe,
    }

    const result = await this.authIntegration.login(credentials)

    if (result.success) {
      // Additional store-specific actions can be performed here
      console.log("🔐 User logged in:", result.data.user.email)
    }

    return result
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    role: "client" | "tailor",
    profile: {
      firstName: string
      lastName: string
      phone?: string
    },
  ) {
    const userData: RegisterRequest = {
      email,
      password,
      role,
      profile,
    }

    const result = await this.authIntegration.register(userData)

    if (result.success) {
      console.log("📝 User registered:", result.data.user.email)
    }

    return result
  }

  /**
   * Logout current user
   */
  async logout() {
    const result = await this.authIntegration.logout()
    console.log("👋 User logged out")
    return result
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string) {
    return this.authIntegration.changePassword(currentPassword, newPassword)
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    return this.authIntegration.requestPasswordReset(email)
  }

  /**
   * Restore session from stored tokens
   */
  async restoreSession() {
    return this.authIntegration.restoreSession()
  }

  /**
   * Refresh current session
   */
  async refreshSession() {
    return this.authIntegration.refreshCurrentSession()
  }

  /**
   * Get authentication status
   */
  getAuthStatus() {
    return {
      ...this.authIntegration.getAuthStatus(),
      storeState: {
        isAuthenticated: this.authStore.isAuthenticated,
        user: this.authStore.user,
        session: this.authStore.session,
        isLoading: this.authStore.isLoading,
        error: this.authStore.error,
      },
    }
  }

  /**
   * Quick access to store properties
   */
  get isAuthenticated() {
    return this.authStore.isAuthenticated
  }

  get user() {
    return this.authStore.user
  }

  get session() {
    return this.authStore.session
  }

  get isLoading() {
    return this.authStore.isLoading
  }

  get error() {
    return this.authStore.error
  }
}

/**
 * Factory function to create auth store service connector
 */
export function createAuthStoreServiceConnector(
  authStore: GenericAuthStore,
  authIntegration: AuthIntegration,
): AuthStoreServiceConnector {
  return new AuthStoreServiceConnector(authStore, authIntegration)
}
