/**
 * API Service Types and Interfaces
 *
 * Defines the contracts and types for all domain-specific API services.
 * Ensures consistency across all service implementations.
 */

import { ServiceResult } from "./base-api-service"
import {
  ApiResponse,
  SearchParams,
  PaginationParams,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateUserProfileRequest,
  CreateOrderRequest,
  UpdateOrderRequest,
  OrderListParams,
  FabricListParams,
  CreateMeasurementRequest,
  MeasurementListParams,
  CreateAppointmentRequest,
  AppointmentListParams,
  CreateNotificationRequest,
  NotificationListParams,
} from "./api.types"

/**
 * Common service interface that all domain services should implement
 */
export interface IApiService {
  /**
   * Check if the service is properly configured and accessible
   */
  ping(): Promise<ServiceResult<boolean>>

  /**
   * Get service configuration and status
   */
  getStatus(): {
    serviceName: string
    baseEndpoint: string
    isAuthenticated: boolean
    isConfigured: boolean
  }
}

/**
 * Authentication API Service Interface
 */
export interface IAuthApiService extends IApiService {
  // Authentication operations
  login(credentials: LoginRequest): Promise<ServiceResult<LoginResponse>>
  register(userData: RegisterRequest): Promise<ServiceResult<LoginResponse>>
  logout(): Promise<ServiceResult<void>>

  // Token management
  refreshToken(): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>>
  verifyToken(token: string): Promise<ServiceResult<boolean>>

  // Password operations
  forgotPassword(email: string): Promise<ServiceResult<void>>
  resetPassword(token: string, newPassword: string): Promise<ServiceResult<void>>
  changePassword(currentPassword: string, newPassword: string): Promise<ServiceResult<void>>

  // Session management
  getCurrentSession(): Promise<ServiceResult<LoginResponse>>
  revokeAllSessions(): Promise<ServiceResult<void>>

  // Email verification
  sendVerificationEmail(): Promise<ServiceResult<void>>
  verifyEmail(token: string): Promise<ServiceResult<void>>
}

/**
 * User API Service Interface
 */
export interface IUserApiService extends IApiService {
  // Profile operations
  getProfile(userId?: string): Promise<ServiceResult<any>>
  updateProfile(updates: UpdateUserProfileRequest): Promise<ServiceResult<any>>
  uploadAvatar(file: FormData): Promise<ServiceResult<{ url: string }>>
  deleteAccount(): Promise<ServiceResult<void>>

  // User search and listing
  searchUsers(params: SearchParams): Promise<ServiceResult<ApiResponse<any[]>>>
  getTailors(params?: SearchParams): Promise<ServiceResult<ApiResponse<any[]>>>
  getClients(params?: SearchParams): Promise<ServiceResult<ApiResponse<any[]>>>

  // User relationships
  followTailor(tailorId: string): Promise<ServiceResult<void>>
  unfollowTailor(tailorId: string): Promise<ServiceResult<void>>
  getFollowing(userId?: string): Promise<ServiceResult<any[]>>
  getFollowers(userId?: string): Promise<ServiceResult<any[]>>
}

/**
 * Order API Service Interface
 */
export interface IOrderApiService extends IApiService {
  // Order CRUD operations
  createOrder(orderData: CreateOrderRequest): Promise<ServiceResult<any>>
  getOrder(orderId: string): Promise<ServiceResult<any>>
  updateOrder(orderId: string, updates: UpdateOrderRequest): Promise<ServiceResult<any>>
  deleteOrder(orderId: string): Promise<ServiceResult<void>>

