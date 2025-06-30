/**
 * Appointment Model - Scheduling, availability, and reminders
 */

export type AppointmentType = 
  | 'consultation' 
  | 'measurement' 
  | 'fitting' 
  | 'delivery' 
  | 'alteration'
  | 'design_review'

export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show'
  | 'rescheduled'

export type ReminderType = 'email' | 'sms' | 'push' | 'call'

export interface AppointmentReminder {
  type: ReminderType
  timeBeforeMinutes: number
  sent: boolean
  sentAt?: string
}

export interface AppointmentLocation {
  type: 'shop' | 'client_home' | 'virtual'
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  meetingLink?: string
  instructions?: string
}

export interface AppointmentServices {
  primaryService: AppointmentType
  additionalServices: AppointmentType[]
  estimatedDuration: number // in minutes
  requirements: string[]
  notes?: string
}

export interface Appointment {
  id: string
  clientId: string
  tailorId: string
  orderId?: string
  type: AppointmentType
  status: AppointmentStatus
  services: AppointmentServices
  scheduledAt: string
  startTime: string
  endTime: string
  actualStartTime?: string
  actualEndTime?: string
  location: AppointmentLocation
  reminders: AppointmentReminder[]
  notes?: string
  clientNotes?: string
  tailorNotes?: string
  preparation: {
    clientInstructions: string[]
    tailorInstructions: string[]
    materialsNeeded: string[]
  }
  outcome?: {
    completed: boolean
    nextSteps: string[]
    followUpRequired: boolean
    followUpDate?: string
    issues?: string[]
  }
  cancellationReason?: string
  rescheduledFrom?: string
  rescheduledTo?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAppointmentInput {
  clientId: string
  tailorId: string
  orderId?: string
  type: AppointmentType
  services: Omit<AppointmentServices, 'estimatedDuration'>
  scheduledAt: string
  startTime: string
  endTime: string
  location: AppointmentLocation
  reminders?: Omit<AppointmentReminder, 'sent' | 'sentAt'>[]
  notes?: string
  preparation?: {
    clientInstructions?: string[]
    tailorInstructions?: string[]
    materialsNeeded?: string[]
  }
}

export interface UpdateAppointmentInput {
  status?: AppointmentStatus
  scheduledAt?: string
  startTime?: string
  endTime?: string
  location?: AppointmentLocation
  notes?: string
  clientNotes?: string
  tailorNotes?: string
  preparation?: {
    clientInstructions?: string[]
    tailorInstructions?: string[]
    materialsNeeded?: string[]
  }
  outcome?: {
    completed: boolean
    nextSteps: string[]
    followUpRequired: boolean
    followUpDate?: string
    issues?: string[]
  }
  cancellationReason?: string
}

export interface AppointmentAvailability {
  tailorId: string
  date: string
  availableSlots: {
    startTime: string
    endTime: string
    duration: number
  }[]
  bookedSlots: {
    startTime: string
    endTime: string
    appointmentId: string
  }[]
}