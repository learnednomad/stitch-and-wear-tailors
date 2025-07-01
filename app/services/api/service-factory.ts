/**
 * API Service Factory
 *
 * Implements service factory pattern for dependency injection and service management.
 * Provides centralized service registration, creation, and lifecycle management.
 */

import { Api, AuthTokenProvider } from "./api"
import { BaseApiService, ServiceConfig } from "./base-api-service"
import { RetryConfig } from "./interceptors"

/**
 * Service constructor type
 */
export type ServiceConstructor<T extends BaseApiService = BaseApiService> = new (
  config: ServiceConfig,
) => T

/**
 * Service registration entry
 */
export interface ServiceRegistration<T extends BaseApiService = BaseApiService> {
  name: string
  constructor: ServiceConstructor<T>
  baseEndpoint: string
  defaultRetryConfig?: RetryConfig
  singleton?: boolean
}

/**
 * Factory configuration
 */
export interface FactoryConfig {
  api: Api
  authProvider?: AuthTokenProvider
  defaultRetryConfig?: RetryConfig
}

/**
 * Service Factory for managing API service instances
 *
 * Features:
 * - Service registration and discovery
 * - Singleton pattern support
 * - Dependency injection
 * - Lifecycle management
 * - Configuration management
 */
export class ServiceFactory {
  private api: Api
  private authProvider?: AuthTokenProvider
  private defaultRetryConfig?: RetryConfig
  private registrations = new Map<string, ServiceRegistration>()
  private instances = new Map<string, BaseApiService>()

  constructor(config: FactoryConfig) {
    this.api = config.api
    this.authProvider = config.authProvider
    this.defaultRetryConfig = config.defaultRetryConfig
  }

  /**
   * Register a service class with the factory
   */
  register<T extends BaseApiService>(registration: ServiceRegistration<T>): void {
    this.registrations.set(registration.name, registration)
  }

  /**
   * Register multiple services at once
   */
  registerMany(registrations: ServiceRegistration[]): void {
    registrations.forEach((registration) => this.register(registration))
  }

  /**
   * Create or retrieve a service instance
   */
  create<T extends BaseApiService>(serviceName: string): T {
    const registration = this.registrations.get(serviceName)
    if (!registration) {
      throw new Error(`Service '${serviceName}' not registered`)
    }

    // Return existing singleton instance if available
    if (registration.singleton && this.instances.has(serviceName)) {
      return this.instances.get(serviceName) as T
    }

    // Create new service instance
    const serviceConfig: ServiceConfig = {
      api: this.api,
      authProvider: this.authProvider,
      baseEndpoint: registration.baseEndpoint,
      defaultRetryConfig: registration.defaultRetryConfig || this.defaultRetryConfig,
    }

    const instance = new registration.constructor(serviceConfig) as T

    // Cache singleton instances
    if (registration.singleton) {
      this.instances.set(serviceName, instance)
    }

    return instance
  }

  /**
   * Get service by name (alias for create)
   */
  get<T extends BaseApiService>(serviceName: string): T {
    return this.create<T>(serviceName)
  }

  /**
   * Check if a service is registered
   */
  has(serviceName: string): boolean {
    return this.registrations.has(serviceName)
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.registrations.keys())
  }

  /**
   * Update authentication provider for all future service instances
   */
  setAuthProvider(authProvider: AuthTokenProvider): void {
    this.authProvider = authProvider

    // Update existing singleton instances
    this.instances.forEach((instance) => {
      if ("setAuthProvider" in instance && typeof instance.setAuthProvider === "function") {
        ;(instance as any).setAuthProvider(authProvider)
      }
    })
  }

  /**
   * Update API instance for all future service instances
   */
  setApi(api: Api): void {
    this.api = api

    // Clear existing instances since they use the old API
    this.instances.clear()
  }

  /**
   * Clear all cached singleton instances
   */
  clearInstances(): void {
    this.instances.clear()
  }

  /**
   * Clear a specific service instance
   */
  clearInstance(serviceName: string): void {
    this.instances.delete(serviceName)
  }

  /**
   * Get factory configuration info
   */
  getConfig() {
    return {
      hasApi: !!this.api,
      hasAuthProvider: !!this.authProvider,
      registeredServices: this.getRegisteredServices(),
      singletonInstances: Array.from(this.instances.keys()),
      defaultRetryConfig: this.defaultRetryConfig,
    }
  }
}

/**
 * Service names enum for type safety
 */
export enum ServiceNames {
  AUTH = "auth",
  USER = "user",
  ORDER = "order",
  FABRIC = "fabric",
  MEASUREMENT = "measurement",
  APPOINTMENT = "appointment",
  NOTIFICATION = "notification",
}

/**
 * Type-safe service retrieval interface
 */
export interface ServiceContainer {
  auth: any // Will be replaced with specific types when services are implemented
  user: any
  order: any
  fabric: any
  measurement: any
  appointment: any
  notification: any
}

/**
 * Helper function to create a service factory with default configuration
 */
export function createServiceFactory(
  api: Api,
  authProvider?: AuthTokenProvider,
  defaultRetryConfig?: RetryConfig,
): ServiceFactory {
  return new ServiceFactory({
    api,
    authProvider,
    defaultRetryConfig,
  })
}

/**
 * Service registration helper for reducing boilerplate
 */
export function createServiceRegistration<T extends BaseApiService>(
  name: string,
  constructor: ServiceConstructor<T>,
  baseEndpoint: string,
  options: {
    defaultRetryConfig?: RetryConfig
    singleton?: boolean
  } = {},
): ServiceRegistration<T> {
  return {
    name,
    constructor,
    baseEndpoint,
    defaultRetryConfig: options.defaultRetryConfig,
    singleton: options.singleton ?? true, // Default to singleton
  }
}
