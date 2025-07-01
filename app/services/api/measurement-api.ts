/**
 * Measurement API Service
 *
 * Handles all measurement-related API operations including measurement collection,
 * templates, validation, and history tracking following Infinite Red patterns.
 */

import { BaseApiService, ServiceResult } from "./base-api-service"
import { IMeasurementApiService } from "./service-types"
import { CreateMeasurementRequest, MeasurementListParams, ApiResponse } from "./api.types"

/**
 * MeasurementAPI Service Implementation
 *
 * Provides comprehensive measurement management functionality:
 * - Measurement CRUD operations
 * - Templates and size guides
 * - Validation and recommendations
 * - History tracking and comparison
 */
export class MeasurementApiService extends BaseApiService implements IMeasurementApiService {
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
      serviceName: "measurement",
      baseEndpoint: this.baseEndpoint,
      isAuthenticated: this.isAuthenticated(),
      isConfigured: !!this.api,
    }
  }

  /**
   * Create new measurement record
   */
  async createMeasurement(measurementData: CreateMeasurementRequest): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    // Validate required fields
    if (
      !measurementData.clientId ||
      !measurementData.garmentType ||
      !measurementData.measurements
    ) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client ID, garment type, and measurements are required",
      }
    }

    // Validate measurements array
    if (measurementData.measurements.length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "At least one measurement is required",
      }
    }

    // Validate each measurement
    for (const measurement of measurementData.measurements) {
      if (!measurement.name || !measurement.value || !measurement.unit) {
        return {
          success: false,
          problem: { kind: "rejected" },
          message: "Each measurement must have name, value, and unit",
        }
      }
    }

    return this.post<any>("/", measurementData)
  }

  /**
   * Get measurement by ID
   */
  async getMeasurement(measurementId: string): Promise<ServiceResult<any>> {
    if (!measurementId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Measurement ID is required",
      }
    }

    return this.getById<any>(measurementId)
  }

  /**
   * Update measurement record
   */
  async updateMeasurement(measurementId: string, updates: any): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!measurementId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Measurement ID is required",
      }
    }

    return this.update<any>(measurementId, updates)
  }

  /**
   * Delete measurement record
   */
  async deleteMeasurement(measurementId: string): Promise<ServiceResult<void>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!measurementId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Measurement ID is required",
      }
    }

    return this.deleteById<void>(measurementId)
  }

  /**
   * Get measurements with filtering and pagination
   */
  async getMeasurements(
    params?: MeasurementListParams,
  ): Promise<ServiceResult<ApiResponse<any[]>>> {
    return this.getList<any>("/", params)
  }

  /**
   * Get measurements for a specific client
   */
  async getClientMeasurements(clientId: string): Promise<ServiceResult<any[]>> {
    if (!clientId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client ID is required",
      }
    }

    return this.get<any[]>(`/client/${clientId}`)
  }

  /**
   * Get measurement history for a client
   */
  async getMeasurementHistory(
    clientId: string,
    garmentType?: string,
  ): Promise<ServiceResult<any[]>> {
    if (!clientId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client ID is required",
      }
    }

    const params = garmentType ? { garmentType } : undefined
    return this.get<any[]>(`/client/${clientId}/history`, params)
  }

  /**
   * Get measurement templates
   */
  async getTemplates(garmentType?: string): Promise<ServiceResult<any[]>> {
    const params = garmentType ? { garmentType } : undefined
    return this.get<any[]>("/templates", params)
  }

  /**
   * Create measurement template
   */
  async createTemplate(templateData: any): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!templateData.name || !templateData.garmentType || !templateData.measurements) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Template name, garment type, and measurements are required",
      }
    }

    return this.post<any>("/templates", templateData)
  }

  /**
   * Validate measurements against standards
   */
  async validateMeasurements(
    measurements: any[],
  ): Promise<ServiceResult<{ valid: boolean; suggestions: any[] }>> {
    if (!measurements || measurements.length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Measurements are required for validation",
      }
    }

    return this.post<{ valid: boolean; suggestions: any[] }>("/validate", { measurements })
  }

  /**
   * Get measurement suggestions based on client profile
   */
  async suggestMeasurements(
    clientProfile: any,
    garmentType: string,
  ): Promise<ServiceResult<any[]>> {
    if (!clientProfile || !garmentType) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client profile and garment type are required",
      }
    }

    return this.post<any[]>("/suggest", { clientProfile, garmentType })
  }

  /**
   * Convert measurements between units
   */
  async convertMeasurements(
    measurements: any[],
    fromUnit: string,
    toUnit: string,
  ): Promise<ServiceResult<any[]>> {
    if (!measurements || measurements.length === 0) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Measurements are required for conversion",
      }
    }

    if (!fromUnit || !toUnit) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "From unit and to unit are required",
      }
    }

    return this.post<any[]>("/convert", { measurements, fromUnit, toUnit })
  }

  /**
   * Get size chart for garment type
   */
  async getSizeChart(garmentType: string): Promise<ServiceResult<any>> {
    if (!garmentType) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Garment type is required",
      }
    }

    return this.get<any>(`/size-chart/${garmentType}`)
  }

  /**
   * Compare measurements between sessions
   */
  async compareMeasurements(
    measurementId1: string,
    measurementId2: string,
  ): Promise<
    ServiceResult<{
      differences: any[]
      summary: {
        totalChanges: number
        significantChanges: number
        averageChange: number
      }
    }>
  > {
    if (!measurementId1 || !measurementId2) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Both measurement IDs are required for comparison",
      }
    }

    return this.get<any>("/compare", { measurementId1, measurementId2 })
  }

  /**
   * Get measurement accuracy report
   */
  async getMeasurementAccuracy(measurementId: string): Promise<
    ServiceResult<{
      accuracy: number
      confidence: number
      recommendations: string[]
      flaggedMeasurements: any[]
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!measurementId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Measurement ID is required",
      }
    }

    return this.get<any>(`/${measurementId}/accuracy`)
  }

  /**
   * Generate measurement report
   */
  async generateMeasurementReport(
    clientId: string,
    options: {
      includeHistory?: boolean
      compareWithStandards?: boolean
      format?: "pdf" | "html"
    },
  ): Promise<ServiceResult<{ reportUrl: string }>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!clientId) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client ID is required",
      }
    }

    return this.post<{ reportUrl: string }>(`/client/${clientId}/report`, options)
  }

  /**
   * Get measurement analytics
   */
  async getMeasurementAnalytics(params?: {
    dateFrom?: string
    dateTo?: string
    garmentType?: string
    tailorId?: string
  }): Promise<
    ServiceResult<{
      totalMeasurements: number
      averageAccuracy: number
      commonErrors: any[]
      trendAnalysis: any[]
      clientSatisfaction: number
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    return this.get<any>("/analytics", params)
  }

  /**
   * Schedule measurement appointment
   */
  async scheduleMeasurementSession(sessionData: {
    clientId: string
    tailorId: string
    scheduledDate: string
    garmentType: string
    location: {
      type: "studio" | "client_home"
      address?: string
    }
    estimatedDuration: number
    notes?: string
  }): Promise<ServiceResult<any>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!sessionData.clientId || !sessionData.tailorId || !sessionData.scheduledDate) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Client ID, tailor ID, and scheduled date are required",
      }
    }

    return this.post<any>("/schedule-session", sessionData)
  }

  /**
   * Get measurement standards by region/culture
   */
  async getMeasurementStandards(
    region?: string,
    culture?: string,
  ): Promise<
    ServiceResult<{
      standards: any[]
      averages: Record<string, number>
      ranges: Record<string, { min: number; max: number }>
    }>
  > {
    const params = { region, culture }
    return this.get<any>("/standards", params)
  }

  /**
   * Bulk import measurements from file
   */
  async importMeasurements(
    file: FormData,
    options: {
      format: "csv" | "excel"
      validateOnly?: boolean
      overwriteExisting?: boolean
    },
  ): Promise<
    ServiceResult<{
      imported: number
      errors: any[]
      warnings: any[]
    }>
  > {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!file) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "File is required for import",
      }
    }

    return this.post<any>("/import", { file, ...options })
  }

  /**
   * Export measurements to file
   */
  async exportMeasurements(params: {
    clientIds?: string[]
    dateFrom?: string
    dateTo?: string
    format: "csv" | "excel" | "pdf"
    includeTemplates?: boolean
  }): Promise<ServiceResult<{ downloadUrl: string }>> {
    const authCheck = this.requireAuthentication()
    if (authCheck) return authCheck

    if (!params.format) {
      return {
        success: false,
        problem: { kind: "rejected" },
        message: "Export format is required",
      }
    }

    return this.post<{ downloadUrl: string }>("/export", params)
  }
}
