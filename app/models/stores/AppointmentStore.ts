/**
 * AppointmentStore - Appointment Scheduling and Calendar Management
 * Manages appointment booking, scheduling, availability, and calendar integration
 */

import { types, flow, Instance, SnapshotOut } from "mobx-state-tree"
import { createAsyncAction, createCollectionModel, generateId, createTimestamp } from "../mst"
import { Appointment, AppointmentStatus, AppointmentType } from "../types"
import { validateAppointment } from "../schemas"

/**
 * MST model for time slot
 */
const TimeSlotModel = types.model("TimeSlot", {
  start: types.string, // ISO datetime
  end: types.string,   // ISO datetime
  isAvailable: types.boolean,
  isBooked: types.boolean,
  appointmentId: types.maybeNull(types.string),
})

/**
 * MST model for availability schedule
 */
const AvailabilityScheduleModel = types.model("AvailabilitySchedule", {
  tailorId: types.string,
  date: types.string, // ISO date
  timeSlots: types.array(TimeSlotModel),
  isWorkingDay: types.boolean,
  workingHours: types.model("WorkingHours", {
    start: types.string, // HH:mm format
    end: types.string,   // HH:mm format
    breakStart: types.maybeNull(types.string),
    breakEnd: types.maybeNull(types.string),
  }),
  specialNotes: types.maybeNull(types.string),
  lastUpdated: types.string,
})

/**
 * MST model for appointment reminder
 */
const ReminderModel = types.model("Reminder", {
  id: types.string,
  appointmentId: types.string,
  type: types.enumeration("ReminderType", ["email", "sms", "push", "call"]),
  scheduledFor: types.string, // ISO datetime
  message: types.string,
  isSent: types.optional(types.boolean, false),
  sentAt: types.maybeNull(types.string),
  status: types.enumeration("ReminderStatus", ["scheduled", "sent", "failed", "cancelled"]),
  createdAt: types.string,
})

/**
 * Main Appointment model
 */
