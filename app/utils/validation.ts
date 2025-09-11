/**
 * Comprehensive Input Validation Utilities
 * Provides validation for authentication and user data
 */

import validator from "validator"

export interface ValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
}

export interface PasswordStrength {
  score: number // 0-5
  feedback: string[]
  isStrong: boolean
}

export class ValidationUtils {
  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    if (!email || !email.trim()) {
      return {
        isValid: false,
        error: "Email address is required",
      }
    }

    const trimmedEmail = email.trim().toLowerCase()

    if (!validator.isEmail(trimmedEmail)) {
      return {
        isValid: false,
        error: "Please enter a valid email address",
      }
    }

    if (trimmedEmail.length > 254) {
      return {
        isValid: false,
        error: "Email address is too long",
      }
    }

    // Additional email security checks
    const warnings: string[] = []

    // Check for common typos in popular domains
    const commonDomainTypos = {
      "gmail.co": "gmail.com",
      "gmail.cm": "gmail.com",
      "gmial.com": "gmail.com",
      "yahooo.com": "yahoo.com",
      "yahoo.co": "yahoo.com",
      "hotmial.com": "hotmail.com",
    }

    const domain = trimmedEmail.split("@")[1]
    if (commonDomainTypos[domain]) {
      warnings.push(`Did you mean ${trimmedEmail.replace(domain, commonDomainTypos[domain])}?`)
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): ValidationResult & { strength: PasswordStrength } {
    if (!password) {
      return {
        isValid: false,
        error: "Password is required",
        strength: {
          score: 0,
          feedback: ["Password is required"],
          isStrong: false,
        },
      }
    }

    const strength = this.calculatePasswordStrength(password)
    const minLength = 8

    if (password.length < minLength) {
      return {
        isValid: false,
        error: `Password must be at least ${minLength} characters long`,
        strength,
      }
    }

    // Check for common weak patterns
    if (this.isCommonPassword(password)) {
      return {
        isValid: false,
        error: "This password is too common. Please choose a more unique password.",
        strength,
      }
    }

    // Require at least moderate strength for production use
    if (strength.score < 3) {
      return {
        isValid: false,
        error: "Password is too weak. Please follow the strength requirements.",
        strength,
      }
    }

    return {
      isValid: true,
      strength,
    }
  }

  /**
   * Calculate password strength score
   */
  static calculatePasswordStrength(password: string): PasswordStrength {
    let score = 0
    const feedback: string[] = []

    if (password.length >= 8) score += 1
    else feedback.push("Use at least 8 characters")

    if (password.length >= 12) score += 1
    else if (score > 0) feedback.push("Use 12+ characters for better security")

    if (/[a-z]/.test(password)) score += 1
    else feedback.push("Add lowercase letters")

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push("Add uppercase letters")

    if (/[0-9]/.test(password)) score += 1
    else feedback.push("Add numbers")

    if (/[^A-Za-z0-9]/.test(password)) score += 1
    else feedback.push("Add special characters")

    // Bonus for length
    if (password.length >= 16) score += 1

    // Penalty for patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 1
      feedback.push("Avoid repeated characters")
    }

    if (/123|abc|qwe|asd|zxc/i.test(password)) {
      score -= 1
      feedback.push("Avoid common patterns")
    }

    score = Math.max(0, Math.min(5, score))

