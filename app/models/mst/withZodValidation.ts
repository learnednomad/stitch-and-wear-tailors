/**
 * Zod Validation Integration for MST Models
 * Provides runtime validation using Zod schemas with MST models
 */

import { z } from "zod"
import { IAnyModelType, types } from "mobx-state-tree"

/**
 * Creates an MST model with Zod validation
 */
export function withZodValidation<T extends IAnyModelType, S extends z.ZodSchema>(
  model: T,
  schema: S
) {
  return model.actions(self => ({
    /**
     * Validates the current model instance against the Zod schema
     */
    validate(): { success: boolean; errors: string[] } {
      try {
        schema.parse(self)
        return { success: true, errors: [] }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            success: false,
            errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
          }
        }
        return { success: false, errors: [String(error)] }
      }
    },

    /**
     * Validates and throws if invalid
     */
    validateStrict(): void {
      const result = this.validate()
      if (!result.success) {
        throw new Error(`Validation failed: ${result.errors.join(', ')}`)
      }
    },
  }))
  .views(self => ({
    /**
     * Gets validation status without throwing
     */
    get isValid(): boolean {
      return self.validate().success
    },

    /**
     * Gets validation errors
     */
    get validationErrors(): string[] {
      return self.validate().errors
    },
  }))
}

/**
 * Creates a validated input action for MST models
 */
export function createValidatedAction<T extends z.ZodSchema>(
  schema: T,
  action: (data: z.infer<T>) => void
) {
  return (rawData: unknown) => {
    try {
      const validatedData = schema.parse(rawData)
      action(validatedData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ')
        throw new Error(`Validation failed: ${errorMessage}`)
      }
      throw error
    }
  }
}

/**
 * Creates a preprocessor that validates data before creating MST instances
 */
export function createValidatedPreprocessor<T extends z.ZodSchema>(schema: T) {
  return types.preProcessSnapshot(schema.parse)
}

/**
 * Utility for safe model updates with validation
 */
export function safeUpdate<T>(
  target: T,
  updates: Partial<T>,
  schema?: z.ZodSchema
): boolean {
  try {
    // Create a copy with updates applied
    const updated = { ...target, ...updates }
    
    // Validate if schema provided
    if (schema) {
      schema.parse(updated)
    }
    
    // Apply updates if validation passes
    Object.assign(target, updates)
    return true
  } catch (error) {
    console.warn('Update validation failed:', error)
    return false
  }
}

/**
 * Creates a validated factory function for MST models
 */
export function createValidatedFactory<T extends z.ZodSchema, M extends IAnyModelType>(
  schema: T,
  model: M
) {
  return (data: unknown) => {
    const validatedData = schema.parse(data)
    return model.create(validatedData)
  }
}