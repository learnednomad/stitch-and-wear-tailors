/**
 * Appointment API Service
 *
 * Handles all appointment-related API operations including scheduling,
 * calendar management, reminders, and availability checking following Infinite Red patterns.
 */

import { BaseApiService, ServiceResult } from "./base-api-service"
import { IAppointmentApiService } from "./service-types"
import { CreateAppointmentRequest, AppointmentListParams, ApiResponse } from "./api.types"

/**
 * AppointmentAPI Service Implementation
 *
 * Provides comprehensive appointment management functionality:
 * - Appointment CRUD operations
 * - Scheduling and availability checking
 * - Calendar integration and reminders
 * - Appointment workflow management
 */
export class AppointmentApiService extends BaseApiService implements IAppointmentApiService {
  /**
   * Service health check
   */
  async ping(): Promise<ServiceResult<boolean>> {
    const result = await this.get<{ status: string }>("/health")
    if (result.success) {
      return { success: true, data: result.data.status === "ok" }
    }
    return { success: false, problem: result.problem, message: result.message }
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      serviceName: "appointment",
      baseEndpoint: this.baseEndpoint,
      isAuthenticated: this.isAuthenticated(),
      isConfigured: !!this.api,
    }
  }

  /**
   * Create new appointment
   */
  async createAppointment(appointmentData: CreateAppointmentRequest): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    // Validate required fields
    if (!appointmentData.clientId || !appointmentData.tailorId || !appointmentData.scheduledDate) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client ID, tailor ID, and scheduled date are required",
      }
    }

    if (!appointmentData.type || !appointmentData.duration || appointmentData.duration <= 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment type and valid duration are required",
      }
    }

    if (!appointmentData.title || appointmentData.title.trim().length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment title is required",
      }
    }

    return this.post<any>("/", appointmentData)
  }

  /**
   * Get appointment by ID
   */
  async getAppointment(appointmentId: string): Promise<ServiceResult<any>> {
    if (!appointmentId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment ID is required",
      }
    }

    return this.getById<any>(appointmentId)
  }

  /**
   * Update appointment
   */
  async updateAppointment(appointmentId: string, updates: any): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!appointmentId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment ID is required",
      }
    }

    return this.update<any>(appointmentId, updates)
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(appointmentId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!appointmentId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment ID is required",
      }
    }

    return this.deleteById<void>(appointmentId)
  }

  /**
   * Get appointments with filtering and pagination
   */
  async getAppointments(
    params?: AppointmentListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    return this.getList<any>("/", params)
  }

  /**
   * Get appointments for a specific client
   */
  async getClientAppointments(
    clientId: string,
    params?: AppointmentListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (!clientId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client ID is required",
      }
    }

    const searchParams = {
      ...params,
      clientId,
    }

    return this.getList<any>("/", searchParams)
  }

  /**
   * Get appointments for a specific tailor
   */
  async getTailorAppointments(
    tailorId: string,
    params?: AppointmentListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    if (!tailorId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID is required",
      }
    }

    const searchParams = {
      ...params,
      tailorId,
    }

    return this.getList<any>("/", searchParams)
  }

  /**
   * Get available time slots for scheduling
   */
  async getAvailableSlots(
    tailorId: string,
    date: string,
    duration: number,
  ): Promise<ServiceResult<any[]>> {
    if (!tailorId || !date || !duration || duration <= 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID, date, and valid duration are required",
      }
    }

    return this.get<any[]>("/available-slots", { tailorId, date, duration })
  }

  /**
   * Confirm appointment
   */
  async confirmAppointment(appointmentId: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!appointmentId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment ID is required",
      }
    }

    return this.post<any>(`/${appointmentId}/confirm`)
  }

  /**
   * Reschedule appointment to new date/time
   */
  async rescheduleAppointment(appointmentId: string, newDate: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!appointmentId || !newDate) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment ID and new date are required",
      }
    }

    return this.post<any>(`/${appointmentId}/reschedule`, { newDate })
  }

  /**
   * Cancel appointment with reason
   */
  async cancelAppointment(appointmentId: string, reason: string): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!appointmentId || !reason) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment ID and cancellation reason are required",
      }
    }

    return this.post<any>(`/${appointmentId}/cancel`, { reason })
  }

  /**
   * Get calendar events for date range
   */
  async getCalendarEvents(
    userId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<ServiceResult<any[]>> {
    if (!userId || !dateFrom || !dateTo) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID, from date, and to date are required",
      }
    }

    return this.get<any[]>(`/calendar/${userId}`, { dateFrom, dateTo })
  }

  /**
   * Export appointment to calendar format
   */
  async exportToCalendar(
    appointmentId: string,
    format: "ics" | "google",
  ): Promise<ServiceResult<{ url: string }>> {
    if (!appointmentId || !format) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment ID and format are required",
      }
    }

    return this.get<{ url: string }>(`/${appointmentId}/export`, { format })
  }

  /**
   * Send appointment reminder
   */
  async sendReminder(appointmentId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!appointmentId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Appointment ID is required",
      }
    }

    return this.post<void>(`/${appointmentId}/reminder`)
  }

  /**
   * Set reminder preferences for user
   */
  async setReminderPreferences(userId: string, preferences: any): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!userId || !preferences) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID and preferences are required",
      }
    }

    return this.post<void>(`/users/${userId}/reminder-preferences`, preferences)
  }

  /**
   * Get appointment history and patterns
   */
  async getAppointmentHistory(
    userId: string,
    params?: {
      dateFrom?: string
      dateTo?: string
      type?: string
      status?: string
    },
  ): Promise<
    ServiceResult<{
      appointments: any[]
      patterns: {
        frequentTimes: string[]
        preferredTypes: string[]
        averageDuration: number
        cancellationRate: number
      }
    }>
  > {
    if (!userId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "User ID is required",
      }
    }

    return this.get<any>(`/users/${userId}/history`, params)
  }

  /**
   * Check for appointment conflicts
   */
  async checkConflicts(appointmentData: {
    tailorId: string
    scheduledDate: string
    duration: number
    excludeAppointmentId?: string
  }): Promise<
    ServiceResult<{
      hasConflicts: boolean
      conflicts: any[]
      suggestions: any[]
    }>
  > {
    if (!appointmentData.tailorId || !appointmentData.scheduledDate || !appointmentData.duration) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID, scheduled date, and duration are required",
      }
    }

    return this.post<any>("/check-conflicts", appointmentData)
  }

  /**
   * Bulk reschedule appointments
   */
  async bulkReschedule(
    appointments: Array<{
      appointmentId: string
      newDate: string
      reason?: string
    }>,
  ): Promise<
    ServiceResult<{
      successful: any[]
      failed: any[]
      summary: {
        total: number
        rescheduled: number
        errors: number
      }
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!appointments || appointments.length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "At least one appointment is required for bulk reschedule",
      }
    }

    return this.post<any>("/bulk-reschedule", { appointments })
  }

  /**
   * Get appointment analytics
   */
  async getAppointmentAnalytics(params?: {
    dateFrom?: string
    dateTo?: string
    tailorId?: string
    type?: string
  }): Promise<
    ServiceResult<{
      totalAppointments: number
      completedAppointments: number
      cancelledAppointments: number
      noShowRate: number
      averageDuration: number
      popularTimeSlots: any[]
      typeBreakdown: Record<string, number>
      clientSatisfaction: number
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<any>("/analytics", params)
  }

  /**
   * Set working hours for tailor
   */
  async setWorkingHours(
    tailorId: string,
    schedule: {
      timezone: string
      weeklySchedule: Array<{
        dayOfWeek: number // 0-6 (Sunday-Saturday)
        isWorkingDay: boolean
        startTime?: string // HH:mm format
        endTime?: string // HH:mm format
        breaks?: Array<{
          startTime: string
          endTime: string
          title: string
        }>
      }>
      holidays?: Array<{
        date: string
        title: string
        isRecurring?: boolean
      }>
    },
  ): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!tailorId || !schedule || !schedule.weeklySchedule) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID and weekly schedule are required",
      }
    }

    return this.post<void>(`/tailors/${tailorId}/working-hours`, schedule)
  }

  /**
   * Get working hours for tailor
   */
  async getWorkingHours(tailorId: string): Promise<ServiceResult<any>> {
    if (!tailorId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID is required",
      }
    }

    return this.get<any>(`/tailors/${tailorId}/working-hours`)
  }

  /**
   * Block time slots (make unavailable)
   */
  async blockTimeSlots(
    tailorId: string,
    blocks: Array<{
      startDate: string
      endDate: string
      reason: string
      title?: string
      isRecurring?: boolean
      recurrencePattern?: string
    }>,
  ): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!tailorId || !blocks || blocks.length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID and at least one time block are required",
      }
    }

    return this.post<void>(`/tailors/${tailorId}/block-time`, { blocks })
  }

  /**
   * Get blocked time slots
   */
  async getBlockedTimeSlots(
    tailorId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ServiceResult<any[]>> {
    if (!tailorId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Tailor ID is required",
      }
    }

    const params = { dateFrom, dateTo }
    return this.get<any[]>(`/tailors/${tailorId}/blocked-time`, params)
  }

  /**
   * Generate appointment report
   */
  async generateAppointmentReport(params: {
    dateFrom: string
    dateTo: string
    tailorId?: string
    clientId?: string
    format: "pdf" | "excel" | "csv"
    includeAnalytics?: boolean
  }): Promise<ServiceResult<{ reportUrl: string }>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!params.dateFrom || !params.dateTo || !params.format) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Date range and format are required",
      }
    }

    return this.post<{ reportUrl: string }>("/reports", params)
  }
}
