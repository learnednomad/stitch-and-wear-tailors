/**
 * Tests for all Zod validation schemas
 */

import {
  validateUser,
  validateCreateUserInput,
  validateUpdateUserInput,
  validateOrder,
  validateCreateOrderInput,
  validateUpdateOrderInput,
  validateMeasurement,
  validateCreateMeasurementInput,
  validateFabric,
  validateCreateFabricInput,
  validateStyle,
  validateCreateStyleInput,
  validateAppointment,
  validateCreateAppointmentInput,
  validateInvoice,
  validateCreateInvoiceInput,
  validateNotification,
  validateCreateNotificationInput,
  validateFeedback,
  validateCreateFeedbackInput,
} from '../schemas'

import { mockData } from '../utils/mockData'

describe('Zod Schema Validation', () => {
  describe('User Schema', () => {
    it('should validate a valid user', () => {
      const user = mockData.user()
      expect(() => validateUser(user)).not.toThrow()
    })

    it('should reject invalid email', () => {
      const user = mockData.user({ email: 'invalid-email' })
      expect(() => validateUser(user)).toThrow()
    })

    it('should reject invalid UUID', () => {
      const user = mockData.user({ id: 'invalid-uuid' })
      expect(() => validateUser(user)).toThrow()
    })

    it('should validate create user input', () => {
      const input = {
        email: 'test@example.com',
        role: 'client' as const,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      }
      expect(() => validateCreateUserInput(input)).not.toThrow()
    })

    it('should validate update user input', () => {
      const input = {
        profile: {
          firstName: 'Jane',
        },
        status: 'active' as const,
      }
      expect(() => validateUpdateUserInput(input)).not.toThrow()
    })
  })

  describe('Order Schema', () => {
    it('should validate a valid order', () => {
      const order = mockData.order()
      expect(() => validateOrder(order)).not.toThrow()
    })

    it('should reject order without items', () => {
      const order = mockData.order({ items: [] })
      expect(() => validateOrder(order)).toThrow()
    })

    it('should reject negative pricing', () => {
      const order = mockData.order({
        pricing: {
          subtotal: -100,
          tax: 0,
          discount: 0,
          shipping: 0,
          total: -100,
          currency: 'USD',
        },
      })
      expect(() => validateOrder(order)).toThrow()
    })

    it('should validate create order input', () => {
      const input = {
        clientId: '12345678-1234-4234-8234-123456789012',
        items: [
          {
            styleId: '12345678-1234-4234-8234-123456789012',
            fabricId: '12345678-1234-4234-8234-123456789012',
            quantity: 1,
            measurements: { chest: 100 },
            customizations: [],
            unitPrice: 200,
          },
        ],
      }
      expect(() => validateCreateOrderInput(input)).not.toThrow()
    })
  })

  describe('Measurement Schema', () => {
    it('should validate a valid measurement', () => {
      const measurement = mockData.measurement()
      expect(() => validateMeasurement(measurement)).not.toThrow()
    })

    it('should reject measurement without garment types', () => {
      const measurement = mockData.measurement({ garmentTypes: [] })
      expect(() => validateMeasurement(measurement)).toThrow()
    })

    it('should reject negative measurement values', () => {
      const measurement = mockData.measurement({
        standardMeasurements: {
          chest: { value: -50, unit: 'cm' },
        },
      })
      expect(() => validateMeasurement(measurement)).toThrow()
    })

    it('should validate create measurement input', () => {
      const input = {
        clientId: '12345678-1234-4234-8234-123456789012',
        garmentTypes: ['shirt' as const],
        standardMeasurements: {
          chest: { value: 100, unit: 'cm' as const },
        },
        takenBy: '12345678-1234-4234-8234-123456789012',
      }
      expect(() => validateCreateMeasurementInput(input)).not.toThrow()
    })
  })

  describe('Fabric Schema', () => {
    it('should validate a valid fabric', () => {
      const fabric = mockData.fabric()
      expect(() => validateFabric(fabric)).not.toThrow()
    })

    it('should reject invalid color code', () => {
      const fabric = mockData.fabric({
        colors: {
          primary: 'Blue',
          colorCode: 'invalid-color',
          colorName: 'Blue',
        },
      })
      expect(() => validateFabric(fabric)).toThrow()
    })

    it('should reject negative inventory', () => {
      const fabric = mockData.fabric({
        inventory: {
          totalQuantity: -10,
          availableQuantity: -5,
          reservedQuantity: 0,
          unit: 'meters',
          minimumStock: 10,
          reorderPoint: 20,
        },
      })
      expect(() => validateFabric(fabric)).toThrow()
    })

    it('should validate create fabric input', () => {
      const input = {
        name: 'Test Fabric',
        description: 'A test fabric',
        category: 'cotton' as const,
        material: '100% Cotton',
        properties: {
          weight: 'medium' as const,
          pattern: 'solid' as const,
          stretch: false,
          breathable: true,
          washable: true,
          dryCleanOnly: false,
          fadeResistant: true,
          wrinkleResistant: false,
        },
        colors: {
          primary: 'Blue',
          colorCode: '#0000FF',
          colorName: 'Blue',
        },
        inventory: {
          totalQuantity: 100,
          availableQuantity: 80,
          unit: 'meters' as const,
          minimumStock: 10,
          reorderPoint: 20,
        },
        pricing: {
          basePrice: 50,
          currency: 'USD',
          pricePerUnit: 50,
        },
        supplier: {
          id: '12345678-1234-4234-8234-123456789012',
          name: 'Test Supplier',
          contactInfo: {
            email: 'supplier@test.com',
            phone: '+1-555-0100',
            address: '123 Test St',
          },
          leadTime: 14,
          minimumOrder: 10,
        },
      }
      expect(() => validateCreateFabricInput(input)).not.toThrow()
    })
  })

  describe('Style Schema', () => {
    it('should validate a valid style', () => {
      const style = mockData.style()
      expect(() => validateStyle(style)).not.toThrow()
    })

    it('should reject style without required measurements', () => {
      const style = mockData.style({
        measurements: {
          required: [],
          optional: ['hips'],
          critical: [],
        },
      })
      expect(() => validateStyle(style)).toThrow()
    })

    it('should reject negative pricing', () => {
      const style = mockData.style({
        pricing: {
          basePrice: -100,
          currency: 'USD',
          laborHours: 8,
          difficultyMultiplier: 1.0,
          rushOrderMultiplier: 1.5,
        },
      })
      expect(() => validateStyle(style)).toThrow()
    })

    it('should validate create style input', () => {
      const input = {
        name: 'Test Style',
        description: 'A test style',
        category: 'formal' as const,
        complexity: 'basic' as const,
        gender: 'unisex' as const,
        season: 'all_season' as const,
        measurements: {
          required: ['chest', 'waist'],
          optional: ['hips'],
          critical: ['chest'],
        },
        fabricRequirements: {
          recommendedTypes: ['cotton'],
          unsuitableTypes: ['denim'],
          minimumQuantity: 2,
          unit: 'meters' as const,
          properties: {},
        },
        instructions: {
          cutting: ['Cut carefully'],
          stitching: ['Use strong thread'],
          fitting: ['Check fit'],
          finishing: ['Press well'],
          qualityChecks: ['Final inspection'],
        },
        pricing: {
          basePrice: 300,
          currency: 'USD',
          laborHours: 12,
          difficultyMultiplier: 1.2,
          rushOrderMultiplier: 1.5,
        },
        estimatedCompletionDays: 14,
        createdBy: '12345678-1234-4234-8234-123456789012',
      }
      expect(() => validateCreateStyleInput(input)).not.toThrow()
    })
  })

  describe('Appointment Schema', () => {
    it('should validate a valid appointment', () => {
      const appointment = mockData.appointment()
      expect(() => validateAppointment(appointment)).not.toThrow()
    })

    it('should reject appointment with negative duration', () => {
      const appointment = mockData.appointment({
        services: {
          primaryService: 'consultation',
          additionalServices: [],
          estimatedDuration: -60,
          requirements: [],
        },
      })
      expect(() => validateAppointment(appointment)).toThrow()
    })

    it('should validate create appointment input', () => {
      const input = {
        clientId: '12345678-1234-4234-8234-123456789012',
        tailorId: '12345678-1234-4234-8234-123456789012',
        type: 'consultation' as const,
        services: {
          primaryService: 'consultation' as const,
          additionalServices: [],
          requirements: [],
        },
        scheduledAt: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        location: {
          type: 'shop' as const,
        },
      }
      expect(() => validateCreateAppointmentInput(input)).not.toThrow()
    })
  })

  describe('Invoice Schema', () => {
    it('should validate a valid invoice', () => {
      const invoice = mockData.invoice()
      expect(() => validateInvoice(invoice)).not.toThrow()
    })

    it('should reject invoice without line items', () => {
      const invoice = mockData.invoice({ lineItems: [] })
      expect(() => validateInvoice(invoice)).toThrow()
    })

    it('should reject negative amounts', () => {
      const invoice = mockData.invoice({
        totals: {
          subtotal: -100,
          discountAmount: 0,
          taxAmount: 0,
          total: -100,
          amountPaid: 0,
          amountDue: -100,
          currency: 'USD',
        },
      })
      expect(() => validateInvoice(invoice)).toThrow()
    })

    it('should validate create invoice input', () => {
      const input = {
        orderId: '12345678-1234-4234-8234-123456789012',
        clientId: '12345678-1234-4234-8234-123456789012',
        tailorId: '12345678-1234-4234-8234-123456789012',
        lineItems: [
          {
            description: 'Custom Suit',
            quantity: 1,
            unitPrice: 500,
            taxable: true,
            category: 'service' as const,
          },
        ],
        terms: {
          paymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          paymentTerms: 'Net 30',
          lateFeesApply: false,
        },
        billingAddress: {
          name: 'John Doe',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'USA',
        },
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
      expect(() => validateCreateInvoiceInput(input)).not.toThrow()
    })
  })

  describe('Notification Schema', () => {
    it('should validate a valid notification', () => {
      const notification = mockData.notification()
      expect(() => validateNotification(notification)).not.toThrow()
    })

    it('should reject notification with empty title', () => {
      const notification = mockData.notification({ title: '' })
      expect(() => validateNotification(notification)).toThrow()
    })

    it('should reject notification with overly long message', () => {
      const notification = mockData.notification({ message: 'x'.repeat(501) })
      expect(() => validateNotification(notification)).toThrow()
    })

    it('should validate create notification input', () => {
      const input = {
        userId: '12345678-1234-4234-8234-123456789012',
        type: 'order_update' as const,
        channel: 'push' as const,
        title: 'Order Update',
        message: 'Your order has been updated',
      }
      expect(() => validateCreateNotificationInput(input)).not.toThrow()
    })
  })

  describe('Feedback Schema', () => {
    it('should validate a valid feedback', () => {
      const feedback = mockData.feedback()
      expect(() => validateFeedback(feedback)).not.toThrow()
    })

    it('should reject feedback with invalid rating', () => {
      const feedback = mockData.feedback({
        rating: {
          overall: 6, // Invalid rating > 5
          quality: 4,
          timeliness: 4,
          communication: 4,
          value: 4,
        },
      })
      expect(() => validateFeedback(feedback)).toThrow()
    })

    it('should reject feedback with overly long comment', () => {
      const feedback = mockData.feedback({ comment: 'x'.repeat(1001) })
      expect(() => validateFeedback(feedback)).toThrow()
    })

    it('should validate create feedback input', () => {
      const input = {
        clientId: '12345678-1234-4234-8234-123456789012',
        tailorId: '12345678-1234-4234-8234-123456789012',
        type: 'review' as const,
        rating: {
          overall: 5,
          quality: 5,
          timeliness: 4,
          communication: 5,
          value: 4,
        },
        comment: 'Excellent service!',
        metadata: {
          source: 'app' as const,
        },
      }
      expect(() => validateCreateFeedbackInput(input)).not.toThrow()
    })
  })
})