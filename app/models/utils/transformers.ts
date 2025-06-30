/**
 * Data Transformation Utilities
 * Transforms data between different formats and validates using Zod schemas
 */

import {
  validateUser,
  validateOrder,
  validateMeasurement,
  validateFabric,
  validateStyle,
  validateAppointment,
  validateInvoice,
  validateNotification,
  validateFeedback,
  validateCreateUserInput,
  validateCreateOrderInput,
  validateCreateMeasurementInput,
  validateCreateFabricInput,
  validateCreateStyleInput,
  validateCreateAppointmentInput,
  validateCreateInvoiceInput,
  validateCreateNotificationInput,
  validateCreateFeedbackInput,
} from '../schemas'

import type {
  User,
  Order,
  Measurement,
  Fabric,
  Style,
  Appointment,
  Invoice,
  Notification,
  Feedback,
  CreateUserInput,
  CreateOrderInput,
  CreateMeasurementInput,
  CreateFabricInput,
  CreateStyleInput,
  CreateAppointmentInput,
  CreateInvoiceInput,
  CreateNotificationInput,
  CreateFeedbackInput,
} from '../types'

/**
 * Transform and validate raw data to User model
 */
export const transformToUser = (data: unknown): User => {
  return validateUser(data)
}

/**
 * Transform and validate raw data to Order model
 */
export const transformToOrder = (data: unknown): Order => {
  return validateOrder(data)
}

/**
 * Transform and validate raw data to Measurement model
 */
export const transformToMeasurement = (data: unknown): Measurement => {
  return validateMeasurement(data)
}

/**
 * Transform and validate raw data to Fabric model
 */
export const transformToFabric = (data: unknown): Fabric => {
  return validateFabric(data)
}

/**
 * Transform and validate raw data to Style model
 */
export const transformToStyle = (data: unknown): Style => {
  return validateStyle(data)
}

/**
 * Transform and validate raw data to Appointment model
 */
export const transformToAppointment = (data: unknown): Appointment => {
  return validateAppointment(data)
}

/**
 * Transform and validate raw data to Invoice model
 */
export const transformToInvoice = (data: unknown): Invoice => {
  return validateInvoice(data)
}

/**
 * Transform and validate raw data to Notification model
 */
export const transformToNotification = (data: unknown): Notification => {
  return validateNotification(data)
}

/**
 * Transform and validate raw data to Feedback model
 */
export const transformToFeedback = (data: unknown): Feedback => {
  return validateFeedback(data)
}

/**
 * Transform and validate input data for creating models
 */
export const transformCreateInputs = {
  user: (data: unknown): CreateUserInput => validateCreateUserInput(data),
  order: (data: unknown): CreateOrderInput => validateCreateOrderInput(data),
  measurement: (data: unknown): CreateMeasurementInput => validateCreateMeasurementInput(data),
  fabric: (data: unknown): CreateFabricInput => validateCreateFabricInput(data),
  style: (data: unknown): CreateStyleInput => validateCreateStyleInput(data),
  appointment: (data: unknown): CreateAppointmentInput => validateCreateAppointmentInput(data),
  invoice: (data: unknown): CreateInvoiceInput => validateCreateInvoiceInput(data),
  notification: (data: unknown): CreateNotificationInput => validateCreateNotificationInput(data),
  feedback: (data: unknown): CreateFeedbackInput => validateCreateFeedbackInput(data),
}

/**
 * Convert date strings to proper format
 */
export const formatDateForModel = (date: Date | string): string => {
  if (typeof date === 'string') {
    return new Date(date).toISOString()
  }
  return date.toISOString()
}

/**
 * Generate UUID for new models
 */
export const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Transform API response to model format
 */
export const transformApiResponse = {
  user: (apiData: any): User => {
    const transformedData = {
      ...apiData,
      createdAt: formatDateForModel(apiData.createdAt || apiData.created_at),
      updatedAt: formatDateForModel(apiData.updatedAt || apiData.updated_at),
      lastLoginAt: apiData.lastLoginAt || apiData.last_login_at 
        ? formatDateForModel(apiData.lastLoginAt || apiData.last_login_at) 
        : undefined,
    }
    return transformToUser(transformedData)
  },

  order: (apiData: any): Order => {
    const transformedData = {
      ...apiData,
      createdAt: formatDateForModel(apiData.createdAt || apiData.created_at),
      updatedAt: formatDateForModel(apiData.updatedAt || apiData.updated_at),
      timeline: {
        ...apiData.timeline,
        estimatedStartDate: formatDateForModel(apiData.timeline.estimatedStartDate || apiData.timeline.estimated_start_date),
        estimatedCompletionDate: formatDateForModel(apiData.timeline.estimatedCompletionDate || apiData.timeline.estimated_completion_date),
        actualStartDate: apiData.timeline.actualStartDate || apiData.timeline.actual_start_date
          ? formatDateForModel(apiData.timeline.actualStartDate || apiData.timeline.actual_start_date)
          : undefined,
        actualCompletionDate: apiData.timeline.actualCompletionDate || apiData.timeline.actual_completion_date
          ? formatDateForModel(apiData.timeline.actualCompletionDate || apiData.timeline.actual_completion_date)
          : undefined,
      },
    }
    return transformToOrder(transformedData)
  },

  measurement: (apiData: any): Measurement => {
    const transformedData = {
      ...apiData,
      createdAt: formatDateForModel(apiData.createdAt || apiData.created_at),
      updatedAt: formatDateForModel(apiData.updatedAt || apiData.updated_at),
      takenAt: formatDateForModel(apiData.takenAt || apiData.taken_at),
    }
    return transformToMeasurement(transformedData)
  },
}

/**
 * Safe transformation with error handling
 */
export const safeTransform = <T>(
  transformer: (data: unknown) => T,
  data: unknown,
  fallback?: T
): T | null => {
  try {
    return transformer(data)
  } catch (error) {
    console.error('Data transformation error:', error)
    return fallback || null
  }
}

/**
 * Batch transform arrays of data
 */
export const batchTransform = <T>(
  transformer: (data: unknown) => T,
  dataArray: unknown[]
): T[] => {
  return dataArray
    .map(item => safeTransform(transformer, item))
    .filter((item): item is T => item !== null)
}