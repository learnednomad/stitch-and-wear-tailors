/**
 * Enhanced AppointmentStore with Hybrid Zod + MST Validation Pipeline
 * Implements AI collaborators' recommended approach
 */

import { types, flow, Instance, SnapshotOut, applySnapshot } from "mobx-state-tree"
import { z } from "zod"
import { createAsyncAction, createCollectionModel, generateId, createTimestamp } from "../mst"
import { 
  AppointmentSchema, 
  CreateAppointmentInputSchema,
  UpdateAppointmentInputSchema,
  AppointmentReminderSchema,
  AppointmentLocationSchema,
  AppointmentServicesSchema,
  AppointmentPreparationSchema,
  AppointmentOutcomeSchema,
  AppointmentAvailabilitySchema,
  type AppointmentSchemaType,
  type CreateAppointmentInputSchemaType,
  type UpdateAppointmentInputSchemaType
} from "../schemas/AppointmentSchema"

// ===== MODULAR MST MODELS FROM ZOD SCHEMAS =====

/**
 * Reminder model - matches Zod AppointmentReminderSchema
 */
const ReminderModel = types.model("Reminder", {
  type: types.enumeration("ReminderType", ["email", "sms", "push", "call"]),
  timeBeforeMinutes: types.number,
  sent: types.boolean,
  sentAt: types.maybeNull(types.string), // ISO datetime
})

/**
 * Location model - matches Zod AppointmentLocationSchema
 */
const LocationModel = types.model("Location", {
  type: types.enumeration("LocationType", ["shop", "client_home", "virtual"]),
  address: types.maybeNull(types.model("Address", {
    street: types.string,
    city: types.string,
    state: types.string,
    zipCode: types.string,
    country: types.string,
  })),
  meetingLink: types.maybeNull(types.string),
  instructions: types.maybeNull(types.string),
})

/**
 * Services model - matches Zod AppointmentServicesSchema
 */
const ServicesModel = types.model("Services", {
  primaryService: types.enumeration("AppointmentType", [
    "consultation", "measurement", "fitting", "delivery", "alteration", "design_review"
  ]),
  additionalServices: types.array(types.enumeration("AppointmentType", [
    "consultation", "measurement", "fitting", "delivery", "alteration", "design_review"
  ])),
  estimatedDuration: types.number,
  requirements: types.array(types.string),
  notes: types.maybeNull(types.string),
})

/**
 * Preparation model - matches Zod AppointmentPreparationSchema
 */
const PreparationModel = types.model("Preparation", {
  clientInstructions: types.array(types.string),
  tailorInstructions: types.array(types.string),
  materialsNeeded: types.array(types.string),
})

/**
 * Outcome model - matches Zod AppointmentOutcomeSchema
 */
const OutcomeModel = types.model("Outcome", {
  completed: types.boolean,
  nextSteps: types.array(types.string),
  followUpRequired: types.boolean,
  followUpDate: types.maybeNull(types.string), // ISO datetime
  issues: types.array(types.string),
})

/**
 * Main Appointment model with validation pipeline
 */
