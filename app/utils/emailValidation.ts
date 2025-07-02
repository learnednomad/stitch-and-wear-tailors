/**
 * Email validation utilities with comprehensive format and domain checking
 */

export interface EmailValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

// Comprehensive email regex pattern (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// Common email providers for suggestions
const COMMON_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "mail.com",
]

// Common typos and their corrections
const PROVIDER_CORRECTIONS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "yahho.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outloo.com": "outlook.com",
  "outlook.co": "outlook.com",
  "iclou.com": "icloud.com",
  "icloud.co": "icloud.com",
}

// Disposable email domains to warn against
const DISPOSABLE_DOMAINS = [
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.org",
  "throwaway.email",
  "temp-mail.org",
  "getairmail.com",
]

/**
 * Comprehensive email validation with detailed feedback
 */
export function validateEmail(email: string): EmailValidationResult {
  const result: EmailValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
    suggestions: [],
  }

  if (!email) {
    result.errors.push("Email address is required")
    return result
  }

  const trimmedEmail = email.trim().toLowerCase()

  // Basic format validation
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    result.errors.push("Please enter a valid email address")
    
    // Provide specific format hints
    if (!trimmedEmail.includes("@")) {
      result.errors.push("Email must contain @ symbol")
    } else if (trimmedEmail.indexOf("@") !== trimmedEmail.lastIndexOf("@")) {
      result.errors.push("Email can only contain one @ symbol")
    } else if (!trimmedEmail.includes(".")) {
      result.errors.push("Email must contain a domain (e.g., .com)")
    }
    
    return result
  }

  // Extract domain for further validation
  const [localPart, domain] = trimmedEmail.split("@")
  
  // Validate local part (before @)
  if (localPart.length === 0) {
    result.errors.push("Email cannot start with @")
    return result
  }
  
  if (localPart.length > 64) {
    result.errors.push("Email address is too long before @")
    return result
  }

  // Validate domain part
  if (domain.length === 0) {
    result.errors.push("Email must have a domain after @")
    return result
  }

  if (domain.length > 253) {
    result.errors.push("Domain name is too long")
    return result
  }

  // Check for domain typos and suggest corrections
  const suggestion = suggestDomainCorrection(domain)
  if (suggestion) {
    result.suggestions.push(`Did you mean ${localPart}@${suggestion}?`)
  }

  // Check for disposable email domains
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    result.warnings.push("Temporary email addresses may not receive important notifications")
  }

  // Check for unusual but valid domains
  if (!domain.includes(".") || domain.endsWith(".")) {
    result.errors.push("Domain must end with a valid extension (e.g., .com)")
    return result
  }

  // Advanced domain validation
  const domainParts = domain.split(".")
  const tld = domainParts[domainParts.length - 1]
  
  if (tld.length < 2) {
    result.errors.push("Domain extension must be at least 2 characters")
    return result
  }

  // Check for common patterns that might indicate typos
  if (domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) {
    result.errors.push("Invalid domain format")
    return result
  }

  // If we reach here, email is valid
  result.isValid = true

  // Provide helpful warnings for less common but valid emails
  if (!COMMON_PROVIDERS.includes(domain)) {
    result.warnings.push("Please double-check your email address")
  }

  return result
}

/**
 * Suggest domain corrections for common typos
 */
function suggestDomainCorrection(domain: string): string | null {
  // Direct match in corrections table
  if (PROVIDER_CORRECTIONS[domain]) {
    return PROVIDER_CORRECTIONS[domain]
  }

  // Calculate edit distance for close matches
  for (const provider of COMMON_PROVIDERS) {
    if (calculateEditDistance(domain, provider) <= 2 && domain.length > 3) {
      return provider
    }
  }

  return null
}

/**
 * Calculate Levenshtein distance between two strings
 */
function calculateEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null))

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[a.length][b.length]
}

/**
 * Simple email format check for basic validation
 */
export function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase())
}

/**
 * Check if email uses a disposable domain
 */
export function isDisposableEmail(email: string): boolean {
  if (!email.includes("@")) return false
  const domain = email.split("@")[1]?.toLowerCase()
  return DISPOSABLE_DOMAINS.includes(domain)
}

/**
 * Get email validation requirements for UI display
 */
export function getEmailRequirements(): string[] {
  return [
    "Valid email format (e.g., user@example.com)",
    "Working email address for account verification",
    "Avoid temporary email services",
  ]
}

/**
 * Normalize email for storage (lowercase, trimmed)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}