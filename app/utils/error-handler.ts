/**
 * Error Handling Utilities
 * Provides user-friendly error messages and error categorization
 */

export interface AuthError {
  code: string
  message: string
  userMessage: string
  actionable: boolean
  suggestion?: string
  retryable: boolean
}

export class ErrorHandler {
  /**
   * Map Appwrite error codes to user-friendly messages
   */
  private static appwriteErrorMap: Record<string, AuthError> = {
    // Authentication errors
    '401': {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
      userMessage: 'The email or password you entered is incorrect.',
      actionable: true,
      suggestion: 'Please check your email and password and try again.',
      retryable: true
    },
    'user_invalid_credentials': {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
      userMessage: 'The email or password you entered is incorrect.',
      actionable: true,
      suggestion: 'Please check your email and password and try again.',
      retryable: true
    },
    'user_email_already_exists': {
      code: 'EMAIL_EXISTS',
      message: 'Email already exists',
      userMessage: 'An account with this email already exists.',
      actionable: true,
      suggestion: 'Try signing in instead, or use a different email address.',
      retryable: false
    },
    'user_password_mismatch': {
      code: 'PASSWORD_MISMATCH',
      message: 'Password mismatch',
      userMessage: 'The current password you entered is incorrect.',
      actionable: true,
      suggestion: 'Please enter your current password correctly.',
      retryable: true
    },
    'user_invalid_token': {
      code: 'INVALID_TOKEN',
      message: 'Invalid token',
      userMessage: 'Your session has expired.',
      actionable: true,
      suggestion: 'Please sign in again to continue.',
      retryable: false
    },
    'user_not_found': {
      code: 'USER_NOT_FOUND',
      message: 'User not found',
      userMessage: 'No account found with this email address.',
      actionable: true,
      suggestion: 'Please check your email or create a new account.',
      retryable: false
    },
    'user_blocked': {
      code: 'USER_BLOCKED',
      message: 'User blocked',
      userMessage: 'Your account has been temporarily blocked.',
      actionable: true,
      suggestion: 'Please contact support for assistance.',
      retryable: false
    },
    'user_email_not_whitelisted': {
      code: 'EMAIL_NOT_WHITELISTED',
      message: 'Email not whitelisted',
      userMessage: 'This email domain is not allowed.',
      actionable: true,
      suggestion: 'Please use a different email address or contact support.',
      retryable: false
    },
    'user_password_recently_used': {
      code: 'PASSWORD_RECENTLY_USED',
      message: 'Password recently used',
      userMessage: 'You cannot use a recently used password.',
      actionable: true,
      suggestion: 'Please choose a different password.',
      retryable: true
    },
    'password_personal_data': {
      code: 'PASSWORD_PERSONAL_DATA',
      message: 'Password contains personal data',
      userMessage: 'Your password cannot contain personal information.',
      actionable: true,
      suggestion: 'Choose a password that doesn\'t include your name, email, or other personal details.',
      retryable: true
    },
    'password_history': {
      code: 'PASSWORD_HISTORY',
      message: 'Password in history',
      userMessage: 'You cannot reuse a previous password.',
      actionable: true,
      suggestion: 'Please choose a new password you haven\'t used before.',
      retryable: true
    },
    
    // Network errors
    'network_request_failed': {
      code: 'NETWORK_ERROR',
      message: 'Network request failed',
      userMessage: 'Unable to connect to our servers.',
      actionable: true,
      suggestion: 'Please check your internet connection and try again.',
      retryable: true
    },
    'timeout': {
      code: 'TIMEOUT',
      message: 'Request timeout',
      userMessage: 'The request took too long to complete.',
      actionable: true,
      suggestion: 'Please check your connection and try again.',
      retryable: true
    },
    
    // Server errors
    '500': {
      code: 'SERVER_ERROR',
      message: 'Internal server error',
      userMessage: 'Something went wrong on our end.',
      actionable: false,
      suggestion: 'Please try again in a few minutes.',
      retryable: true
    },
    '503': {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service unavailable',
      userMessage: 'Our service is temporarily unavailable.',
      actionable: false,
      suggestion: 'Please try again in a few minutes.',
      retryable: true
    },
    
    // Rate limiting
    'general_rate_limit_exceeded': {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      userMessage: 'Too many attempts. Please wait before trying again.',
      actionable: true,
      suggestion: 'Wait a few minutes before your next attempt.',
      retryable: true
    },
    
    // Email verification
    'user_email_not_confirmed': {
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Email not verified',
      userMessage: 'Please verify your email address before signing in.',
      actionable: true,
      suggestion: 'Check your email for a verification link.',
      retryable: false
    },
    
    // Two-factor authentication
    'user_phone_not_verified': {
      code: 'PHONE_NOT_VERIFIED',
      message: 'Phone not verified',
      userMessage: 'Please verify your phone number.',
      actionable: true,
      suggestion: 'Check your SMS for a verification code.',
      retryable: false
    },
    
    // General errors
    'general_unknown': {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error',
      userMessage: 'An unexpected error occurred.',
      actionable: false,
      suggestion: 'Please try again or contact support if the problem persists.',
      retryable: true
    }
  }

