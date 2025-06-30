/**
 * Additional Validation Utilities
 * Business logic validation beyond basic schema validation
 */

import type {
  User,
  Order,
  Measurement,
  Fabric,
  Style,
  Appointment,
  Invoice,
  OrderStatus,
  AppointmentStatus,
  InvoiceStatus,
} from '../types'

/**
 * Validation error types
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Business rule validators
 */
export const businessRules = {
  /**
   * Validate order status transitions
   */
  orderStatusTransition: (currentStatus: OrderStatus, newStatus: OrderStatus): ValidationResult => {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['confirmed', 'cancelled'],
      confirmed: ['measuring', 'cancelled'],
      measuring: ['cutting', 'confirmed'],
      cutting: ['stitching', 'measuring'],
      stitching: ['fitting', 'cutting'],
      fitting: ['finishing', 'stitching'],
      finishing: ['ready', 'fitting'],
      ready: ['delivered', 'fitting'],
      delivered: [],
      cancelled: ['pending', 'confirmed'],
      refunded: [],
    }

    const allowed = validTransitions[currentStatus]?.includes(newStatus)

    return {
      valid: allowed || false,
      errors: allowed ? [] : [{
        field: 'status',
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
        code: 'INVALID_STATUS_TRANSITION',
      }],
    }
  },

  /**
   * Validate appointment scheduling conflicts
   */
  appointmentConflict: (
    newAppointment: Pick<Appointment, 'tailorId' | 'startTime' | 'endTime'>,
    existingAppointments: Pick<Appointment, 'tailorId' | 'startTime' | 'endTime' | 'status'>[]
  ): ValidationResult => {
    const conflicts = existingAppointments.filter(existing => {
      if (existing.tailorId !== newAppointment.tailorId) return false
      if (existing.status === 'cancelled') return false

      const newStart = new Date(newAppointment.startTime)
      const newEnd = new Date(newAppointment.endTime)
      const existingStart = new Date(existing.startTime)
      const existingEnd = new Date(existing.endTime)

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      )
    })

    return {
      valid: conflicts.length === 0,
      errors: conflicts.length > 0 ? [{
        field: 'timeSlot',
        message: 'Appointment conflicts with existing booking',
        code: 'APPOINTMENT_CONFLICT',
      }] : [],
    }
  },

  /**
   * Validate fabric inventory for order
   */
  fabricInventory: (
    fabricId: string,
    requiredQuantity: number,
    fabrics: Fabric[]
  ): ValidationResult => {
    const fabric = fabrics.find(f => f.id === fabricId)
    
    if (!fabric) {
      return {
        valid: false,
        errors: [{
          field: 'fabricId',
          message: 'Fabric not found',
          code: 'FABRIC_NOT_FOUND',
        }],
      }
    }

    if (!fabric.active) {
      return {
        valid: false,
        errors: [{
          field: 'fabricId',
          message: 'Fabric is not active',
          code: 'FABRIC_INACTIVE',
        }],
      }
    }

    if (fabric.inventory.availableQuantity < requiredQuantity) {
      return {
        valid: false,
        errors: [{
          field: 'quantity',
          message: `Insufficient fabric inventory. Available: ${fabric.inventory.availableQuantity}, Required: ${requiredQuantity}`,
          code: 'INSUFFICIENT_INVENTORY',
        }],
      }
    }

    return { valid: true, errors: [] }
  },

  /**
   * Validate measurement requirements for style
   */
  measurementRequirements: (
    style: Style,
    measurements: Measurement
  ): ValidationResult => {
    const errors: ValidationError[] = []
    
    // Check required measurements
    style.measurements.required.forEach(required => {
      if (!measurements.standardMeasurements[required as keyof typeof measurements.standardMeasurements]) {
        errors.push({
          field: `measurements.${required}`,
          message: `Required measurement '${required}' is missing`,
          code: 'MISSING_REQUIRED_MEASUREMENT',
        })
      }
    })

    // Check if measurements are validated for complex styles
    if (style.complexity === 'advanced' || style.complexity === 'expert') {
      if (!measurements.validation || measurements.validation.status !== 'approved') {
        errors.push({
          field: 'measurements.validation',
          message: 'Measurements must be validated for complex styles',
          code: 'UNVALIDATED_MEASUREMENTS',
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  /**
   * Validate invoice calculations
   */
  invoiceCalculations: (invoice: Invoice): ValidationResult => {
    const errors: ValidationError[] = []
    
    // Validate line item totals
    invoice.lineItems.forEach((item, index) => {
      const expectedTotal = item.quantity * item.unitPrice
      if (Math.abs(item.totalPrice - expectedTotal) > 0.01) {
        errors.push({
          field: `lineItems[${index}].totalPrice`,
          message: `Line item total incorrect. Expected: ${expectedTotal}, Got: ${item.totalPrice}`,
          code: 'INCORRECT_LINE_TOTAL',
        })
      }
    })

    // Validate subtotal
    const expectedSubtotal = invoice.lineItems.reduce((sum, item) => sum + item.totalPrice, 0)
    if (Math.abs(invoice.totals.subtotal - expectedSubtotal) > 0.01) {
      errors.push({
        field: 'totals.subtotal',
        message: `Subtotal incorrect. Expected: ${expectedSubtotal}, Got: ${invoice.totals.subtotal}`,
        code: 'INCORRECT_SUBTOTAL',
      })
    }

    // Validate total calculation
    const expectedTotal = invoice.totals.subtotal - invoice.totals.discountAmount + invoice.totals.taxAmount
    if (Math.abs(invoice.totals.total - expectedTotal) > 0.01) {
      errors.push({
        field: 'totals.total',
        message: `Total incorrect. Expected: ${expectedTotal}, Got: ${invoice.totals.total}`,
        code: 'INCORRECT_TOTAL',
      })
    }

    // Validate amount due
    const expectedAmountDue = invoice.totals.total - invoice.totals.amountPaid
    if (Math.abs(invoice.totals.amountDue - expectedAmountDue) > 0.01) {
      errors.push({
        field: 'totals.amountDue',
        message: `Amount due incorrect. Expected: ${expectedAmountDue}, Got: ${invoice.totals.amountDue}`,
        code: 'INCORRECT_AMOUNT_DUE',
      })
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  /**
   * Validate user permissions for actions
   */
  userPermissions: (
    user: User,
    action: string,
    resource?: string
  ): ValidationResult => {
    const permissions: Record<string, string[]> = {
      admin: ['*'],
      tailor: [
        'order:read', 'order:update', 'order:create',
        'measurement:read', 'measurement:create', 'measurement:update',
        'appointment:read', 'appointment:create', 'appointment:update',
        'invoice:read', 'invoice:create', 'invoice:update',
        'fabric:read', 'style:read',
        'notification:read', 'feedback:read', 'feedback:respond',
      ],
      client: [
        'order:read', 'order:create',
        'measurement:read',
        'appointment:read', 'appointment:create',
        'invoice:read',
        'fabric:read', 'style:read',
        'notification:read', 'feedback:create',
      ],
    }

    const userPermissions = permissions[user.role] || []
    const hasPermission = userPermissions.includes('*') || userPermissions.includes(action)

    return {
      valid: hasPermission,
      errors: hasPermission ? [] : [{
        field: 'permission',
        message: `User does not have permission for action: ${action}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      }],
    }
  },
}

/**
 * Utility to run multiple validations
 */
export const validateMultiple = (...validationResults: ValidationResult[]): ValidationResult => {
  const allErrors = validationResults.flatMap(result => result.errors)
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  }
}

/**
 * Check if date is in the future
 */
export const isFutureDate = (date: string): boolean => {
  return new Date(date) > new Date()
}

/**
 * Check if date is within business hours
 */
export const isBusinessHours = (date: string): boolean => {
  const appointmentDate = new Date(date)
  const hour = appointmentDate.getHours()
  const day = appointmentDate.getDay()
  
  // Monday = 1, Saturday = 6, Sunday = 0
  const isWeekday = day >= 1 && day <= 6
  const isBusinessHour = hour >= 9 && hour <= 18
  
  return isWeekday && isBusinessHour
}

/**
 * Validate measurement value ranges
 */
export const validateMeasurementRange = (
  measurementName: string,
  value: number,
  unit: 'cm' | 'inch'
): ValidationResult => {
  const ranges = {
    cm: {
      chest: { min: 60, max: 150 },
      waist: { min: 50, max: 140 },
      height: { min: 120, max: 220 },
      neck: { min: 25, max: 50 },
      armLength: { min: 40, max: 90 },
      inseam: { min: 60, max: 120 },
    },
    inch: {
      chest: { min: 24, max: 60 },
      waist: { min: 20, max: 55 },
      height: { min: 48, max: 87 },
      neck: { min: 10, max: 20 },
      armLength: { min: 16, max: 35 },
      inseam: { min: 24, max: 47 },
    },
  }

  const range = ranges[unit][measurementName as keyof typeof ranges[typeof unit]]
  
  if (!range) {
    return { valid: true, errors: [] } // No validation for unknown measurements
  }

  const valid = value >= range.min && value <= range.max

  return {
    valid,
    errors: valid ? [] : [{
      field: measurementName,
      message: `${measurementName} must be between ${range.min} and ${range.max} ${unit}`,
      code: 'MEASUREMENT_OUT_OF_RANGE',
    }],
  }
}