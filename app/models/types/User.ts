/**
 * User Model - Authentication, roles, and profile data
 */

export type UserRole = 'client' | 'tailor' | 'admin'
export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface UserProfile {
  firstName: string
  lastName: string
  phone?: string
  avatar?: string
  dateOfBirth?: string
  address?: UserAddress
}

export interface UserAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface UserPreferences {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  language: string
  timezone: string
  currency: string
}

export interface User {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  profile: UserProfile
  preferences: UserPreferences
  emailVerified: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  email: string
  role: UserRole
  profile: Omit<UserProfile, 'avatar'>
  preferences?: Partial<UserPreferences>
}

export interface UpdateUserInput {
  profile?: Partial<UserProfile>
  preferences?: Partial<UserPreferences>
  status?: UserStatus
}