  /**
   * Parse and categorize authentication errors
   */
  static parseAuthError(error: any): AuthError {
    // Handle string errors
    if (typeof error === 'string') {
      return this.getErrorByMessage(error)
    }

    // Handle error objects with code
    if (error?.code) {
      const mappedError = this.appwriteErrorMap[error.code]
      if (mappedError) {
        return mappedError
      }
    }

    // Handle error objects with type
    if (error?.type) {
      const mappedError = this.appwriteErrorMap[error.type]
      if (mappedError) {
        return mappedError
      }
    }

    // Handle HTTP status codes
    if (error?.status) {
      const mappedError = this.appwriteErrorMap[error.status.toString()]
      if (mappedError) {
        return mappedError
      }
    }

    // Handle error messages
    if (error?.message) {
      return this.getErrorByMessage(error.message)
    }

    // Default unknown error
    return this.appwriteErrorMap['general_unknown']
  }

  /**
   * Get error by message content
   */
  private static getErrorByMessage(message: string): AuthError {
    const lowerMessage = message.toLowerCase()

    // Network-related errors
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return this.appwriteErrorMap['network_request_failed']
    }

    // Authentication-related errors
    if (lowerMessage.includes('invalid credentials') || lowerMessage.includes('invalid email or password')) {
      return this.appwriteErrorMap['user_invalid_credentials']
    }

    if (lowerMessage.includes('email already exists') || lowerMessage.includes('email taken')) {
      return this.appwriteErrorMap['user_email_already_exists']
    }

    if (lowerMessage.includes('user not found') || lowerMessage.includes('no user found')) {
      return this.appwriteErrorMap['user_not_found']
    }

    if (lowerMessage.includes('session expired') || lowerMessage.includes('token expired')) {
      return this.appwriteErrorMap['user_invalid_token']
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return this.appwriteErrorMap['general_rate_limit_exceeded']
    }

    if (lowerMessage.includes('timeout')) {
      return this.appwriteErrorMap['timeout']
    }

    if (lowerMessage.includes('email not verified') || lowerMessage.includes('email not confirmed')) {
      return this.appwriteErrorMap['user_email_not_confirmed']
    }

    // Default to unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: message,
      userMessage: 'An unexpected error occurred.',
      actionable: false,
      suggestion: 'Please try again or contact support if the problem persists.',
      retryable: true
    }
  }

  /**
   * Create user-friendly error message with suggestions
   */
  static formatErrorMessage(error: any, includeActions: boolean = true): string {
    const authError = this.parseAuthError(error)
    
    if (includeActions && authError.suggestion) {
      return `${authError.userMessage} ${authError.suggestion}`
    }
    
    return authError.userMessage
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: any): boolean {
    const authError = this.parseAuthError(error)
    return authError.retryable
  }

  /**
   * Check if error requires user action
   */
  static isActionable(error: any): boolean {
    const authError = this.parseAuthError(error)
    return authError.actionable
  }

  /**
   * Get error category for analytics/logging
   */
  static getErrorCategory(error: any): string {
    const authError = this.parseAuthError(error)
    
    if (authError.code.includes('NETWORK') || authError.code.includes('TIMEOUT')) {
      return 'NETWORK'
    }
    
    if (authError.code.includes('CREDENTIALS') || authError.code.includes('PASSWORD')) {
      return 'AUTHENTICATION'
    }
    
    if (authError.code.includes('EMAIL') || authError.code.includes('VERIFICATION')) {
      return 'VERIFICATION'
    }
    
    if (authError.code.includes('RATE_LIMIT')) {
      return 'RATE_LIMITING'
    }
    
    if (authError.code.includes('SERVER') || authError.code.includes('SERVICE')) {
      return 'SERVER'
    }
    
    return 'UNKNOWN'
  }

  /**
   * Create detailed error object for logging
   */
  static createLogError(error: any, context: Record<string, any> = {}): {
    code: string
    message: string
    userMessage: string
    category: string
    retryable: boolean
    context: Record<string, any>
    timestamp: string
  } {
    const authError = this.parseAuthError(error)
    
    return {
      code: authError.code,
      message: authError.message,
      userMessage: authError.userMessage,
      category: this.getErrorCategory(error),
      retryable: authError.retryable,
      context,
      timestamp: new Date().toISOString()
    }
  }
}