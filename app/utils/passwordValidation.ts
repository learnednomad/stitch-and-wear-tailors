/**
 * Password validation utilities for enhanced security requirements
 */

export interface PasswordStrength {
  score: number // 0-4 (0: Very Weak, 1: Weak, 2: Fair, 3: Good, 4: Strong)
  feedback: string[]
  criteria: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    numbers: boolean
    special: boolean
    noCommonPatterns: boolean
  }
  label: string
  color: string
}

export interface PasswordValidationRules {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  checkCommonPatterns: boolean
}

const DEFAULT_RULES: PasswordValidationRules = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  checkCommonPatterns: true,
}

// Common weak patterns to avoid
const COMMON_PATTERNS = [
  /^(.)\1+$/, // Repeating characters (aaa, 111)
  /^(123|abc|qwerty)/i, // Sequential patterns
  /^(password|admin|login|welcome)/i, // Common words
  /^(\d{4,}|\d+)$/, // Only numbers
]

// Special characters regex
const SPECIAL_CHARS_REGEX = /[!@#$%^&*(),.?":{}|<>]/

/**
 * Calculate password strength score and provide detailed feedback
 */
export function calculatePasswordStrength(
  password: string,
  rules: PasswordValidationRules = DEFAULT_RULES,
): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      feedback: ["Enter a password"],
      criteria: {
        length: false,
        uppercase: false,
        lowercase: false,
        numbers: false,
        special: false,
        noCommonPatterns: false,
      },
      label: "Very Weak",
      color: "#dc2626", // red-600
    }
  }

  const criteria = {
    length: password.length >= rules.minLength,
    uppercase: rules.requireUppercase ? /[A-Z]/.test(password) : true,
    lowercase: rules.requireLowercase ? /[a-z]/.test(password) : true,
    numbers: rules.requireNumbers ? /\d/.test(password) : true,
    special: rules.requireSpecialChars ? SPECIAL_CHARS_REGEX.test(password) : true,
    noCommonPatterns: rules.checkCommonPatterns
      ? !COMMON_PATTERNS.some((pattern) => pattern.test(password))
      : true,
  }

  const metCriteria = Object.values(criteria).filter(Boolean).length
  const totalCriteria = Object.keys(criteria).length

  // Calculate base score
  let score = Math.floor((metCriteria / totalCriteria) * 4)

  // Bonus points for length
  if (password.length >= 12) score += 0.5
  if (password.length >= 16) score += 0.5

  // Cap at 4
  score = Math.min(4, Math.floor(score))

  const feedback = generatePasswordFeedback(password, criteria, rules)
  const { label, color } = getStrengthLabel(score)

  return {
    score,
    feedback,
    criteria,
    label,
    color,
  }
}

/**
 * Generate specific feedback messages for password improvement
 */
function generatePasswordFeedback(
  password: string,
  criteria: PasswordStrength["criteria"],
  rules: PasswordValidationRules,
): string[] {
  const feedback: string[] = []

  if (!criteria.length) {
    feedback.push(`Use at least ${rules.minLength} characters`)
  }

  if (!criteria.uppercase && rules.requireUppercase) {
    feedback.push("Include at least one uppercase letter")
  }

  if (!criteria.lowercase && rules.requireLowercase) {
    feedback.push("Include at least one lowercase letter")
  }

  if (!criteria.numbers && rules.requireNumbers) {
    feedback.push("Include at least one number")
  }

  if (!criteria.special && rules.requireSpecialChars) {
    feedback.push("Include at least one special character (!@#$%^&*)")
  }

  if (!criteria.noCommonPatterns && rules.checkCommonPatterns) {
    feedback.push("Avoid common patterns and dictionary words")
  }

  // Positive feedback for strong passwords
  if (feedback.length === 0) {
    if (password.length >= 16) {
      feedback.push("Excellent! Very strong password")
    } else if (password.length >= 12) {
      feedback.push("Great! Strong password")
    } else {
      feedback.push("Good password strength")
    }
  }

  return feedback
}

/**
 * Get strength label and color based on score
 */
function getStrengthLabel(score: number): { label: string; color: string } {
  switch (score) {
    case 0:
      return { label: "Very Weak", color: "#dc2626" } // red-600
    case 1:
      return { label: "Weak", color: "#ea580c" } // orange-600
    case 2:
      return { label: "Fair", color: "#d97706" } // amber-600
    case 3:
      return { label: "Good", color: "#65a30d" } // lime-600
    case 4:
      return { label: "Strong", color: "#16a34a" } // green-600
    default:
      return { label: "Very Weak", color: "#dc2626" }
  }
}

/**
 * Simple password validation for forms
 */
export function validatePassword(
  password: string,
  rules: PasswordValidationRules = DEFAULT_RULES,
): { isValid: boolean; errors: string[] } {
  const strength = calculatePasswordStrength(password, rules)
  const isValid = strength.score >= 2 // Require at least "Fair" strength

  return {
    isValid,
    errors: strength.score < 2 ? strength.feedback : [],
  }
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): { isValid: boolean; error?: string } {
  if (!confirmPassword) {
    return { isValid: false, error: "Please confirm your password" }
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" }
  }

  return { isValid: true }
}

/**
 * Get password requirements text for UI display
 */
export function getPasswordRequirements(rules: PasswordValidationRules = DEFAULT_RULES): string[] {
  const requirements: string[] = []

  requirements.push(`At least ${rules.minLength} characters`)

  if (rules.requireUppercase) {
    requirements.push("One uppercase letter")
  }

  if (rules.requireLowercase) {
    requirements.push("One lowercase letter")
  }

  if (rules.requireNumbers) {
    requirements.push("One number")
  }

  if (rules.requireSpecialChars) {
    requirements.push("One special character (!@#$%^&*)")
  }

  if (rules.checkCommonPatterns) {
    requirements.push("Avoid common patterns")
  }

  return requirements
}
