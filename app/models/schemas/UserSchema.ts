/**
 * User Model Zod Validation Schemas
 */

import { z } from 'zod'

// Enums
export const UserRoleSchema = z.enum(['client', 'tailor', 'admin'])
export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended'])

// Address schema
export const UserAddressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(3, 'Valid zip code is required'),
  country: z.string().min(1, 'Country is required'),
})

// Profile schema
export const UserProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  dateOfBirth: z.string().datetime('Invalid date format').optional(),
  address: UserAddressSchema.optional(),
})

// Preferences schema
export const UserPreferencesSchema = z.object({
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }),
  language: z.string().length(2, 'Language code must be 2 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
})

// Main User schema
export const UserSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email address'),
  role: UserRoleSchema,
  status: UserStatusSchema,
  profile: UserProfileSchema,
  preferences: UserPreferencesSchema,
  emailVerified: z.boolean(),
  lastLoginAt: z.string().datetime('Invalid date format').optional(),
  createdAt: z.string().datetime('Invalid date format'),
  updatedAt: z.string().datetime('Invalid date format'),
})

// Input schemas
export const CreateUserInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: UserRoleSchema,
  profile: UserProfileSchema.omit({ avatar: true }),
  preferences: UserPreferencesSchema.partial().optional(),
})

export const UpdateUserInputSchema = z.object({
  profile: UserProfileSchema.partial().optional(),
  preferences: UserPreferencesSchema.partial().optional(),
  status: UserStatusSchema.optional(),
})

// Validation functions
export const validateUser = (data: unknown) => UserSchema.parse(data)
export const validateCreateUserInput = (data: unknown) => CreateUserInputSchema.parse(data)
export const validateUpdateUserInput = (data: unknown) => UpdateUserInputSchema.parse(data)

// Type inference
export type UserSchemaType = z.infer<typeof UserSchema>
export type CreateUserInputSchemaType = z.infer<typeof CreateUserInputSchema>
export type UpdateUserInputSchemaType = z.infer<typeof UpdateUserInputSchema>