const AppointmentModel = types
  .model("Appointment", {
    id: types.identifier,
    clientId: types.string,
    tailorId: types.string,
    orderId: types.maybeNull(types.string),
    type: types.enumeration("AppointmentType", [
      "consultation", "measurement", "fitting", "delivery", "alteration", "design_review"
    ]),
    status: types.enumeration("AppointmentStatus", [
      "scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", "rescheduled"
    ]),
    services: ServicesModel,
    scheduledAt: types.string, // ISO datetime
    startTime: types.string, // ISO datetime
    endTime: types.string, // ISO datetime
    actualStartTime: types.maybeNull(types.string),
    actualEndTime: types.maybeNull(types.string),
    location: LocationModel,
    reminders: types.array(ReminderModel),
    notes: types.maybeNull(types.string),
    clientNotes: types.maybeNull(types.string),
    tailorNotes: types.maybeNull(types.string),
    preparation: PreparationModel,
    outcome: types.maybeNull(OutcomeModel),
    cancellationReason: types.maybeNull(types.string),
    rescheduledFrom: types.maybeNull(types.string),
    rescheduledTo: types.maybeNull(types.string),
    createdAt: types.string,
    updatedAt: types.string,
  })
  .actions(self => ({
    /**
     * Update appointment with Zod validation
     */
    updateWithValidation(updates: unknown) {
      try {
        // Validate updates with Zod first
        const validatedUpdates = UpdateAppointmentInputSchema.parse(updates);
        
        // Apply validated changes to MST model
        Object.entries(validatedUpdates).forEach(([key, value]) => {
          if (value !== undefined && key in self) {
            (self as any)[key] = value;
          }
        });
        
        self.updatedAt = new Date().toISOString();
        return { success: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Appointment validation failed:", error.errors);
          return { 
            success: false, 
            errors: error.errors.map(e => ({ path: e.path, message: e.message }))
          };
        }
        throw error;
      }
    },

    /**
     * Add reminder with validation
     */
    addReminderWithValidation(reminderData: unknown) {
      try {
        const validatedReminder = AppointmentReminderSchema.parse(reminderData);
        self.reminders.push(validatedReminder);
        return { success: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return { success: false, errors: error.errors };
        }
        throw error;
      }
    },

    /**
     * Update location with validation
     */
    updateLocationWithValidation(locationData: unknown) {
      try {
        const validatedLocation = AppointmentLocationSchema.parse(locationData);
        // Convert to MST snapshot format and apply
        applySnapshot(self.location, validatedLocation);
        return { success: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return { success: false, errors: error.errors };
        }
        throw error;
      }
    }
  }))
  .views(self => ({
    /**
     * Check if appointment is active
     */
    get isActive() {
      return ["confirmed", "in_progress"].includes(self.status);
    },

    /**
     * Check if appointment is overdue
     */
    get isOverdue() {
      return new Date() > new Date(self.startTime) && self.status === "scheduled";
    },

    /**
     * Get duration in minutes
     */
    get durationMinutes() {
      const start = new Date(self.startTime);
      const end = new Date(self.endTime);
      return Math.round((end.getTime() - start.getTime()) / 60000);
    },

    /**
     * Get appointment as validated Zod type
     */
    get asValidatedAppointment(): AppointmentSchemaType {
      try {
        return AppointmentSchema.parse(self);
      } catch (error) {
        console.error("MST model doesn't match Zod schema:", error);
        throw new Error("Invalid appointment state");
      }
    }
  }));

/**
 * Time slot model for availability
 */
const TimeSlotModel = types.model("TimeSlot", {
  startTime: types.string, // ISO datetime
  endTime: types.string, // ISO datetime
  duration: types.number, // minutes
})

/**
 * Availability model
 */
const AvailabilityModel = types.model("Availability", {
  tailorId: types.string,
  date: types.string, // ISO datetime
  availableSlots: types.array(TimeSlotModel),
  bookedSlots: types.array(types.model("BookedSlot", {
    startTime: types.string,
    endTime: types.string,
    appointmentId: types.string,
  })),
})

/**
 * Collections
 */
const AppointmentsCollectionModel = createCollectionModel("AppointmentsCollection", AppointmentModel);
const AvailabilityCollectionModel = createCollectionModel("AvailabilityCollection", AvailabilityModel);

/**
 * Enhanced AppointmentStore with hybrid validation
 */
