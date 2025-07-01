/**
 * API Service Registry
 *
 * Central registry for all API services. Provides a single point of access
 * for service creation, management, and configuration.
 */

import { Api, AuthTokenProvider } from "./api"
import { ServiceFactory, createServiceFactory, ServiceNames } from "./service-factory"
import { ServiceInterfaces } from "./service-types"
import { RetryConfig, DEFAULT_RETRY_CONFIG } from "./interceptors"

/**
 * Registry configuration options
 */
export interface RegistryConfig {
  api: Api
  authProvider?: AuthTokenProvider
  defaultRetryConfig?: RetryConfig
  enableMockServices?: boolean
}

/**
 * Service Registry - Central hub for all API services
 *
 * Features:
 * - Centralized service management
 * - Lazy service initialization
 * - Type-safe service access
 * - Mock service support
 * - Configuration management
 */
export class ServiceRegistry {
  private factory: ServiceFactory
  private enableMockServices: boolean
  private mockServices: Partial<ServiceInterfaces> = {}

  constructor(config: RegistryConfig) {
    this.factory = createServiceFactory(
      config.api,
      config.authProvider,
      config.defaultRetryConfig || DEFAULT_RETRY_CONFIG,
    )
    this.enableMockServices = config.enableMockServices ?? false

    // Register all services when registry is created
    this.registerAllServices()
  }

  /**
   * Register all domain services with the factory
   */
  private registerAllServices(): void {
    // Import service classes dynamically to avoid circular dependencies
    const { AuthApiService } = require("./auth-api")
    const { UserApiService } = require("./user-api")
    const { OrderApiService } = require("./order-api")
    const { FabricApiService } = require("./fabric-api")
    const { MeasurementApiService } = require("./measurement-api")
    const { AppointmentApiService } = require("./appointment-api")
    const { NotificationApiService } = require("./notification-api")
    const { createServiceRegistration } = require("./service-factory")

    // Register all implemented services
    this.factory.registerMany([
      createServiceRegistration(ServiceNames.AUTH, AuthApiService, "/auth", { singleton: true }),
      createServiceRegistration(ServiceNames.USER, UserApiService, "/users", { singleton: true }),
      createServiceRegistration(ServiceNames.ORDER, OrderApiService, "/orders", {
        singleton: true,
      }),
      createServiceRegistration(ServiceNames.FABRIC, FabricApiService, "/fabrics", {
        singleton: true,
      }),
      createServiceRegistration(ServiceNames.MEASUREMENT, MeasurementApiService, "/measurements", {
        singleton: true,
      }),
      createServiceRegistration(ServiceNames.APPOINTMENT, AppointmentApiService, "/appointments", {
        singleton: true,
      }),
      createServiceRegistration(
        ServiceNames.NOTIFICATION,
        NotificationApiService,
        "/notifications",
        { singleton: true },
      ),
    ])
  }

  /**
   * Get authentication service
   */
  get auth(): ServiceInterfaces["auth"] {
    if (this.enableMockServices && this.mockServices.auth) {
      return this.mockServices.auth
    }
    return this.factory.get(ServiceNames.AUTH) as unknown as unknown as ServiceInterfaces["auth"]
  }

  /**
   * Get user service
   */
  get user(): ServiceInterfaces["user"] {
    if (this.enableMockServices && this.mockServices.user) {
      return this.mockServices.user
    }
    return this.factory.get(ServiceNames.USER) as unknown as ServiceInterfaces["user"]
  }

  /**
   * Get order service
   */
  get order(): ServiceInterfaces["order"] {
    if (this.enableMockServices && this.mockServices.order) {
      return this.mockServices.order
    }
    return this.factory.get(ServiceNames.ORDER) as unknown as ServiceInterfaces["order"]
  }

  /**
   * Get fabric service
   */
  get fabric(): ServiceInterfaces["fabric"] {
    if (this.enableMockServices && this.mockServices.fabric) {
      return this.mockServices.fabric
    }
    return this.factory.get(ServiceNames.FABRIC) as unknown as ServiceInterfaces["fabric"]
  }

