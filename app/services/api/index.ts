// Core API client and types
export * from "./api"
export * from "./api.types"
export * from "./apiProblem"
export * from "./interceptors"

// Service architecture
export * from "./base-api-service"
export * from "./service-factory"
export * from "./service-types"
export * from "./service-registry"

// Authentication services
export * from "./auth-api"
export * from "./auth-token-provider"
export * from "./auth-integration"
export * from "./auth-store-connector"

// Core business services
export * from "./user-api"
export * from "./order-api"
export * from "./fabric-api"

// Supporting services
export * from "./measurement-api"
export * from "./appointment-api"
export * from "./notification-api"

// Re-export commonly used types for convenience
export type { ServiceResult, ServiceConfig } from "./base-api-service"

export type {
  ServiceRegistration,
  ServiceConstructor,
  FactoryConfig,
  ServiceNames,
} from "./service-factory"

export type {
  IApiService,
  IAuthApiService,
  IUserApiService,
  IOrderApiService,
  IFabricApiService,
  IMeasurementApiService,
  IAppointmentApiService,
  INotificationApiService,
  ServiceInterfaces,
  ServiceOptions,
} from "./service-types"

export type { RegistryConfig } from "./service-registry"