export const AppointmentStoreEnhancedModel = types
  .model("AppointmentStoreEnhanced", {
    // Collections
    appointments: types.optional(AppointmentsCollectionModel, {}),
    availability: types.optional(AvailabilityCollectionModel, {}),
    
    // Current state
    currentAppointment: types.maybeNull(AppointmentModel),
    selectedDate: types.string,
    selectedTailorId: types.maybeNull(types.string),
    
    // UI state
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),
    
    // Booking form state
    bookingForm: types.model("BookingForm", {
      clientId: types.maybeNull(types.string),
      tailorId: types.maybeNull(types.string),
      type: types.maybeNull(types.enumeration("AppointmentType", [
        "consultation", "measurement", "fitting", "delivery", "alteration", "design_review"
      ])),
      selectedSlot: types.maybeNull(TimeSlotModel),
      notes: types.maybeNull(types.string),
    }),
  })
  .actions(self => {
    // Helper actions
    const setLoading = (loading: boolean) => { self.isLoading = loading; };
    const setError = (error: string | null) => { self.error = error; };
    const clearError = () => { self.error = null; };

    return {
      setLoading,
      setError,
      clearError,

      /**
       * Create appointment with full Zod validation pipeline
       */
      createAppointmentWithValidation(appointmentData: unknown) {
        try {
          // Step 1: Validate incoming data with Zod
          const validatedData = CreateAppointmentInputSchema.parse(appointmentData);
          
          // Step 2: Transform to full appointment object
          const fullAppointmentData: AppointmentSchemaType = {
            ...validatedData,
            id: generateId(),
            status: "scheduled",
            actualStartTime: null,
            actualEndTime: null,
            outcome: null,
            cancellationReason: null,
            rescheduledFrom: null,
            rescheduledTo: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Step 3: Validate complete appointment with full schema
          const completeValidated = AppointmentSchema.parse(fullAppointmentData);
          
          // Step 4: Create MST model from validated data
          const appointmentModel = AppointmentModel.create(completeValidated);
          
          // Step 5: Add to collection
          self.appointments.addItem(appointmentModel);
          
          return { success: true, appointment: appointmentModel };
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessage = `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
            self.setError(errorMessage);
            return { success: false, errors: error.errors };
          }
          throw error;
        }
      },

      /**
       * Update appointment with validation
       */
      updateAppointmentWithValidation(appointmentId: string, updates: unknown) {
        const appointment = self.appointments.findById(appointmentId);
        if (!appointment) {
          self.setError("Appointment not found");
          return { success: false, error: "Appointment not found" };
        }

        const result = appointment.updateWithValidation(updates);
        if (!result.success) {
          self.setError("Validation failed");
        }
        return result;
      },

      /**
       * Load appointments from API with validation
       */
      loadAppointmentsWithValidation: flow(function* (params: any = {}) {
        self.setLoading(true);
        self.clearError();

        try {
          // Simulate API call
          const response = yield fetch(`/api/appointments`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch appointments');
          }

          const rawData = yield response.json();
          
          // Validate each appointment with Zod before adding to MST
          const validatedAppointments: AppointmentSchemaType[] = [];
          const validationErrors: string[] = [];

          for (const appointmentData of rawData.appointments || []) {
            try {
              const validated = AppointmentSchema.parse(appointmentData);
              validatedAppointments.push(validated);
            } catch (error) {
              if (error instanceof z.ZodError) {
                validationErrors.push(`Appointment ${appointmentData.id}: ${error.errors[0]?.message}`);
              }
            }
          }

          // Apply validated data to MST store
          self.appointments.setItems(validatedAppointments);
          
          if (validationErrors.length > 0) {
            console.warn("Some appointments failed validation:", validationErrors);
          }

          self.lastFetched = new Date().toISOString();
          return { success: true, count: validatedAppointments.length };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          self.setError(errorMessage);
          return { success: false, error: errorMessage };
        } finally {
          self.setLoading(false);
        }
      }),

      /**
       * Load availability with validation
       */
      loadAvailabilityWithValidation: flow(function* (tailorId: string, date: string) {
        self.setLoading(true);
        self.clearError();

        try {
          const response = yield fetch(`/api/availability/${tailorId}?date=${date}`);
          if (!response.ok) {
            throw new Error('Failed to fetch availability');
          }

          const rawData = yield response.json();
          
          // Validate with Zod
          const validated = AppointmentAvailabilitySchema.parse(rawData);
          
          // Create MST model
          const availabilityModel = AvailabilityModel.create({
            tailorId: validated.tailorId,
            date: validated.date,
            availableSlots: validated.availableSlots,
            bookedSlots: validated.bookedSlots,
          });

          // Update collection
          const existingIndex = self.availability.items.findIndex(
            (item: any) => item.tailorId === tailorId && item.date === date
          );

          if (existingIndex >= 0) {
            self.availability.items[existingIndex] = availabilityModel;
          } else {
            self.availability.addItem(availabilityModel);
          }

          return { success: true };

        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessage = `Availability validation failed: ${error.errors[0]?.message}`;
            self.setError(errorMessage);
            return { success: false, errors: error.errors };
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          self.setError(errorMessage);
          return { success: false, error: errorMessage };
        } finally {
          self.setLoading(false);
        }
      }),

      /**
       * Snapshot validation for persistence
       */
      validateAndApplySnapshot(snapshot: unknown) {
        try {
          // Validate the snapshot structure
          const validatedSnapshot = z.object({
            appointments: z.object({
              items: z.array(AppointmentSchema)
            }).optional(),
            availability: z.object({
              items: z.array(AppointmentAvailabilitySchema)
            }).optional(),
            // ... other fields
          }).parse(snapshot);

          // Apply the validated snapshot
          applySnapshot(self, validatedSnapshot);
          return { success: true };

        } catch (error) {
          if (error instanceof z.ZodError) {
            console.error("Snapshot validation failed:", error.errors);
            return { success: false, errors: error.errors };
          }
          throw error;
        }
      },

      /**
       * Update booking form
       */
      updateBookingForm(updates: Partial<typeof self.bookingForm>) {
        Object.assign(self.bookingForm, updates);
      },

      /**
       * Clear booking form
       */
      clearBookingForm() {
        self.bookingForm.clientId = null;
        self.bookingForm.tailorId = null;
        self.bookingForm.type = null;
        self.bookingForm.selectedSlot = null;
        self.bookingForm.notes = null;
      },
    };
  })
  .views(self => ({
    /**
     * Get appointments by status
     */
    getAppointmentsByStatus(status: string) {
      return self.appointments.items.filter((apt: any) => apt.status === status);
    },

    /**
     * Get today's appointments
     */
    get todaysAppointments() {
      const today = new Date().toISOString().split('T')[0];
      return self.appointments.items.filter((apt: any) => 
        apt.scheduledAt.startsWith(today) && apt.status !== 'cancelled'
      );
    },

    /**
     * Get upcoming appointments
     */
    get upcomingAppointments() {
      const now = new Date();
      return self.appointments.items.filter((apt: any) => {
        const appointmentDate = new Date(apt.scheduledAt);
        return appointmentDate > now && apt.status !== 'cancelled';
      });
    },

    /**
     * Get availability for selected date and tailor
     */
    get currentAvailability() {
      if (!self.selectedTailorId || !self.selectedDate) return null;
      
      return self.availability.items.find((item: any) => 
        item.tailorId === self.selectedTailorId && 
        item.date === self.selectedDate
      );
    },

    /**
     * Check if booking form is valid
     */
    get isBookingFormValid() {
      const form = self.bookingForm;
      return !!(form.clientId && form.tailorId && form.type && form.selectedSlot);
    },

    /**
     * Get validated snapshot for persistence
     */
    get validatedSnapshot() {
      try {
        const snapshot = {
          appointments: {
            items: self.appointments.items.map((apt: any) => apt.asValidatedAppointment)
          },
          // Add other fields as needed
        };
        return { success: true, snapshot };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
      }
    }
  }));

/**
 * Type definitions
 */
export interface AppointmentStoreEnhanced extends Instance<typeof AppointmentStoreEnhancedModel> {}
export interface AppointmentStoreEnhancedSnapshot extends SnapshotOut<typeof AppointmentStoreEnhancedModel> {}

/**
 * Factory function to create store with default state
 */
export function createAppointmentStoreEnhanced() {
  return AppointmentStoreEnhancedModel.create({
    selectedDate: new Date().toISOString().split('T')[0],
    bookingForm: {
      clientId: null,
      tailorId: null,
      type: null,
      selectedSlot: null,
      notes: null,
    }
  });
}