  /**
   * Get measurement service
   */
  get measurement(): ServiceInterfaces["measurement"] {
    if (this.enableMockServices && this.mockServices.measurement) {
      return this.mockServices.measurement
    }
    return this.factory.get(ServiceNames.MEASUREMENT) as unknown as ServiceInterfaces["measurement"]
  }

  /**
   * Get appointment service
   */
  get appointment(): ServiceInterfaces["appointment"] {
    if (this.enableMockServices && this.mockServices.appointment) {
      return this.mockServices.appointment
    }
    return this.factory.get(ServiceNames.APPOINTMENT) as unknown as ServiceInterfaces["appointment"]
  }

  /**
   * Get notification service
   */
  get notification(): ServiceInterfaces["notification"] {
    if (this.enableMockServices && this.mockServices.notification) {
      return this.mockServices.notification
    }
    return this.factory.get(
      ServiceNames.NOTIFICATION,
    ) as unknown as ServiceInterfaces["notification"]
  }

  /**
   * Update authentication provider for all services
   */
  setAuthProvider(authProvider: AuthTokenProvider): void {
    this.factory.setAuthProvider(authProvider)
  }

  /**
   * Update API instance for all services
   */
  setApi(api: Api): void {
    this.factory.setApi(api)
  }

  /**
   * Enable or disable mock services
   */
  setMockMode(enabled: boolean): void {
    this.enableMockServices = enabled
  }

  /**
   * Register mock service implementations
   */
  registerMockServices(mockServices: Partial<ServiceInterfaces>): void {
    this.mockServices = { ...this.mockServices, ...mockServices }
  }

  /**
   * Clear all mock services
   */
  clearMockServices(): void {
    this.mockServices = {}
  }

  /**
   * Clear all cached service instances
   */
  clearCache(): void {
    this.factory.clearInstances()
  }

  /**
   * Get registry status and configuration
   */
  getStatus() {
    return {
      ...this.factory.getConfig(),
      enableMockServices: this.enableMockServices,
      mockServicesRegistered: Object.keys(this.mockServices),
    }
  }

  /**
   * Test connectivity for all services
   */
  async testConnectivity(): Promise<{
    auth: boolean
    user: boolean
    order: boolean
    fabric: boolean
    measurement: boolean
    appointment: boolean
    notification: boolean
  }> {
    const results = await Promise.allSettled([
      this.auth.ping(),
      this.user.ping(),
      this.order.ping(),
      this.fabric.ping(),
      this.measurement.ping(),
      this.appointment.ping(),
      this.notification.ping(),
    ])

    return {
      auth: results[0].status === "fulfilled" && results[0].value.success,
      user: results[1].status === "fulfilled" && results[1].value.success,
      order: results[2].status === "fulfilled" && results[2].value.success,
      fabric: results[3].status === "fulfilled" && results[3].value.success,
      measurement: results[4].status === "fulfilled" && results[4].value.success,
      appointment: results[5].status === "fulfilled" && results[5].value.success,
      notification: results[6].status === "fulfilled" && results[6].value.success,
    }
  }
}

/**
 * Create and configure the service registry
 */
export function createServiceRegistry(config: RegistryConfig): ServiceRegistry {
  return new ServiceRegistry(config)
}

/**
 * Global service registry instance (will be initialized in app setup)
 */
let globalRegistry: ServiceRegistry | null = null

/**
 * Initialize the global service registry
 */
export function initializeServiceRegistry(config: RegistryConfig): ServiceRegistry {
  globalRegistry = createServiceRegistry(config)
  return globalRegistry
}

/**
 * Get the global service registry instance
 */
export function getServiceRegistry(): ServiceRegistry {
  if (!globalRegistry) {
    throw new Error("Service registry not initialized. Call initializeServiceRegistry() first.")
  }
  return globalRegistry
}

/**
 * Convenience function to get all services from the global registry
 */
export function getServices(): ServiceRegistry {
  return getServiceRegistry()
}
