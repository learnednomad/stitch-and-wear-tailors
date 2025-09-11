/**
 * Hook for signup form validation using Zod schemas
 */

import { useState, useMemo } from "react"
import { z } from "zod"
import { validateEmail } from "@/utils/emailValidation"
import { validatePassword } from "@/utils/passwordValidation"

// Define the signup form schema
const SignUpFormSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be less than 50 characters")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "First name can only contain letters, spaces, hyphens, and apostrophes",
      ),

    lastName: z
      .string()
      .min(1, "Last name is required")
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be less than 50 characters")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Last name can only contain letters, spaces, hyphens, and apostrophes",
      ),

    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .refine((email) => {
        const validation = validateEmail(email)
        return validation.isValid
      }, "Please enter a valid email address"),

    password: z
      .string()
      .min(1, "Password is required")
      .refine((password) => {
        const validation = validatePassword(password)
        return validation.isValid
      }, "Password does not meet security requirements"),

    confirmPassword: z.string().min(1, "Please confirm your password"),

    userType: z.enum(["client", "tailor"], {
      required_error: "Please select if you are a client or tailor",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SignUpFormData = z.infer<typeof SignUpFormSchema>

interface ValidationState {
  errors: Record<string, string[]>
  touched: Record<string, boolean>
}

export function useSignUpValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    touched: {},
  })

  const validateField = (
    fieldName: keyof SignUpFormData,
    value: any,
    formData: Partial<SignUpFormData>,
  ) => {
    try {
      // For confirmPassword, we need to validate against password
      if (fieldName === "confirmPassword") {
        const result = SignUpFormSchema.safeParse({
          ...formData,
          [fieldName]: value,
        })

        if (!result.success) {
          const fieldErrors = result.error.issues
            .filter((issue) => issue.path[0] === fieldName)
            .map((issue) => issue.message)

          setValidationState((prev) => ({
            ...prev,
            errors: {
              ...prev.errors,
              [fieldName]: fieldErrors,
            },
            touched: {
              ...prev.touched,
              [fieldName]: true,
            },
          }))
          return false
        }
      } else {
        // Validate individual fields by creating a temporary object
        const tempData = { ...formData, [fieldName]: value }
        const result = SignUpFormSchema.partial().safeParse(tempData)

        if (!result.success) {
          const fieldErrors = result.error.issues
            .filter((issue) => issue.path[0] === fieldName)
            .map((issue) => issue.message)

          if (fieldErrors.length > 0) {
            setValidationState((prev) => ({
              ...prev,
              errors: {
                ...prev.errors,
                [fieldName]: fieldErrors,
              },
              touched: {
                ...prev.touched,
                [fieldName]: true,
              },
            }))
            return false
          }
        }
      }

      // Clear errors for this field if validation passes
      setValidationState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          [fieldName]: [],
        },
        touched: {
          ...prev.touched,
          [fieldName]: true,
        },
      }))
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.issues.map((issue) => issue.message)
        setValidationState((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            [fieldName]: fieldErrors,
          },
          touched: {
            ...prev.touched,
            [fieldName]: true,
          },
        }))
        return false
      }
      return false
    }
  }

  const validateForm = (formData: SignUpFormData): boolean => {
    try {
      SignUpFormSchema.parse(formData)
      setValidationState({
        errors: {},
        touched: Object.keys(formData).reduce(
          (acc, key) => ({
            ...acc,
            [key]: true,
          }),
          {},
        ),
      })
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {}
        error.issues.forEach((issue) => {
          const field = issue.path[0] as string
          if (!errors[field]) {
            errors[field] = []
          }
          errors[field].push(issue.message)
        })

        setValidationState({
          errors,
          touched: Object.keys(formData).reduce(
            (acc, key) => ({
              ...acc,
              [key]: true,
            }),
            {},
          ),
        })
        return false
      }
      return false
    }
  }

  const setFieldTouched = (fieldName: keyof SignUpFormData, touched: boolean = true) => {
    setValidationState((prev) => ({
      ...prev,
      touched: {
        ...prev.touched,
        [fieldName]: touched,
      },
    }))
  }

  const clearValidation = () => {
    setValidationState({
      errors: {},
      touched: {},
    })
  }

  const getFieldError = (fieldName: keyof SignUpFormData): string | undefined => {
    if (!validationState.touched[fieldName]) return undefined
    const errors = validationState.errors[fieldName]
    return errors && errors.length > 0 ? errors[0] : undefined
  }

  const hasFieldError = (fieldName: keyof SignUpFormData): boolean => {
    return !!(validationState.touched[fieldName] && validationState.errors[fieldName]?.length > 0)
  }

  return {
    validateField,
    validateForm,
    setFieldTouched,
    clearValidation,
    getFieldError,
    hasFieldError,
    errors: validationState.errors,
    touched: validationState.touched,
  }
}
