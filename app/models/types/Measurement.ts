/**
 * Measurement Model - Body measurements, validation, and history tracking
 */

export type MeasurementUnit = 'cm' | 'inch'
export type MeasurementStatus = 'draft' | 'pending_validation' | 'validated' | 'rejected'
export type GarmentType = 'shirt' | 'pants' | 'suit' | 'dress' | 'blouse' | 'skirt' | 'jacket' | 'coat'

export interface MeasurementValue {
  value: number
  unit: MeasurementUnit
  notes?: string
}

export interface StandardMeasurements {
  // Upper body
  chest?: MeasurementValue
  waist?: MeasurementValue
  hips?: MeasurementValue
  shoulders?: MeasurementValue
  armLength?: MeasurementValue
  neck?: MeasurementValue
  
  // Lower body
  inseam?: MeasurementValue
  outseam?: MeasurementValue
  thigh?: MeasurementValue
  knee?: MeasurementValue
  calf?: MeasurementValue
  ankle?: MeasurementValue
  
  // General
  height?: MeasurementValue
  weight?: MeasurementValue
}

export interface CustomMeasurement {
  name: string
  value: MeasurementValue
  description?: string
}

export interface MeasurementValidation {
  validatedBy: string
  validatedAt: string
  status: 'approved' | 'needs_revision'
  comments?: string
  suggestedChanges?: Record<string, MeasurementValue>
}

export interface Measurement {
  id: string
  clientId: string
  garmentTypes: GarmentType[]
  status: MeasurementStatus
  standardMeasurements: StandardMeasurements
  customMeasurements: CustomMeasurement[]
  validation?: MeasurementValidation
  takenBy: string
  takenAt: string
  notes?: string
  images: string[]
  previousMeasurementId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateMeasurementInput {
  clientId: string
  garmentTypes: GarmentType[]
  standardMeasurements: StandardMeasurements
  customMeasurements?: CustomMeasurement[]
  takenBy: string
  notes?: string
  images?: string[]
}

export interface UpdateMeasurementInput {
  standardMeasurements?: Partial<StandardMeasurements>
  customMeasurements?: CustomMeasurement[]
  status?: MeasurementStatus
  notes?: string
  images?: string[]
}

export interface MeasurementComparison {
  measurementId: string
  previousMeasurementId: string
  changes: Record<string, {
    previous: MeasurementValue
    current: MeasurementValue
    difference: number
  }>
}