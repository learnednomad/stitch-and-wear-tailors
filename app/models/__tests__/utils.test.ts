/**
 * Tests for utility functions
 */

import {
  transformToUser,
  transformCreateInputs,
  formatDateForModel,
  generateId,
  safeTransform,
  batchTransform,
} from "../utils/transformers"

import {
  serializeForApi,
  deserializeFromApi,
  serializeForStorage,
  deserializeFromStorage,
  createSummary,
  cloneModel,
  mergeModelUpdate,
} from "../utils/serializers"

import {
  businessRules,
  validateMultiple,
  isFutureDate,
  isBusinessHours,
  validateMeasurementRange,
} from "../utils/validators"

import { mockData, generateMockArray, generateRelatedData } from "../utils/mockData"

import type { User, Order, OrderStatus } from "../types"

describe("Utility Functions", () => {
  describe("Transformers", () => {
    it("should transform valid data to User model", () => {
      const userData = mockData.user()
      const transformedUser = transformToUser(userData)
      expect(transformedUser).toMatchObject(userData)
    })

    it("should throw error for invalid data", () => {
      const invalidData = { id: "invalid" }
      expect(() => transformToUser(invalidData)).toThrow()
    })

    it("should format dates correctly", () => {
      const date = new Date("2023-01-01T12:00:00Z")
      const formatted = formatDateForModel(date)
      expect(formatted).toBe("2023-01-01T12:00:00.000Z")
    })

    it("should format date strings correctly", () => {
      const dateString = "2023-01-01T12:00:00Z"
      const formatted = formatDateForModel(dateString)
      expect(formatted).toBe("2023-01-01T12:00:00.000Z")
    })

    it("should generate valid UUIDs", () => {
      const id = generateId()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(uuidRegex.test(id)).toBe(true)
    })

    it("should safely transform with error handling", () => {
      const invalidTransformer = () => {
        throw new Error("Transform failed")
      }
      const result = safeTransform(invalidTransformer, {})
      expect(result).toBeNull()
    })

    it("should safely transform with fallback", () => {
      const invalidTransformer = () => {
        throw new Error("Transform failed")
      }
      const fallback = { id: "fallback" }
      const result = safeTransform(invalidTransformer, {}, fallback)
      expect(result).toEqual(fallback)
    })

    it("should batch transform arrays", () => {
      const validUser = mockData.user()
      const invalidUser = { invalid: "data" }
      const dataArray = [validUser, invalidUser, validUser]

      const results = batchTransform(transformToUser, dataArray)
      expect(results).toHaveLength(2) // Only valid transformations
    })

    it("should validate create inputs", () => {
      const userInput = {
        email: "test@example.com",
        role: "client" as const,
        profile: {
          firstName: "John",
          lastName: "Doe",
        },
      }

      const result = transformCreateInputs.user(userInput)
      expect(result).toMatchObject(userInput)
    })
  })

  describe("Serializers", () => {
    it("should serialize user for API", () => {
      const user = mockData.user()
      const serialized = serializeForApi.user(user)

      expect(serialized.first_name).toBe(user.profile.firstName)
      expect(serialized.last_name).toBe(user.profile.lastName)
      expect(serialized.email_verified).toBe(user.emailVerified)
      expect(serialized.created_at).toBe(user.createdAt)
    })

    it("should deserialize user from API", () => {
      const apiData = {
        id: "12345678-1234-4234-8234-123456789012",
        email: "test@example.com",
        role: "client",
        status: "active",
        profile: {
          first_name: "John",
          last_name: "Doe",
        },
        preferences: {
          notifications: { email: true, push: true, sms: false },
          language: "en",
          timezone: "UTC",
          currency: "USD",
        },
        email_verified: true,
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
      }

      const user = deserializeFromApi.user(apiData)
      expect(user.profile.firstName).toBe("John")
      expect(user.profile.lastName).toBe("Doe")
      expect(user.emailVerified).toBe(true)
      expect(user.createdAt).toBe("2023-01-01T00:00:00.000Z")
    })

    it("should serialize for storage", () => {
      const user = mockData.user()
      const serialized = serializeForStorage(user)

      expect(typeof serialized).toBe("string")
      expect(JSON.parse(serialized)).toMatchObject(user)
    })

    it("should deserialize from storage", () => {
      const user = mockData.user()
      const serialized = serializeForStorage(user)
      const deserialized = deserializeFromStorage<User>(serialized)

      expect(deserialized).toMatchObject(user)
    })

    it("should throw error for invalid JSON in storage", () => {
      expect(() => deserializeFromStorage("invalid json")).toThrow()
    })

    it("should create user summary", () => {
      const user = mockData.user()
      const summary = createSummary.user(user)

      expect(summary).toHaveProperty("id", user.id)
      expect(summary).toHaveProperty("name", `${user.profile.firstName} ${user.profile.lastName}`)
      expect(summary).toHaveProperty("role", user.role)
    })

    it("should create order summary", () => {
      const order = mockData.order()
      const summary = createSummary.order(order)

      expect(summary).toHaveProperty("id", order.id)
      expect(summary).toHaveProperty("orderNumber", order.orderNumber)
      expect(summary).toHaveProperty("total", order.pricing.total)
      expect(summary).toHaveProperty("itemCount", order.items.length)
    })

    it("should clone model", () => {
      const user = mockData.user()
      const cloned = cloneModel(user)

      expect(cloned).toEqual(user)
      expect(cloned).not.toBe(user) // Different object reference
    })

    it("should merge model updates", () => {
      const user = mockData.user()
      const updates = { status: "inactive" as const }
      const merged = mergeModelUpdate(user, updates)

      expect(merged.status).toBe("inactive")
      expect(merged.updatedAt).toBeDefined()
      expect(new Date(merged.updatedAt).getTime()).toBeGreaterThan(
        new Date(user.updatedAt).getTime(),
      )
    })
  })

  describe("Validators", () => {
    describe("Business Rules", () => {
      it("should validate valid order status transition", () => {
        const result = businessRules.orderStatusTransition("pending", "confirmed")
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it("should reject invalid order status transition", () => {
        const result = businessRules.orderStatusTransition("delivered", "pending")
        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].code).toBe("INVALID_STATUS_TRANSITION")
      })

      it("should detect appointment conflicts", () => {
        const newAppointment = {
          tailorId: "tailor-1",
          startTime: "2023-12-01T10:00:00Z",
          endTime: "2023-12-01T11:00:00Z",
        }

        const existingAppointments = [
          {
            tailorId: "tailor-1",
            startTime: "2023-12-01T10:30:00Z",
            endTime: "2023-12-01T11:30:00Z",
            status: "scheduled" as const,
          },
        ]

        const result = businessRules.appointmentConflict(newAppointment, existingAppointments)
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe("APPOINTMENT_CONFLICT")
      })

      it("should allow appointment with different tailor", () => {
        const newAppointment = {
          tailorId: "tailor-1",
          startTime: "2023-12-01T10:00:00Z",
          endTime: "2023-12-01T11:00:00Z",
        }

        const existingAppointments = [
          {
            tailorId: "tailor-2", // Different tailor
            startTime: "2023-12-01T10:30:00Z",
            endTime: "2023-12-01T11:30:00Z",
            status: "scheduled" as const,
          },
        ]

        const result = businessRules.appointmentConflict(newAppointment, existingAppointments)
        expect(result.valid).toBe(true)
      })

      it("should validate fabric inventory", () => {
        const fabrics = [
          mockData.fabric({
            id: "fabric-1",
            inventory: {
              totalQuantity: 100,
              availableQuantity: 50,
              reservedQuantity: 20,
              unit: "meters",
              minimumStock: 10,
              reorderPoint: 20,
            },
            active: true,
          }),
        ]

        const result = businessRules.fabricInventory("fabric-1", 30, fabrics)
        expect(result.valid).toBe(true)
      })

      it("should reject insufficient fabric inventory", () => {
        const fabrics = [
          mockData.fabric({
            id: "fabric-1",
            inventory: {
              totalQuantity: 100,
              availableQuantity: 10,
              reservedQuantity: 20,
              unit: "meters",
              minimumStock: 10,
              reorderPoint: 20,
            },
            active: true,
          }),
        ]

        const result = businessRules.fabricInventory("fabric-1", 30, fabrics)
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe("INSUFFICIENT_INVENTORY")
      })

      it("should validate user permissions", () => {
        const adminUser = mockData.user({ role: "admin" })
        const result = businessRules.userPermissions(adminUser, "order:delete")
        expect(result.valid).toBe(true)
      })

      it("should reject insufficient permissions", () => {
        const clientUser = mockData.user({ role: "client" })
        const result = businessRules.userPermissions(clientUser, "order:delete")
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe("INSUFFICIENT_PERMISSIONS")
      })

      it("should validate invoice calculations", () => {
        const invoice = mockData.invoice({
          lineItems: [
            {
              id: "1",
              description: "Service",
              quantity: 2,
              unitPrice: 100,
              totalPrice: 200,
              taxable: true,
              category: "service",
            },
          ],
          totals: {
            subtotal: 200,
            discountAmount: 0,
            taxAmount: 20,
            total: 220,
            amountPaid: 0,
            amountDue: 220,
            currency: "USD",
          },
        })

        const result = businessRules.invoiceCalculations(invoice)
        expect(result.valid).toBe(true)
      })

      it("should reject incorrect invoice calculations", () => {
        const invoice = mockData.invoice({
          lineItems: [
            {
              id: "1",
              description: "Service",
              quantity: 2,
              unitPrice: 100,
              totalPrice: 150, // Incorrect total
              taxable: true,
              category: "service",
            },
          ],
          totals: {
            subtotal: 200,
            discountAmount: 0,
            taxAmount: 20,
            total: 220,
            amountPaid: 0,
            amountDue: 220,
            currency: "USD",
          },
        })

        const result = businessRules.invoiceCalculations(invoice)
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe("INCORRECT_LINE_TOTAL")
      })
    })

    it("should validate multiple validation results", () => {
      const validResult = { valid: true, errors: [] }
      const invalidResult = {
        valid: false,
        errors: [{ field: "test", message: "Error", code: "TEST_ERROR" }],
      }

      const combined = validateMultiple(validResult, invalidResult)
      expect(combined.valid).toBe(false)
      expect(combined.errors).toHaveLength(1)
    })

    it("should check if date is in future", () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      expect(isFutureDate(futureDate)).toBe(true)
      expect(isFutureDate(pastDate)).toBe(false)
    })

    it("should check business hours", () => {
      // Tuesday at 2 PM (using local time format to avoid timezone issues)
      const businessDay = new Date(2023, 11, 5, 14, 0, 0) // Dec 5, 2023, 2 PM
      // Sunday at 2 PM
      const weekend = new Date(2023, 11, 3, 14, 0, 0) // Dec 3, 2023, 2 PM
      // Tuesday at 8 PM (after business hours)
      const afterHours = new Date(2023, 11, 5, 20, 0, 0) // Dec 5, 2023, 8 PM

      expect(isBusinessHours(businessDay.toISOString())).toBe(true)
      expect(isBusinessHours(weekend.toISOString())).toBe(false)
      expect(isBusinessHours(afterHours.toISOString())).toBe(false)
    })

    it("should validate measurement ranges", () => {
      const validChest = validateMeasurementRange("chest", 100, "cm")
      expect(validChest.valid).toBe(true)

      const invalidChest = validateMeasurementRange("chest", 200, "cm")
      expect(invalidChest.valid).toBe(false)
      expect(invalidChest.errors[0].code).toBe("MEASUREMENT_OUT_OF_RANGE")

      // Unknown measurement should pass
      const unknownMeasurement = validateMeasurementRange("unknown", 500, "cm")
      expect(unknownMeasurement.valid).toBe(true)
    })
  })

  describe("Mock Data", () => {
    it("should generate valid user mock data", () => {
      const user = mockData.user()
      expect(user).toHaveProperty("id")
      expect(user).toHaveProperty("email")
      expect(user).toHaveProperty("role")
      expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    })

    it("should generate mock data with overrides", () => {
      const user = mockData.user({ role: "admin" })
      expect(user.role).toBe("admin")
    })

    it("should generate mock arrays", () => {
      const users = generateMockArray(mockData.user, 5)
      expect(users).toHaveLength(5)
      users.forEach((user) => {
        expect(user).toHaveProperty("id")
        expect(user).toHaveProperty("email")
      })
    })

    it("should generate related data", () => {
      const clientId = "12345678-1234-4234-8234-123456789012"
      const orders = generateRelatedData.ordersForClient(clientId, 3)

      expect(orders).toHaveLength(3)
      orders.forEach((order) => {
        expect(order.clientId).toBe(clientId)
      })
    })

    it("should generate valid order mock data", () => {
      const order = mockData.order()
      expect(order).toHaveProperty("id")
      expect(order).toHaveProperty("orderNumber")
      expect(order.items).toHaveLength(1)
      expect(order.pricing.total).toBeGreaterThan(0)
    })

    it("should generate valid measurement mock data", () => {
      const measurement = mockData.measurement()
      expect(measurement).toHaveProperty("id")
      expect(measurement.garmentTypes).toContain("shirt")
      expect(measurement.standardMeasurements.chest?.value).toBeGreaterThan(0)
    })

    it("should generate valid fabric mock data", () => {
      const fabric = mockData.fabric()
      expect(fabric).toHaveProperty("id")
      expect(fabric.inventory.availableQuantity).toBeGreaterThanOrEqual(0)
      expect(fabric.pricing.pricePerUnit).toBeGreaterThan(0)
    })

    it("should generate all model types without errors", () => {
      expect(() => mockData.user()).not.toThrow()
      expect(() => mockData.order()).not.toThrow()
      expect(() => mockData.measurement()).not.toThrow()
      expect(() => mockData.fabric()).not.toThrow()
      expect(() => mockData.style()).not.toThrow()
      expect(() => mockData.appointment()).not.toThrow()
      expect(() => mockData.invoice()).not.toThrow()
      expect(() => mockData.notification()).not.toThrow()
      expect(() => mockData.feedback()).not.toThrow()
    })
  })
})