    return {
      score,
      feedback: feedback.length > 0 ? feedback : ["Strong password!"],
      isStrong: score >= 4,
    }
  }

  /**
   * Check if password is commonly used
   */
  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      "password",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password123",
      "admin",
      "letmein",
      "welcome",
      "monkey",
      "login",
      "master",
      "hello",
      "guest",
      "admin123",
      "12345678",
      "1234567890",
      "password1",
      "qwertyuiop",
    ]

    return commonPasswords.includes(password.toLowerCase())
  }

  /**
   * Validate name (first name, last name)
   */
  static validateName(name: string, fieldName: string = "Name"): ValidationResult {
    if (!name || !name.trim()) {
      return {
        isValid: false,
        error: `${fieldName} is required`,
      }
    }

    const trimmedName = name.trim()

    if (trimmedName.length < 2) {
      return {
        isValid: false,
        error: `${fieldName} must be at least 2 characters long`,
      }
    }

    if (trimmedName.length > 50) {
      return {
        isValid: false,
        error: `${fieldName} must be less than 50 characters`,
      }
    }

    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      return {
        isValid: false,
        error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`,
      }
    }

    return { isValid: true }
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): ValidationResult {
    if (!phone || !phone.trim()) {
      return {
        isValid: false,
        error: "Phone number is required",
      }
    }

    const cleanPhone = phone.replace(/\D/g, "")

    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return {
        isValid: false,
        error: "Please enter a valid phone number",
      }
    }

    // Nigerian phone number validation
    if (cleanPhone.startsWith("234") || cleanPhone.startsWith("0")) {
      const nigerianPattern = /^(234|0)[789][01]\d{8}$/
      if (!nigerianPattern.test(cleanPhone)) {
        return {
          isValid: false,
          error: "Please enter a valid Nigerian phone number",
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Sanitize input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    if (!input) return ""

    return input
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers
  }

  /**
   * Check password confirmation match
   */
  static validatePasswordConfirmation(password: string, confirmPassword: string): ValidationResult {
    if (!confirmPassword || !confirmPassword.trim()) {
      return {
        isValid: false,
        error: "Please confirm your password",
      }
    }

    if (password !== confirmPassword) {
      return {
        isValid: false,
        error: "Passwords do not match",
      }
    }

    return { isValid: true }
  }

  /**
   * Validate registration form
   */
  static validateRegistrationForm(data: {
    firstName: string
    lastName: string
    email: string
    password: string
    confirmPassword: string
    phone?: string
  }): { isValid: boolean; errors: Record<string, string>; warnings?: Record<string, string[]> } {
    const errors: Record<string, string> = {}
    const warnings: Record<string, string[]> = {}

    // Validate first name
    const firstNameResult = this.validateName(data.firstName, "First name")
    if (!firstNameResult.isValid) {
      errors.firstName = firstNameResult.error!
    }

    // Validate last name
    const lastNameResult = this.validateName(data.lastName, "Last name")
    if (!lastNameResult.isValid) {
      errors.lastName = lastNameResult.error!
    }

    // Validate email
    const emailResult = this.validateEmail(data.email)
    if (!emailResult.isValid) {
      errors.email = emailResult.error!
    } else if (emailResult.warnings) {
      warnings.email = emailResult.warnings
    }

    // Validate password
    const passwordResult = this.validatePassword(data.password)
    if (!passwordResult.isValid) {
      errors.password = passwordResult.error!
    }

    // Validate password confirmation
    const confirmResult = this.validatePasswordConfirmation(data.password, data.confirmPassword)
    if (!confirmResult.isValid) {
      errors.confirmPassword = confirmResult.error!
    }

    // Validate phone (optional)
    if (data.phone && data.phone.trim()) {
      const phoneResult = this.validatePhone(data.phone)
      if (!phoneResult.isValid) {
        errors.phone = phoneResult.error!
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
    }
  }

  /**
   * Validate login form
   */
  static validateLoginForm(data: { email: string; password: string }): {
    isValid: boolean
    errors: Record<string, string>
  } {
    const errors: Record<string, string> = {}

    // Basic email validation for login (less strict)
    if (!data.email || !data.email.trim()) {
      errors.email = "Email address is required"
    } else if (!validator.isEmail(data.email.trim())) {
      errors.email = "Please enter a valid email address"
    }

    // Basic password validation for login
    if (!data.password || !data.password.trim()) {
      errors.password = "Password is required"
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    }
  }
}
