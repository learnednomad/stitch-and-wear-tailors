/**
 * Service Architecture Usage Example
 *
 * This file demonstrates how to use the new service architecture
 * for implementing domain-specific API services.
 */

import { BaseApiService, ServiceConfig, ServiceResult } from "./base-api-service"
import { ServiceFactory, createServiceRegistration, ServiceNames } from "./service-factory"
import { createServiceRegistry, ServiceRegistry } from "./service-registry"
import { IAuthApiService } from "./service-types"
import { LoginRequest, LoginResponse } from "./api.types"
import { api } from "./api"

/**
 * Example: AuthAPI Service Implementation
 *
 * This shows how to implement a domain-specific service by extending BaseApiService
 */
export class ExampleAuthApiService extends BaseApiService implements IAuthApiService {
  async ping(): Promise<ServiceResult<boolean>> {
    return this.get<boolean>("/ping")
  }

  getStatus() {
    return {
      serviceName: "auth",
      baseEndpoint: this.baseEndpoint,
      isAuthenticated: this.isAuthenticated(),
      isConfigured: !!this.api,
    }
  }

  async login(credentials: LoginRequest): Promise<ServiceResult<LoginResponse>> {
    return this.post<LoginResponse>("/login", credentials)
  }

  async register(userData: any): Promise<ServiceResult<LoginResponse>> {
    return this.post<LoginResponse>("/register", userData)
  }

  async logout(): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.post<void>("/logout")
  }

  async refreshToken(): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
    return this.post<{ accessToken: string; refreshToken: string }>("/refresh")
  }

  async verifyToken(token: string): Promise<ServiceResult<boolean>> {
    return this.post<boolean>("/verify", { token })
  }

  async forgotPassword(email: string): Promise<ServiceResult<void>> {
    return this.post<void>("/forgot-password", { email })
  }

  async resetPassword(token: string, newPassword: string): Promise<ServiceResult<void>> {
    return this.post<void>("/reset-password", { token, newPassword })
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.post<void>("/change-password", { currentPassword, newPassword })
  }

  async getCurrentSession(): Promise<ServiceResult<LoginResponse>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<LoginResponse>("/session")
  }

  async revokeAllSessions(): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.post<void>("/revoke-sessions")
  }

  async sendVerificationEmail(): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.post<void>("/send-verification")
  }

  async verifyEmail(token: string): Promise<ServiceResult<void>> {
    return this.post<void>("/verify-email", { token })
  }
}

/**
 * Example: Service Registry Setup
 *
 * This shows how to set up and use the service registry
 */
export function setupExampleServiceRegistry(): ServiceRegistry {
  // Create service registry with API instance
  const registry = createServiceRegistry({
    api,
    enableMockServices: __DEV__, // Enable mocks in development
  })

  // Note: In production, services would be registered automatically
  // This is just an example of manual registration
  const authServiceRegistration = createServiceRegistration(
    ServiceNames.AUTH,
    ExampleAuthApiService,
    "/auth",
    { singleton: true },
  )

  // Register the service with the factory
  registry["factory"].register(authServiceRegistration)

  return registry
}

/**
 * Example: Using Services in the Application
 *
 * This shows how components and stores would use the service registry
 */
export async function exampleServiceUsage() {
  // Get the service registry
  const registry = setupExampleServiceRegistry()

  // Use authentication service
  const authService = registry.auth

  // Perform login
  const loginResult = await authService.login({
    email: "user@example.com",
    password: "password123",
    rememberMe: true,
  })

  if (loginResult.success) {
    console.log("Login successful:", loginResult.data)

    // Get current session
    const sessionResult = await authService.getCurrentSession()
    if (sessionResult.success) {
      console.log("Current session:", sessionResult.data)
    }
  } else {
    console.error("Login failed:", loginResult.problem)
  }

  // Test service connectivity
  const connectivity = await registry.testConnectivity()
  console.log("Service connectivity:", connectivity)
}

/**
 * Example: Integration with MST Store
 *
 * This shows how services integrate with MobX-State-Tree stores
 */
export class ExampleStoreServiceIntegration {
  private registry: ServiceRegistry

  constructor(registry: ServiceRegistry) {
    this.registry = registry
  }

  async loginUser(email: string, password: string) {
    // Set loading state
    // this.setLoading(true)

    try {
      const result = await this.registry.auth.login({ email, password })

      if (result.success) {
        // Update store with user data
        // this.setUser(result.data.user)
        // this.setSession(result.data.session)
        console.log("Login successful, updating store...")
      } else {
        // Handle error
        // this.setError(result.message || "Login failed")
        console.error("Login failed:", result.problem)
      }
    } catch (error) {
      // Handle unexpected errors
      // this.setError("An unexpected error occurred")
      console.error("Unexpected error:", error)
    } finally {
      // Clear loading state
      // this.setLoading(false)
    }
  }
}

/**
 * Export the example service for testing
 */
export { ExampleAuthApiService as AuthApiService }
