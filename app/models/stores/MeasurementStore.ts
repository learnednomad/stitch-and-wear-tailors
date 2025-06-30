/**
 * MeasurementStore - Client Measurement History and Management
 * Manages client measurements, templates, history, validation, and comparison
 */

import { types, flow, Instance, SnapshotOut } from "mobx-state-tree"
import { createAsyncAction, createCollectionModel, generateId, createTimestamp } from "../mst"
import { Measurement, MeasurementTemplate } from "../types"
import { validateMeasurement } from "../schemas"

/**
 * MST model for individual measurement value
 */
const MeasurementValueModel = types.model("MeasurementValue", {
  name: types.string,
  value: types.number,
  unit: types.enumeration("Unit", ["cm", "inches"]),
  notes: types.maybeNull(types.string),
})

/**
 * MST model for measurement template
 */
const TemplateModel = types.model("MeasurementTemplate", {
  id: types.string,
  name: types.string,
  description: types.string,
  category: types.enumeration("Category", ["shirt", "pants", "dress", "suit", "custom"]),
  measurements: types.array(types.model("TemplateMeasurement", {
    name: types.string,
    label: types.string,
    required: types.boolean,
    unit: types.enumeration("Unit", ["cm", "inches"]),
    defaultValue: types.maybeNull(types.number),
    minValue: types.maybeNull(types.number),
    maxValue: types.maybeNull(types.number),
    description: types.maybeNull(types.string),
    instructions: types.maybeNull(types.string),
  })),
  isDefault: types.optional(types.boolean, false),
  isActive: types.optional(types.boolean, true),
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * MST model for measurement comparison
 */
const MeasurementComparisonModel = types.model("MeasurementComparison", {
  measurementName: types.string,
  previousValue: types.number,
  currentValue: types.number,
  difference: types.number,
  percentageChange: types.number,
  isSignificant: types.boolean, // > 2cm or 1 inch change
})

/**
 * Main Measurement model
 */
const MeasurementModel = types.model("Measurement", {
  id: types.string,
  clientId: types.string,
  tailorId: types.string,
  
  // Measurement details
  templateId: types.maybeNull(types.string),
  templateName: types.maybeNull(types.string),
  occasion: types.maybeNull(types.string),
  garmentType: types.enumeration("GarmentType", [
    "shirt", "pants", "dress", "suit", "blazer", "skirt", "blouse", "custom"
  ]),
  
  // Measurements data
  measurements: types.array(MeasurementValueModel),
  unit: types.enumeration("Unit", ["cm", "inches"]),
  
  // Validation and status
  isComplete: types.optional(types.boolean, false),
  isValidated: types.optional(types.boolean, false),
  validationErrors: types.array(types.string),
  
  // Session info
  sessionDate: types.string,
  sessionDuration: types.maybeNull(types.number), // in minutes
  sessionNotes: types.maybeNull(types.string),
  
  // Comparison with previous measurements
  previousMeasurementId: types.maybeNull(types.string),
  comparisons: types.array(MeasurementComparisonModel),
  hasSignificantChanges: types.optional(types.boolean, false),
  
  // Quality assurance
  measuredBy: types.string, // tailor who took measurements
  verifiedBy: types.maybeNull(types.string), // senior tailor who verified
  confidenceLevel: types.enumeration("Confidence", ["low", "medium", "high"]),
  
  // Client feedback
  clientApproved: types.maybeNull(types.boolean),
  clientNotes: types.maybeNull(types.string),
  
  // Photos and references
  photos: types.array(types.string),
  referencePhotos: types.array(types.string),
  
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * Collection model for measurements
 */
const MeasurementsCollectionModel = createCollectionModel("MeasurementsCollection", MeasurementModel)

/**
 * Collection model for templates
 */
const TemplatesCollectionModel = createCollectionModel("TemplatesCollection", TemplateModel)

/**
 * Main MeasurementStore model
 */
export const MeasurementStoreModel = types
  .model("MeasurementStore", {
    // Measurements collection
    measurements: types.optional(MeasurementsCollectionModel, {}),
    
    // Templates collection
    templates: types.optional(TemplatesCollectionModel, {}),
    
    // Current measurement session
    currentMeasurement: types.maybeNull(MeasurementModel),
    activeTemplate: types.maybeNull(TemplateModel),
    
    // Session state
    isInSession: types.optional(types.boolean, false),
    sessionStartTime: types.maybeNull(types.string),
    pendingMeasurements: types.map(types.number),
    
    // Loading and error states
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),
    
    // Validation settings
    validationSettings: types.model("ValidationSettings", {
      enableAutoValidation: types.optional(types.boolean, true),
      significantChangeThreshold: types.optional(types.number, 2), // cm
      confidenceRequirement: types.optional(types.enumeration("Confidence", ["low", "medium", "high"]), "medium"),
      requireVerification: types.optional(types.boolean, false),
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
       * Set current measurement
       */
      setCurrentMeasurement(measurement: Measurement | null) {
        if (measurement) {
          const validatedMeasurement = validateMeasurement(measurement)
          self.currentMeasurement = MeasurementModel.create(validatedMeasurement)
        } else {
          self.currentMeasurement = null
        }
      },

      /**
       * Set active template
       */
      setActiveTemplate(templateId: string | null) {
        if (templateId) {
          self.activeTemplate = self.templates.findById(templateId)
        } else {
          self.activeTemplate = null
        }
      },

      /**
       * Start new measurement session
       */
      startMeasurementSession(clientId: string, tailorId: string, templateId?: string) {
        self.isInSession = true
        self.sessionStartTime = createTimestamp()
        self.pendingMeasurements.clear()

        // Create new measurement
        self.currentMeasurement = MeasurementModel.create({
          id: generateId(),
          clientId,
          tailorId,
          templateId: templateId || null,
          templateName: templateId ? self.templates.findById(templateId)?.name || null : null,
          occasion: null,
          garmentType: "custom",
          measurements: [],
          unit: "cm",
          isComplete: false,
          isValidated: false,
          validationErrors: [],
          sessionDate: createTimestamp(),
          sessionDuration: null,
          sessionNotes: null,
          previousMeasurementId: null,
          comparisons: [],
          hasSignificantChanges: false,
          measuredBy: tailorId,
          verifiedBy: null,
          confidenceLevel: "medium",
          clientApproved: null,
          clientNotes: null,
          photos: [],
          referencePhotos: [],
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        })

        // Load template if specified
        if (templateId) {
          self.setActiveTemplate(templateId)
        }
      },

      /**
       * Add measurement value
       */
      addMeasurementValue(name: string, value: number, unit: "cm" | "inches", notes?: string) {
        if (!self.currentMeasurement) return

        const existingIndex = self.currentMeasurement.measurements.findIndex(m => m.name === name)
        const measurementValue = MeasurementValueModel.create({
          name,
          value,
          unit,
          notes: notes || null,
        })

        if (existingIndex !== -1) {
          // Update existing measurement
          self.currentMeasurement.measurements[existingIndex] = measurementValue
        } else {
          // Add new measurement
          self.currentMeasurement.measurements.push(measurementValue)
        }

        self.currentMeasurement.updatedAt = createTimestamp()
        
        // Store in pending measurements for quick access
        self.pendingMeasurements.set(name, value)

        // Auto-validate if enabled
        if (self.validationSettings.enableAutoValidation) {
          self.validateCurrentMeasurement()
        }
      },

      /**
       * Remove measurement value
       */
      removeMeasurementValue(name: string) {
        if (!self.currentMeasurement) return

        const index = self.currentMeasurement.measurements.findIndex(m => m.name === name)
        if (index !== -1) {
          self.currentMeasurement.measurements.splice(index, 1)
          self.pendingMeasurements.delete(name)
          self.currentMeasurement.updatedAt = createTimestamp()
        }
      },

      /**
       * Validate current measurement
       */
      validateCurrentMeasurement() {
        if (!self.currentMeasurement) return

        const errors: string[] = []

        // Check required measurements if using template
        if (self.activeTemplate) {
          const requiredMeasurements = self.activeTemplate.measurements.filter(m => m.required)
          for (const required of requiredMeasurements) {
            const existing = self.currentMeasurement.measurements.find(m => m.name === required.name)
            if (!existing) {
              errors.push(`Missing required measurement: ${required.label}`)
            } else {
              // Check value ranges
              if (required.minValue && existing.value < required.minValue) {
                errors.push(`${required.label} is below minimum value (${required.minValue}${required.unit})`)
              }
              if (required.maxValue && existing.value > required.maxValue) {
                errors.push(`${required.label} is above maximum value (${required.maxValue}${required.unit})`)
              }
            }
          }
        }

        // Check for reasonable values (basic sanity check)
        for (const measurement of self.currentMeasurement.measurements) {
          if (measurement.value <= 0) {
            errors.push(`${measurement.name} must be greater than 0`)
          }
          if (measurement.value > 200) { // 200cm seems reasonable as max for most measurements
            errors.push(`${measurement.name} seems unusually large (${measurement.value}${measurement.unit})`)
          }
        }

        self.currentMeasurement.validationErrors.clear()
        self.currentMeasurement.validationErrors.push(...errors)
        self.currentMeasurement.isValidated = errors.length === 0
        self.currentMeasurement.updatedAt = createTimestamp()
      },

      /**
       * Compare with previous measurements
       */
      compareWithPrevious(previousMeasurementId: string) {
        if (!self.currentMeasurement) return

        const previous = self.measurements.findById(previousMeasurementId)
        if (!previous) return

        self.currentMeasurement.previousMeasurementId = previousMeasurementId
        self.currentMeasurement.comparisons.clear()

        let hasSignificantChanges = false

        // Compare each measurement
        for (const current of self.currentMeasurement.measurements) {
          const previousValue = previous.measurements.find(m => m.name === current.name)
          if (previousValue) {
            const difference = current.value - previousValue.value
            const percentageChange = (difference / previousValue.value) * 100
            const isSignificant = Math.abs(difference) >= self.validationSettings.significantChangeThreshold

            if (isSignificant) {
              hasSignificantChanges = true
            }

            self.currentMeasurement.comparisons.push({
              measurementName: current.name,
              previousValue: previousValue.value,
              currentValue: current.value,
              difference,
              percentageChange,
              isSignificant,
            })
          }
        }

        self.currentMeasurement.hasSignificantChanges = hasSignificantChanges
        self.currentMeasurement.updatedAt = createTimestamp()
      },

      /**
       * Complete measurement session
       */
      completeMeasurementSession(sessionNotes?: string) {
        if (!self.currentMeasurement || !self.isInSession) return

        const sessionDuration = self.sessionStartTime
          ? Math.round((Date.now() - new Date(self.sessionStartTime).getTime()) / 60000)
          : null

        self.currentMeasurement.sessionDuration = sessionDuration
        self.currentMeasurement.sessionNotes = sessionNotes || null
        self.currentMeasurement.isComplete = true
        self.currentMeasurement.updatedAt = createTimestamp()

        // Validate one final time
        self.validateCurrentMeasurement()

        self.isInSession = false
        self.sessionStartTime = null
        self.pendingMeasurements.clear()
      },

      /**
       * Cancel measurement session
       */
      cancelMeasurementSession() {
        self.currentMeasurement = null
        self.activeTemplate = null
        self.isInSession = false
        self.sessionStartTime = null
        self.pendingMeasurements.clear()
      },

      /**
       * Set client approval
       */
      setClientApproval(measurementId: string, approved: boolean, notes?: string) {
        const measurement = self.measurements.findById(measurementId)
        if (measurement) {
          measurement.clientApproved = approved
          measurement.clientNotes = notes || null
          measurement.updatedAt = createTimestamp()
        }
      },

      /**
       * Add photo to measurement
       */
      addPhoto(measurementId: string, photoUrl: string, isReference: boolean = false) {
        const measurement = self.measurements.findById(measurementId) || self.currentMeasurement
        if (measurement) {
          if (isReference) {
            measurement.referencePhotos.push(photoUrl)
          } else {
            measurement.photos.push(photoUrl)
          }
          measurement.updatedAt = createTimestamp()
        }
      },

      /**
       * Update validation settings
       */
      updateValidationSettings(settings: Partial<typeof self.validationSettings>) {
        Object.assign(self.validationSettings, settings)
      },
    }
  })
  .actions(self => {
    // Async actions
    const fetchMeasurements = createAsyncAction(
      self,
      async (params: {
        clientId?: string
        tailorId?: string
        garmentType?: string
        dateFrom?: string
        dateTo?: string
        page?: number
      } = {}) => {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value) queryParams.set(key, value.toString())
        })

        const response = await fetch(`/api/measurements?${queryParams}`, {
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch measurements')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to load measurements" }
    )

    const saveMeasurement = createAsyncAction(
      self,
      async (measurementData: Partial<Measurement>) => {
        const response = await fetch('/api/measurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(measurementData),
        })
        
        if (!response.ok) {
          throw new Error('Failed to save measurement')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to save measurement" }
    )

    const fetchTemplates = createAsyncAction(
      self,
      async () => {
        const response = await fetch('/api/measurement-templates', {
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch templates')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to load templates" }
    )

    return {
      /**
       * Load measurements
       */
      loadMeasurements: flow(function* (params: any = {}, reset: boolean = false) {
        try {
          const result = yield fetchMeasurements(params)
          
          if (reset) {
            self.measurements.setItems(result.measurements)
          } else {
            self.measurements.addItems(result.measurements)
          }
          
          self.measurements.setHasMore(result.hasMore)
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load templates
       */
      loadTemplates: flow(function* () {
        try {
          const templates = yield fetchTemplates()
          self.templates.setItems(templates)
          return templates
        } catch (error) {
          throw error
        }
      }),

      /**
       * Save current measurement
       */
      saveMeasurement: flow(function* () {
        if (!self.currentMeasurement) return

        try {
          const saved = yield saveMeasurement(self.currentMeasurement)
          self.measurements.addItem(MeasurementModel.create(saved))
          return saved
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load client's measurement history
       */
      loadClientHistory: flow(function* (clientId: string) {
        try {
          const result = yield fetchMeasurements({ clientId, page: 1 })
          self.measurements.setItems(result.measurements)
          return result.measurements
        } catch (error) {
          throw error
        }
      }),
    }
  })
  .views(self => ({
    /**
     * Get measurements by client
     */
    getMeasurementsByClient(clientId: string) {
      return self.measurements.filter((m: any) => m.clientId === clientId)
    },

    /**
     * Get latest measurement for client
     */
    getLatestMeasurement(clientId: string) {
      const clientMeasurements = this.getMeasurementsByClient(clientId)
      return clientMeasurements.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0] || null
    },

    /**
     * Get measurements by garment type
     */
    getMeasurementsByGarmentType(garmentType: string) {
      return self.measurements.filter((m: any) => m.garmentType === garmentType)
    },

    /**
     * Get pending measurements count
     */
    get pendingMeasurementsCount() {
      return self.pendingMeasurements.size
    },

    /**
     * Check if current measurement is complete
     */
    get isCurrentMeasurementComplete() {
      if (!self.currentMeasurement) return false
      
      // Check if all required measurements are present if using template
      if (self.activeTemplate) {
        const requiredNames = self.activeTemplate.measurements
          .filter(m => m.required)
          .map(m => m.name)
        
        const currentNames = self.currentMeasurement.measurements.map(m => m.name)
        return requiredNames.every(name => currentNames.includes(name))
      }
      
      return self.currentMeasurement.measurements.length > 0
    },

    /**
     * Get session duration in minutes
     */
    get currentSessionDuration() {
      if (!self.sessionStartTime) return 0
      return Math.round((Date.now() - new Date(self.sessionStartTime).getTime()) / 60000)
    },

    /**
     * Get template by category
     */
    getTemplatesByCategory(category: string) {
      return self.templates.filter((t: any) => t.category === category)
    },

    /**
     * Get default template for category
     */
    getDefaultTemplate(category: string) {
      return self.templates.items.find((t: any) => t.category === category && t.isDefault)
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
 * Type definitions for MeasurementStore
 */
export interface MeasurementStore extends Instance<typeof MeasurementStoreModel> {}
export interface MeasurementStoreSnapshot extends SnapshotOut<typeof MeasurementStoreModel> {}