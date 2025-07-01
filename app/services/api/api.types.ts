/**
 * API Types for Stitch and Wear Tailors
 *
 * These types define the shape of data exchanged with the backend API
 * following the business domain model.
 */

/**
 * The options used to configure apisauce.
 */
export interface ApiConfig {
  /**
   * The URL of the api.
   */
  url: string

  /**
   * Milliseconds before we timeout the request.
   */
  timeout: number
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
  meta?: {
    page?: number
    totalPages?: number
    totalItems?: number
    hasMore?: boolean
  }
}

/**
 * Authentication API types
 */
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    role: "client" | "tailor" | "admin"
    profile: {
      firstName: string
      lastName: string
      avatar?: string
    }
    emailVerified: boolean
  }
  session: {
    accessToken: string
    refreshToken: string
    expiresAt: string
  }
}

export interface RegisterRequest {
  email: string
  password: string
  role: "client" | "tailor"
  profile: {
    firstName: string
    lastName: string
    phone?: string
  }
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

/**
 * Search parameters for filterable endpoints
 */
export interface SearchParams extends PaginationParams {
  search?: string
  filters?: Record<string, any>
}

/**
 * User API types
 */
export interface UpdateUserProfileRequest {
  profile?: {
    firstName?: string
    lastName?: string
    phone?: string
    avatar?: string
    dateOfBirth?: string
    gender?: "male" | "female" | "other" | "prefer_not_to_say"
    bio?: string
  }
  preferences?: {
    notifications?: {
      email?: boolean
      push?: boolean
      sms?: boolean
    }
    language?: string
    timezone?: string
    currency?: string
    theme?: "light" | "dark" | "auto"
    measurementUnit?: "metric" | "imperial"
  }
}

/**
 * Order API types
 */
export interface CreateOrderRequest {
  clientId: string
  style?: "agbada" | "kaftan" | "plain_kaftan" | "senator" | "traditional" | "modern" | "custom"
  items: Array<{
    fabricId: string
    styleId: string
    style?: "agbada" | "kaftan" | "plain_kaftan" | "senator" | "traditional" | "modern" | "custom"
    quantity: number
    measurements: Record<string, number>
    customizations: Record<string, string>
    unitPrice: number
  }>
  notes?: string
  dueDate?: string
}

export interface UpdateOrderRequest {
  status?:
    | "draft"
    | "pending"
    | "confirmed"
    | "in_progress"
    | "ready_for_fitting"
    | "fitting_scheduled"
    | "alterations_needed"
    | "completed"
    | "delivered"
    | "cancelled"
  tailorId?: string
  notes?: string
  fittingScheduled?: string
}

export interface OrderListParams extends SearchParams {
  clientId?: string
  tailorId?: string
  status?: string
  priority?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Fabric API types
 */
export interface FabricListParams extends SearchParams {
  category?: string
  color?: string
  priceMin?: number
  priceMax?: number
  available?: boolean
  featured?: boolean
}

/**
 * Measurement API types
 */
export interface CreateMeasurementRequest {
  clientId: string
  templateId?: string
  garmentType: "shirt" | "pants" | "dress" | "suit" | "blazer" | "skirt" | "blouse" | "agbada" | "kaftan" | "plain_kaftan" | "senator" | "traditional" | "custom"
  measurements: Array<{
    name: string
    value: number
    unit: "cm" | "inches"
    notes?: string
  }>
  sessionNotes?: string
}

export interface MeasurementListParams extends SearchParams {
  clientId?: string
  tailorId?: string
  garmentType?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Appointment API types
 */
export interface CreateAppointmentRequest {
  clientId: string
  tailorId: string
  type: "consultation" | "measurement" | "fitting" | "delivery" | "alteration" | "design_review"
  scheduledDate: string
  duration: number
  location: {
    type: "studio" | "client_home" | "virtual" | "other"
    address?: string
    specialInstructions?: string
  }
  title: string
  description?: string
  requiresMeasurements?: boolean
  requiresFabricSamples?: boolean
  requiresGarmentBringing?: boolean
}

export interface AppointmentListParams extends SearchParams {
  clientId?: string
  tailorId?: string
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Notification API types
 */
export interface CreateNotificationRequest {
  userId: string
  type:
    | "order_update"
    | "appointment_reminder"
    | "measurement_alert"
    | "promotional_offer"
    | "system_announcement"
    | "feedback_request"
    | "payment_reminder"
    | "delivery_notification"
  priority: "low" | "medium" | "high" | "urgent"
  title: string
  body: string
  actionText?: string
  actionUrl?: string
  channels?: Array<"push" | "email" | "sms" | "in_app">
  scheduledFor?: string
}

export interface NotificationListParams extends SearchParams {
  userId?: string
  type?: string
  isRead?: boolean
}

/**
 * Error response from API
 */
export interface ApiErrorResponse {
  success: false
  message: string
  errors?: string[]
  code?: string
}