  // Order listing and search
  getOrders(params?: OrderListParams): Promise<ServiceResult<ApiResponse<any[]>>>
  getClientOrders(
    clientId: string,
    params?: OrderListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>>
  getTailorOrders(
    tailorId: string,
    params?: OrderListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>>

  // Order workflow operations
  confirmOrder(orderId: string): Promise<ServiceResult<any>>
  startOrder(orderId: string): Promise<ServiceResult<any>>
  completeOrder(orderId: string): Promise<ServiceResult<any>>
  cancelOrder(orderId: string, reason: string): Promise<ServiceResult<any>>

  // Order tracking
  getOrderHistory(orderId: string): Promise<ServiceResult<any[]>>
  getOrderTimeline(orderId: string): Promise<ServiceResult<any[]>>

  // Pricing and estimates
  calculateOrderPrice(items: any[]): Promise<ServiceResult<{ total: number; breakdown: any[] }>>
  getOrderInvoice(orderId: string): Promise<ServiceResult<any>>
}

/**
 * Fabric API Service Interface
 */
export interface IFabricApiService extends IApiService {
  // Fabric catalog operations
  getFabrics(params?: FabricListParams): Promise<ServiceResult<ApiResponse<any[]>>>
  getFabric(fabricId: string): Promise<ServiceResult<any>>
  searchFabrics(
    query: string,
    params?: FabricListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>>

  // Fabric categories and filters
  getCategories(): Promise<ServiceResult<any[]>>
  getColors(): Promise<ServiceResult<any[]>>
  getPriceRanges(): Promise<ServiceResult<any>>

  // Fabric availability
  checkAvailability(
    fabricId: string,
    quantity: number,
  ): Promise<ServiceResult<{ available: boolean; stock: number }>>
  reserveFabric(
    fabricId: string,
    quantity: number,
  ): Promise<ServiceResult<{ reservationId: string }>>
  releaseFabricReservation(reservationId: string): Promise<ServiceResult<void>>

  // Featured and recommendations
  getFeaturedFabrics(): Promise<ServiceResult<any[]>>
  getRecommendedFabrics(userId?: string): Promise<ServiceResult<any[]>>
  getSimilarFabrics(fabricId: string): Promise<ServiceResult<any[]>>
}

/**
 * Measurement API Service Interface
 */
export interface IMeasurementApiService extends IApiService {
  // Measurement CRUD operations
  createMeasurement(measurementData: CreateMeasurementRequest): Promise<ServiceResult<any>>
  getMeasurement(measurementId: string): Promise<ServiceResult<any>>
  updateMeasurement(measurementId: string, updates: any): Promise<ServiceResult<any>>
  deleteMeasurement(measurementId: string): Promise<ServiceResult<void>>

  // Measurement listing and search
  getMeasurements(params?: MeasurementListParams): Promise<ServiceResult<ApiResponse<any[]>>>
  getClientMeasurements(clientId: string): Promise<ServiceResult<any[]>>
  getMeasurementHistory(clientId: string, garmentType?: string): Promise<ServiceResult<any[]>>

  // Measurement templates
  getTemplates(garmentType?: string): Promise<ServiceResult<any[]>>
  createTemplate(templateData: any): Promise<ServiceResult<any>>

  // Measurement validation and recommendations
  validateMeasurements(
    measurements: any[],
  ): Promise<ServiceResult<{ valid: boolean; suggestions: any[] }>>
  suggestMeasurements(clientProfile: any, garmentType: string): Promise<ServiceResult<any[]>>

  // Size conversion
  convertMeasurements(
    measurements: any[],
    fromUnit: string,
    toUnit: string,
  ): Promise<ServiceResult<any[]>>
  getSizeChart(garmentType: string): Promise<ServiceResult<any>>
}

/**
 * Appointment API Service Interface
 */
export interface IAppointmentApiService extends IApiService {
  // Appointment CRUD operations
  createAppointment(appointmentData: CreateAppointmentRequest): Promise<ServiceResult<any>>
  getAppointment(appointmentId: string): Promise<ServiceResult<any>>
  updateAppointment(appointmentId: string, updates: any): Promise<ServiceResult<any>>
  deleteAppointment(appointmentId: string): Promise<ServiceResult<void>>

  // Appointment listing and search
  getAppointments(params?: AppointmentListParams): Promise<ServiceResult<ApiResponse<any[]>>>
  getClientAppointments(
    clientId: string,
    params?: AppointmentListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>>
  getTailorAppointments(
    tailorId: string,
    params?: AppointmentListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>>

  // Scheduling operations
  getAvailableSlots(tailorId: string, date: string, duration: number): Promise<ServiceResult<any[]>>
  confirmAppointment(appointmentId: string): Promise<ServiceResult<any>>
  rescheduleAppointment(appointmentId: string, newDate: string): Promise<ServiceResult<any>>
  cancelAppointment(appointmentId: string, reason: string): Promise<ServiceResult<any>>

  // Calendar integration
  getCalendarEvents(userId: string, dateFrom: string, dateTo: string): Promise<ServiceResult<any[]>>
  exportToCalendar(
    appointmentId: string,
    format: "ics" | "google",
  ): Promise<ServiceResult<{ url: string }>>

  // Notifications and reminders
  sendReminder(appointmentId: string): Promise<ServiceResult<void>>
  setReminderPreferences(userId: string, preferences: any): Promise<ServiceResult<void>>
}

/**
 * Notification API Service Interface
 */
export interface INotificationApiService extends IApiService {
  // Notification CRUD operations
  createNotification(notificationData: CreateNotificationRequest): Promise<ServiceResult<any>>
  getNotification(notificationId: string): Promise<ServiceResult<any>>
  updateNotification(notificationId: string, updates: any): Promise<ServiceResult<any>>
  deleteNotification(notificationId: string): Promise<ServiceResult<void>>

  // Notification listing and management
  getNotifications(params?: NotificationListParams): Promise<ServiceResult<ApiResponse<any[]>>>
  getUserNotifications(
    userId: string,
    params?: NotificationListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>>
  markAsRead(notificationId: string): Promise<ServiceResult<void>>
  markAllAsRead(userId: string): Promise<ServiceResult<void>>

  // Notification preferences
  getPreferences(userId: string): Promise<ServiceResult<any>>
  updatePreferences(userId: string, preferences: any): Promise<ServiceResult<any>>

  // Push notification management
  registerDevice(
    userId: string,
    deviceToken: string,
    platform: "ios" | "android",
  ): Promise<ServiceResult<void>>
  unregisterDevice(deviceToken: string): Promise<ServiceResult<void>>
  sendPushNotification(userId: string, message: any): Promise<ServiceResult<void>>

  // Notification templates
  getTemplates(): Promise<ServiceResult<any[]>>
  createTemplate(templateData: any): Promise<ServiceResult<any>>

  // Bulk operations
  sendBulkNotifications(notifications: CreateNotificationRequest[]): Promise<ServiceResult<any[]>>
  deleteUserNotifications(userId: string, olderThan?: string): Promise<ServiceResult<void>>
}

/**
 * Combined service interfaces for type-safe factory
 */
export interface ServiceInterfaces {
  auth: IAuthApiService
  user: IUserApiService
  order: IOrderApiService
  fabric: IFabricApiService
  measurement: IMeasurementApiService
  appointment: IAppointmentApiService
  notification: INotificationApiService
}

/**
 * Service configuration options
 */
export interface ServiceOptions {
  enableCaching?: boolean
  cacheTimeout?: number
  enableOptimisticUpdates?: boolean
  enableOfflineSupport?: boolean
  enableRetry?: boolean
  maxRetries?: number
}
