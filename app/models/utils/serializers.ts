/**
 * Serialization and Deserialization Utilities
 * Handle conversion between model formats and storage/API formats
 */

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
} from "../types"

/**
 * Serialize models for API transmission (snake_case conversion)
 */
export const serializeForApi = {
  user: (user: User) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    profile: {
      first_name: user.profile.firstName,
      last_name: user.profile.lastName,
      phone: user.profile.phone,
      avatar: user.profile.avatar,
      date_of_birth: user.profile.dateOfBirth,
      address: user.profile.address
        ? {
            street: user.profile.address.street,
            city: user.profile.address.city,
            state: user.profile.address.state,
            zip_code: user.profile.address.zipCode,
            country: user.profile.address.country,
          }
        : undefined,
    },
    preferences: user.preferences,
    email_verified: user.emailVerified,
    last_login_at: user.lastLoginAt,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    first_name: user.profile.firstName,
    last_name: user.profile.lastName,
  }),

  order: (order: Order) => ({
    id: order.id,
    order_number: order.orderNumber,
    client_id: order.clientId,
    tailor_id: order.tailorId,
    status: order.status,
    priority: order.priority,
    items: order.items,
    timeline: {
      estimated_start_date: order.timeline.estimatedStartDate,
      estimated_completion_date: order.timeline.estimatedCompletionDate,
      actual_start_date: order.timeline.actualStartDate,
      actual_completion_date: order.timeline.actualCompletionDate,
      milestones: order.timeline.milestones,
    },
    pricing: order.pricing,
    notes: order.notes,
    special_instructions: order.specialInstructions,
    images: order.images,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  }),

  measurement: (measurement: Measurement) => ({
    id: measurement.id,
    client_id: measurement.clientId,
    garment_types: measurement.garmentTypes,
    status: measurement.status,
    standard_measurements: measurement.standardMeasurements,
    custom_measurements: measurement.customMeasurements,
    validation: measurement.validation,
    taken_by: measurement.takenBy,
    taken_at: measurement.takenAt,
    notes: measurement.notes,
    images: measurement.images,
    previous_measurement_id: measurement.previousMeasurementId,
    created_at: measurement.createdAt,
    updated_at: measurement.updatedAt,
  }),
}

/**
 * Deserialize from API format (camelCase conversion)
 */
export const deserializeFromApi = {
  user: (apiData: any): User => ({
    id: apiData.id,
    email: apiData.email,
    role: apiData.role,
    status: apiData.status,
    profile: {
      firstName: apiData.profile.first_name || apiData.profile.firstName,
      lastName: apiData.profile.last_name || apiData.profile.lastName,
      phone: apiData.profile.phone,
      avatar: apiData.profile.avatar,
      dateOfBirth: apiData.profile.date_of_birth || apiData.profile.dateOfBirth,
      address: apiData.profile.address
        ? {
            street: apiData.profile.address.street,
            city: apiData.profile.address.city,
            state: apiData.profile.address.state,
            zipCode: apiData.profile.address.zip_code || apiData.profile.address.zipCode,
            country: apiData.profile.address.country,
          }
        : undefined,
    },
    preferences: apiData.preferences,
    emailVerified: apiData.email_verified ?? apiData.emailVerified,
    lastLoginAt: apiData.last_login_at || apiData.lastLoginAt,
    createdAt: apiData.created_at || apiData.createdAt,
    updatedAt: apiData.updated_at || apiData.updatedAt,
  }),

  order: (apiData: any): Order => ({
    id: apiData.id,
    orderNumber: apiData.order_number || apiData.orderNumber,
    clientId: apiData.client_id || apiData.clientId,
    tailorId: apiData.tailor_id || apiData.tailorId,
    status: apiData.status,
    priority: apiData.priority,
    items: apiData.items,
    timeline: {
      estimatedStartDate:
        apiData.timeline.estimated_start_date || apiData.timeline.estimatedStartDate,
      estimatedCompletionDate:
        apiData.timeline.estimated_completion_date || apiData.timeline.estimatedCompletionDate,
      actualStartDate: apiData.timeline.actual_start_date || apiData.timeline.actualStartDate,
      actualCompletionDate:
        apiData.timeline.actual_completion_date || apiData.timeline.actualCompletionDate,
      milestones: apiData.timeline.milestones,
    },
    pricing: apiData.pricing,
    notes: apiData.notes,
    specialInstructions: apiData.special_instructions || apiData.specialInstructions,
    images: apiData.images,
    createdAt: apiData.created_at || apiData.createdAt,
    updatedAt: apiData.updated_at || apiData.updatedAt,
  }),
}

/**
 * Serialize for local storage (JSON stringification)
 */
export const serializeForStorage = <T>(data: T): string => {
  try {
    return JSON.stringify(data)
  } catch (error) {
    console.error("Serialization error:", error)
    throw new Error("Failed to serialize data for storage")
  }
}

/**
 * Deserialize from local storage (JSON parsing)
 */
export const deserializeFromStorage = <T>(serializedData: string): T => {
  try {
    return JSON.parse(serializedData)
  } catch (error) {
    console.error("Deserialization error:", error)
    throw new Error("Failed to deserialize data from storage")
  }
}

/**
 * Serialize arrays of models
 */
export const serializeArray = <T>(data: T[], serializer: (item: T) => any): any[] => {
  return data.map(serializer)
}

/**
 * Create lightweight representations for lists/previews
 */
export const createSummary = {
  user: (user: User) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    name: `${user.profile.firstName} ${user.profile.lastName}`,
    avatar: user.profile.avatar,
    status: user.status,
  }),

  order: (order: Order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    clientId: order.clientId,
    tailorId: order.tailorId,
    status: order.status,
    priority: order.priority,
    total: order.pricing.total,
    currency: order.pricing.currency,
    estimatedCompletion: order.timeline.estimatedCompletionDate,
    itemCount: order.items.length,
    createdAt: order.createdAt,
  }),

  measurement: (measurement: Measurement) => ({
    id: measurement.id,
    clientId: measurement.clientId,
    garmentTypes: measurement.garmentTypes,
    status: measurement.status,
    takenBy: measurement.takenBy,
    takenAt: measurement.takenAt,
    hasValidation: !!measurement.validation,
  }),

  fabric: (fabric: Fabric) => ({
    id: fabric.id,
    name: fabric.name,
    category: fabric.category,
    material: fabric.material,
    colors: fabric.colors,
    availability: fabric.availability,
    price: fabric.pricing.pricePerUnit,
    currency: fabric.pricing.currency,
    images: fabric.images.slice(0, 3), // Only first 3 images
  }),

  style: (style: Style) => ({
    id: style.id,
    name: style.name,
    category: style.category,
    complexity: style.complexity,
    gender: style.gender,
    basePrice: style.pricing.basePrice,
    currency: style.pricing.currency,
    estimatedDays: style.estimatedCompletionDays,
    images: style.images.slice(0, 3), // Only first 3 images
    featured: style.featured,
    popularityScore: style.popularityScore,
  }),
}

/**
 * Create deep copies of models
 */
export const cloneModel = <T>(model: T): T => {
  return JSON.parse(JSON.stringify(model))
}

/**
 * Merge partial updates with existing models
 */
export const mergeModelUpdate = <T extends Record<string, any>>(
  existingModel: T,
  updates: Partial<T>,
): T => {
  return {
    ...existingModel,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
}