const AppointmentModel = types.model("Appointment", {
  id: types.string,
  clientId: types.string,
  tailorId: types.string,
  
  // Appointment details
  type: types.enumeration("AppointmentType", [
    "consultation", "measurement", "fitting", "delivery", "alteration", "design_review"
  ]),
  status: types.enumeration("AppointmentStatus", [
    "scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", "rescheduled"
  ]),
  
  // Scheduling
  scheduledDate: types.string, // ISO datetime
  duration: types.number, // minutes
  endDate: types.string,   // computed from scheduledDate + duration
  
  // Location and setup
  location: types.model("AppointmentLocation", {
    type: types.enumeration("LocationType", ["studio", "client_home", "virtual", "other"]),
    address: types.maybeNull(types.string),
    room: types.maybeNull(types.string),
    specialInstructions: types.maybeNull(types.string),
  }),
  
  // Purpose and details
  title: types.string,
  description: types.maybeNull(types.string),
  purpose: types.maybeNull(types.string),
  orderId: types.maybeNull(types.string), // linked order if applicable
  
  // Preparation requirements
  requiresMeasurements: types.optional(types.boolean, false),
  requiresFabricSamples: types.optional(types.boolean, false),
  requiresGarmentBringing: types.optional(types.boolean, false),
  preparationNotes: types.maybeNull(types.string),
  
  // Communication
  clientNotes: types.maybeNull(types.string),
  tailorNotes: types.maybeNull(types.string),
  internalNotes: types.maybeNull(types.string),
  
  // Reminders
  reminders: types.array(ReminderModel),
  reminderSettings: types.model("ReminderSettings", {
    emailReminder: types.optional(types.boolean, true),
    smsReminder: types.optional(types.boolean, false),
    pushReminder: types.optional(types.boolean, true),
    reminderTimes: types.array(types.number), // hours before appointment [24, 2]
  }),
  
  // Follow-up
  followUpRequired: types.optional(types.boolean, false),
  followUpDate: types.maybeNull(types.string),
  followUpNotes: types.maybeNull(types.string),
  
  // Outcome
  actualStartTime: types.maybeNull(types.string),
  actualEndTime: types.maybeNull(types.string),
  actualDuration: types.maybeNull(types.number),
  outcome: types.maybeNull(types.string),
  nextSteps: types.maybeNull(types.string),
  
  // Rating and feedback
  clientRating: types.maybeNull(types.number), // 1-5 stars
  clientFeedback: types.maybeNull(types.string),
  tailorRating: types.maybeNull(types.number),
  tailorFeedback: types.maybeNull(types.string),
  
  // Rescheduling history
  originalDate: types.maybeNull(types.string),
  rescheduleCount: types.optional(types.number, 0),
  rescheduleReason: types.maybeNull(types.string),
  
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * Collection model for appointments
 */
const AppointmentsCollectionModel = createCollectionModel("AppointmentsCollection", AppointmentModel)

/**
 * Collection model for availability schedules
 */
const AvailabilityCollectionModel = createCollectionModel("AvailabilityCollection", AvailabilityScheduleModel)

/**
 * Calendar view model
 */
const CalendarViewModel = types.model("CalendarView", {
  currentDate: types.string, // ISO date
  viewMode: types.enumeration("ViewMode", ["day", "week", "month"]),
  selectedTailorId: types.maybeNull(types.string),
  showOnlyAvailable: types.optional(types.boolean, false),
  timeZone: types.string,
})

/**
 * Main AppointmentStore model
 */
export const AppointmentStoreModel = types
  .model("AppointmentStore", {
    // Appointments collection
    appointments: types.optional(AppointmentsCollectionModel, {}),
    
    // Availability schedules
    availabilitySchedules: types.optional(AvailabilityCollectionModel, {}),
    
    // Current appointment being viewed/edited
    currentAppointment: types.maybeNull(AppointmentModel),
    
    // Calendar view state
    calendarView: types.optional(CalendarViewModel, () => CalendarViewModel.create({
      currentDate: new Date().toISOString().split('T')[0],
      viewMode: "week",
      selectedTailorId: null,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })),
    
    // Booking state
    isBookingInProgress: types.optional(types.boolean, false),
    selectedTimeSlot: types.maybeNull(TimeSlotModel),
    bookingForm: types.model("BookingForm", {
      clientId: types.maybeNull(types.string),
      tailorId: types.maybeNull(types.string),
      type: types.maybeNull(types.enumeration("AppointmentType", [
        "consultation", "measurement", "fitting", "delivery", "alteration", "design_review"
      ])),
      duration: types.optional(types.number, 60),
      title: types.maybeNull(types.string),
      description: types.maybeNull(types.string),
      requirements: types.model({
        measurements: types.optional(types.boolean, false),
        fabricSamples: types.optional(types.boolean, false),
        garmentBringing: types.optional(types.boolean, false),
      }),
    }),
    
    // Loading and error states
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),
    
    // Statistics
    statistics: types.model("AppointmentStatistics", {
      totalAppointments: types.optional(types.number, 0),
      upcomingAppointments: types.optional(types.number, 0),
      completedAppointments: types.optional(types.number, 0),
      cancelledAppointments: types.optional(types.number, 0),
      noShowRate: types.optional(types.number, 0),
      averageRating: types.optional(types.number, 0),
      lastUpdated: types.maybeNull(types.string),
    }),
  })
  .actions(self => {
    // Helper actions
    const setLoading = (loading: boolean) => {
      self.isLoading = loading
    }

    const setError = (error: string | null) => {
      self.error = error
    }

    const clearError = () => {
      self.error = null
    }

    const setLastFetched = (timestamp: string) => {
      self.lastFetched = timestamp
    }

    return {
      setLoading,
      setError,
      clearError,
      setLastFetched,

      /**
       * Set current appointment
       */
      setCurrentAppointment(appointment: Appointment | null) {
        if (appointment) {
          const validatedAppointment = validateAppointment(appointment)
          self.currentAppointment = AppointmentModel.create(validatedAppointment)
        } else {
          self.currentAppointment = null
        }
      },

      /**
       * Update calendar view
       */
      updateCalendarView(updates: Partial<typeof self.calendarView>) {
        Object.assign(self.calendarView, updates)
      },

      /**
       * Start booking process
       */
      startBooking(clientId: string, tailorId: string) {
        self.isBookingInProgress = true
        self.bookingForm.clientId = clientId
        self.bookingForm.tailorId = tailorId
        self.selectedTimeSlot = null
      },

      /**
       * Select time slot for booking
       */
      selectTimeSlot(timeSlot: typeof TimeSlotModel.Type) {
        self.selectedTimeSlot = TimeSlotModel.create(timeSlot)
      },

      /**
       * Update booking form
       */
      updateBookingForm(updates: Partial<typeof self.bookingForm>) {
        Object.assign(self.bookingForm, updates)
      },

      /**
       * Cancel booking process
       */
      cancelBooking() {
        self.isBookingInProgress = false
        self.selectedTimeSlot = null
        self.bookingForm.clientId = null
        self.bookingForm.tailorId = null
        self.bookingForm.type = null
        self.bookingForm.title = null
        self.bookingForm.description = null
        self.bookingForm.requirements.measurements = false
        self.bookingForm.requirements.fabricSamples = false
        self.bookingForm.requirements.garmentBringing = false
      },

      /**
       * Update appointment status
       */
      updateAppointmentStatus(appointmentId: string, status: AppointmentStatus, notes?: string) {
        const appointment = self.appointments.findById(appointmentId)
        if (appointment) {
          appointment.status = status
          appointment.updatedAt = createTimestamp()
          
          if (notes) {
            appointment.tailorNotes = notes
          }

          // Track actual times for in_progress and completed
          if (status === "in_progress" && !appointment.actualStartTime) {
            appointment.actualStartTime = createTimestamp()
          } else if (status === "completed" && !appointment.actualEndTime) {
            appointment.actualEndTime = createTimestamp()
            
            // Calculate actual duration
            if (appointment.actualStartTime) {
              const startTime = new Date(appointment.actualStartTime).getTime()
              const endTime = new Date(appointment.actualEndTime).getTime()
              appointment.actualDuration = Math.round((endTime - startTime) / 60000) // minutes
            }
          }
        }
      },

      /**
       * Reschedule appointment
       */
      rescheduleAppointment(appointmentId: string, newDate: string, reason?: string) {
        const appointment = self.appointments.findById(appointmentId)
        if (appointment) {
          // Store original date if not already stored
          if (!appointment.originalDate) {
            appointment.originalDate = appointment.scheduledDate
          }
          
          appointment.scheduledDate = newDate
          appointment.endDate = new Date(new Date(newDate).getTime() + appointment.duration * 60000).toISOString()
          appointment.status = "rescheduled"
          appointment.rescheduleCount += 1
          appointment.rescheduleReason = reason || null
          appointment.updatedAt = createTimestamp()
        }
      },

      /**
       * Add reminder to appointment
       */
      addReminder(appointmentId: string, type: "email" | "sms" | "push" | "call", hoursBeforeAppointment: number) {
        const appointment = self.appointments.findById(appointmentId)
        if (appointment) {
          const scheduledFor = new Date(new Date(appointment.scheduledDate).getTime() - hoursBeforeAppointment * 60 * 60 * 1000).toISOString()
          
          const reminder = ReminderModel.create({
            id: generateId(),
            appointmentId,
            type,
            scheduledFor,
            message: `Reminder: You have a ${appointment.type} appointment scheduled for ${new Date(appointment.scheduledDate).toLocaleString()}`,
            isSent: false,
            sentAt: null,
            status: "scheduled",
            createdAt: createTimestamp(),
          })
          
          appointment.reminders.push(reminder)
          appointment.updatedAt = createTimestamp()
        }
      },

      /**
       * Add client feedback
       */
      addClientFeedback(appointmentId: string, rating: number, feedback?: string) {
        const appointment = self.appointments.findById(appointmentId)
        if (appointment) {
          appointment.clientRating = rating
          appointment.clientFeedback = feedback || null
          appointment.updatedAt = createTimestamp()
        }
      },

      /**
       * Generate availability schedule for tailor
       */
      generateAvailabilitySchedule(tailorId: string, date: string, workingHours: {
        start: string
        end: string
        breakStart?: string
        breakEnd?: string
      }) {
        const timeSlots: any[] = []
        const slotDuration = 30 // 30-minute slots
        
        // Parse working hours
        const startTime = new Date(`${date}T${workingHours.start}:00`)
        const endTime = new Date(`${date}T${workingHours.end}:00`)
        const breakStart = workingHours.breakStart ? new Date(`${date}T${workingHours.breakStart}:00`) : null
        const breakEnd = workingHours.breakEnd ? new Date(`${date}T${workingHours.breakEnd}:00`) : null
        
        // Generate time slots
        let currentTime = new Date(startTime)
        while (currentTime < endTime) {
          const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000)
          
          // Skip if in break time
          const isInBreak = breakStart && breakEnd && 
            currentTime >= breakStart && currentTime < breakEnd
          
          if (!isInBreak) {
            // Check if slot is already booked
            const existingAppointment = self.appointments.items.find((apt: any) => {
              const appointmentStart = new Date(apt.scheduledDate)
              const appointmentEnd = new Date(apt.endDate)
              return apt.tailorId === tailorId &&
                apt.status !== "cancelled" &&
                currentTime < appointmentEnd && slotEnd > appointmentStart
            })
            
            timeSlots.push({
              start: currentTime.toISOString(),
              end: slotEnd.toISOString(),
              isAvailable: !existingAppointment,
              isBooked: !!existingAppointment,
              appointmentId: existingAppointment?.id || null,
            })
          }
          
          currentTime = slotEnd
        }
        
        const schedule = AvailabilityScheduleModel.create({
          tailorId,
          date,
          timeSlots,
          isWorkingDay: true,
          workingHours,
          specialNotes: null,
          lastUpdated: createTimestamp(),
        })
        
        // Replace existing schedule for this date
        const existingIndex = self.availabilitySchedules.items.findIndex(
          (s: any) => s.tailorId === tailorId && s.date === date
        )
        
        if (existingIndex !== -1) {
          self.availabilitySchedules.items[existingIndex] = schedule
        } else {
          self.availabilitySchedules.addItem(schedule)
        }
      },

      /**
       * Update statistics
       */
      updateStatistics(stats: Partial<typeof self.statistics>) {
        Object.assign(self.statistics, stats, { lastUpdated: createTimestamp() })
      },
    }
  })
  .actions(self => {
    // Async actions
    const fetchAppointments = createAsyncAction(
      self,
      async (params: {
        clientId?: string
        tailorId?: string
        status?: AppointmentStatus
        type?: AppointmentType
        dateFrom?: string
        dateTo?: string
        page?: number
      } = {}) => {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value) queryParams.set(key, value.toString())
        })

        const response = await fetch(`/api/appointments?${queryParams}`, {
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch appointments')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to load appointments" }
    )

    const createAppointment = createAsyncAction(
      self,
      async (appointmentData: Partial<Appointment>) => {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData),
        })
        
        if (!response.ok) {
          throw new Error('Failed to create appointment')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to create appointment" }
    )

    const updateAppointment = createAsyncAction(
      self,
      async (appointmentId: string, updates: Partial<Appointment>) => {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        
        if (!response.ok) {
          throw new Error('Failed to update appointment')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to update appointment" }
    )

    const fetchAvailability = createAsyncAction(
      self,
      async (tailorId: string, dateFrom: string, dateTo: string) => {
        const response = await fetch(
          `/api/tailors/${tailorId}/availability?from=${dateFrom}&to=${dateTo}`,
          { headers: { 'Content-Type': 'application/json' } }
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch availability')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to load availability" }
    )

    return {
      /**
       * Load appointments
       */
      loadAppointments: flow(function* (params: any = {}, reset: boolean = false) {
        try {
          const result = yield fetchAppointments(params)
          
          if (reset) {
            self.appointments.setItems(result.appointments)
          } else {
            self.appointments.addItems(result.appointments)
          }
          
          self.appointments.setHasMore(result.hasMore)
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Book appointment
       */
      bookAppointment: flow(function* () {
        if (!self.selectedTimeSlot || !self.bookingForm.clientId || !self.bookingForm.tailorId) {
          throw new Error("Missing required booking information")
        }

        try {
          const appointmentData = {
            id: generateId(),
            clientId: self.bookingForm.clientId,
            tailorId: self.bookingForm.tailorId,
            type: self.bookingForm.type,
            status: "scheduled" as AppointmentStatus,
            scheduledDate: self.selectedTimeSlot.start,
            duration: self.bookingForm.duration,
            endDate: self.selectedTimeSlot.end,
            location: {
              type: "studio",
              address: null,
              room: null,
              specialInstructions: null,
            },
            title: self.bookingForm.title || `${self.bookingForm.type} appointment`,
            description: self.bookingForm.description,
            purpose: null,
            orderId: null,
            requiresMeasurements: self.bookingForm.requirements.measurements,
            requiresFabricSamples: self.bookingForm.requirements.fabricSamples,
            requiresGarmentBringing: self.bookingForm.requirements.garmentBringing,
            preparationNotes: null,
            clientNotes: null,
            tailorNotes: null,
            internalNotes: null,
            reminders: [],
            reminderSettings: {
              emailReminder: true,
              smsReminder: false,
              pushReminder: true,
              reminderTimes: [24, 2], // 24 hours and 2 hours before
            },
            followUpRequired: false,
            followUpDate: null,
            followUpNotes: null,
            actualStartTime: null,
            actualEndTime: null,
            actualDuration: null,
            outcome: null,
            nextSteps: null,
            clientRating: null,
            clientFeedback: null,
            tailorRating: null,
            tailorFeedback: null,
            originalDate: null,
            rescheduleCount: 0,
            rescheduleReason: null,
            createdAt: createTimestamp(),
            updatedAt: createTimestamp(),
          }

          const created = yield createAppointment(appointmentData)
          self.appointments.addItem(AppointmentModel.create(created))
          self.cancelBooking()
          return created
        } catch (error) {
          throw error
        }
      }),

      /**
       * Update existing appointment
       */
      saveAppointment: flow(function* (appointmentId: string, updates: Partial<Appointment>) {
        try {
          const updated = yield updateAppointment(appointmentId, updates)
          self.appointments.updateItem(appointmentId, updated)
          
          if (self.currentAppointment?.id === appointmentId) {
            self.setCurrentAppointment(updated)
          }
          
          return updated
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load tailor availability
       */
      loadAvailability: flow(function* (tailorId: string, dateFrom: string, dateTo: string) {
        try {
          const availability = yield fetchAvailability(tailorId, dateFrom, dateTo)
          self.availabilitySchedules.setItems(availability.schedules)
          return availability
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load today's appointments
       */
      loadTodaysAppointments: flow(function* (tailorId?: string) {
        const today = new Date().toISOString().split('T')[0]
        const params = {
          dateFrom: today,
          dateTo: today,
          ...(tailorId && { tailorId }),
        }
        
        try {
          return yield self.loadAppointments(params, true)
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load upcoming appointments
       */
      loadUpcomingAppointments: flow(function* (clientId?: string, tailorId?: string) {
        const today = new Date().toISOString().split('T')[0]
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const params = {
          dateFrom: today,
          dateTo: nextWeek,
          status: "scheduled" as AppointmentStatus,
          ...(clientId && { clientId }),
          ...(tailorId && { tailorId }),
        }
        
        try {
          return yield self.loadAppointments(params, true)
        } catch (error) {
          throw error
        }
      }),
    }
  })
  .views(self => ({
    /**
     * Get appointments by status
     */
    getAppointmentsByStatus(status: AppointmentStatus) {
      return self.appointments.filter((apt: any) => apt.status === status)
    },

    /**
     * Get appointments by client
     */
    getAppointmentsByClient(clientId: string) {
      return self.appointments.filter((apt: any) => apt.clientId === clientId)
    },

    /**
     * Get appointments by tailor
     */
    getAppointmentsByTailor(tailorId: string) {
      return self.appointments.filter((apt: any) => apt.tailorId === tailorId)
    },

    /**
     * Get today's appointments
     */
    get todaysAppointments() {
      const today = new Date().toISOString().split('T')[0]
      return self.appointments.filter((apt: any) => 
        apt.scheduledDate.startsWith(today) && apt.status !== "cancelled"
      )
    },

    /**
     * Get upcoming appointments (next 7 days)
     */
    get upcomingAppointments() {
      const now = new Date()
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      return self.appointments.filter((apt: any) => {
        const appointmentDate = new Date(apt.scheduledDate)
        return appointmentDate >= now && appointmentDate <= nextWeek && apt.status !== "cancelled"
      })
    },

    /**
     * Get overdue appointments
     */
    get overdueAppointments() {
      const now = new Date()
      return self.appointments.filter((apt: any) => {
        const appointmentDate = new Date(apt.scheduledDate)
        return appointmentDate < now && apt.status === "scheduled"
      })
    },

    /**
     * Get available time slots for date and tailor
     */
    getAvailableSlots(tailorId: string, date: string) {
      const schedule = self.availabilitySchedules.items.find(
        (s: any) => s.tailorId === tailorId && s.date === date
      )
      return schedule ? schedule.timeSlots.filter((slot: any) => slot.isAvailable) : []
    },

    /**
     * Check if booking form is valid
     */
    get isBookingFormValid() {
      return !!(
        self.bookingForm.clientId &&
        self.bookingForm.tailorId &&
        self.bookingForm.type &&
        self.bookingForm.title &&
        self.selectedTimeSlot
      )
    },

    /**
     * Get appointments for calendar view
     */
    get calendarAppointments() {
      const { currentDate, viewMode, selectedTailorId } = self.calendarView
      let appointments = self.appointments.items
      
      // Filter by tailor if selected
      if (selectedTailorId) {
        appointments = appointments.filter((apt: any) => apt.tailorId === selectedTailorId)
      }
      
      // Filter by date range based on view mode
      const filterDate = new Date(currentDate)
      let startDate: Date, endDate: Date
      
      switch (viewMode) {
        case "day":
          startDate = new Date(filterDate)
          endDate = new Date(filterDate)
          endDate.setDate(endDate.getDate() + 1)
          break
        case "week":
          startDate = new Date(filterDate)
          startDate.setDate(startDate.getDate() - startDate.getDay())
          endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 7)
          break
        case "month":
          startDate = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1)
          endDate = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0)
          break
        default:
          return appointments
      }
      
      return appointments.filter((apt: any) => {
        const appointmentDate = new Date(apt.scheduledDate)
        return appointmentDate >= startDate && appointmentDate < endDate
      })
    },

    /**
     * Check if data is stale
     */
    get isStale() {
      if (!self.lastFetched) return true
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return new Date(self.lastFetched).getTime() < fiveMinutesAgo
    },
  }))

/**
 * Type definitions for AppointmentStore
 */
export interface AppointmentStore extends Instance<typeof AppointmentStoreModel> {}
export interface AppointmentStoreSnapshot extends SnapshotOut<typeof AppointmentStoreModel> {}