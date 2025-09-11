/**
 * Rate Limiting Utilities
 * Provides client-side rate limiting for login attempts and other sensitive operations
 */

import { storage } from "./storage"

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // Time window in milliseconds
  blockDurationMs: number // How long to block after max attempts
}

export interface RateLimitResult {
  allowed: boolean
  attemptsRemaining: number
  resetTime?: Date
  blockTime?: Date
}

interface AttemptRecord {
  count: number
  firstAttempt: number
  lastAttempt: number
  blockedUntil?: number
}

export class RateLimiter {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  }

  /**
   * Check if an operation is allowed for a given key
   */
  static checkLimit(key: string, config: Partial<RateLimitConfig> = {}): RateLimitResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    const storageKey = `rate_limit_${key}`
    const now = Date.now()

    try {
      const record = this.getAttemptRecord(storageKey)

      // Check if currently blocked
      if (record.blockedUntil && now < record.blockedUntil) {
        return {
          allowed: false,
          attemptsRemaining: 0,
          blockTime: new Date(record.blockedUntil),
        }
      }

      // Reset if window has expired
      if (now - record.firstAttempt > finalConfig.windowMs) {
        this.resetAttempts(storageKey)
        return {
          allowed: true,
          attemptsRemaining: finalConfig.maxAttempts - 1,
        }
      }

      // Check if max attempts reached
      if (record.count >= finalConfig.maxAttempts) {
        const blockUntil = now + finalConfig.blockDurationMs
        this.blockKey(storageKey, blockUntil)

        return {
          allowed: false,
          attemptsRemaining: 0,
          blockTime: new Date(blockUntil),
        }
      }

      // Allow the attempt
      return {
        allowed: true,
        attemptsRemaining: finalConfig.maxAttempts - record.count,
        resetTime: new Date(record.firstAttempt + finalConfig.windowMs),
      }
    } catch (error) {
      console.warn("Rate limiter error:", error)
      // If rate limiter fails, allow the operation
      return {
        allowed: true,
        attemptsRemaining: finalConfig.maxAttempts,
      }
    }
  }

  /**
   * Record a failed attempt
   */
  static recordAttempt(key: string): void {
    const storageKey = `rate_limit_${key}`
    const now = Date.now()

    try {
      const record = this.getAttemptRecord(storageKey)

      // If this is a new window, reset
      if (now - record.firstAttempt > this.DEFAULT_CONFIG.windowMs) {
        this.saveAttemptRecord(storageKey, {
          count: 1,
          firstAttempt: now,
          lastAttempt: now,
        })
      } else {
        // Increment existing record
        this.saveAttemptRecord(storageKey, {
          ...record,
          count: record.count + 1,
          lastAttempt: now,
        })
      }
    } catch (error) {
      console.warn("Failed to record rate limit attempt:", error)
    }
  }

  /**
   * Reset attempts for a key (e.g., after successful login)
   */
  static resetAttempts(key: string): void {
    const storageKey = `rate_limit_${key}`

    try {
      storage.remove(storageKey)
    } catch (error) {
      console.warn("Failed to reset rate limit attempts:", error)
    }
  }

  /**
   * Check login attempts for an email
   */
  static checkLoginAttempts(email: string): RateLimitResult {
    return this.checkLimit(`login_${email.toLowerCase()}`, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
    })
  }

  /**
   * Record a failed login attempt
   */
  static recordFailedLogin(email: string): void {
    this.recordAttempt(`login_${email.toLowerCase()}`)
  }

  /**
   * Reset login attempts after successful login
   */
  static resetLoginAttempts(email: string): void {
    this.resetAttempts(`login_${email.toLowerCase()}`)
  }

  /**
   * Check password reset attempts
   */
  static checkPasswordResetAttempts(email: string): RateLimitResult {
    return this.checkLimit(`password_reset_${email.toLowerCase()}`, {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours
    })
  }

  /**
   * Record a password reset attempt
   */
  static recordPasswordResetAttempt(email: string): void {
    this.recordAttempt(`password_reset_${email.toLowerCase()}`)
  }

  /**
   * Check registration attempts from IP/device
   */
  static checkRegistrationAttempts(): RateLimitResult {
    return this.checkLimit("registration_device", {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours
    })
  }

  /**
   * Record a registration attempt
   */
  static recordRegistrationAttempt(): void {
    this.recordAttempt("registration_device")
  }

  /**
   * Check email verification attempts
   */
  static checkEmailVerificationAttempts(email: string): RateLimitResult {
    return this.checkLimit(`email_verification_${email.toLowerCase()}`, {
      maxAttempts: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours
    })
  }

  /**
   * Record an email verification attempt
   */
  static recordEmailVerificationAttempt(email: string): void {
    this.recordAttempt(`email_verification_${email.toLowerCase()}`)
  }

  /**
   * Get time remaining until block expires
   */
  static getBlockTimeRemaining(key: string): number {
    const storageKey = `rate_limit_${key}`

    try {
      const record = this.getAttemptRecord(storageKey)

      if (record.blockedUntil) {
        const remaining = record.blockedUntil - Date.now()
        return Math.max(0, remaining)
      }

      return 0
    } catch (error) {
      console.warn("Failed to get block time:", error)
      return 0
    }
  }

  /**
   * Format time remaining as human-readable string
   */
  static formatTimeRemaining(milliseconds: number): string {
    if (milliseconds <= 0) return "now"

    const minutes = Math.ceil(milliseconds / (60 * 1000))

    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? "" : "s"}`
    }

    const hours = Math.ceil(minutes / 60)
    return `${hours} hour${hours === 1 ? "" : "s"}`
  }

  /**
   * Get rate limit status for debugging
   */
  static getStatus(key: string): {
    attempts: number
    blocked: boolean
    blockTimeRemaining: number
    resetTime: Date | null
  } {
    const storageKey = `rate_limit_${key}`
    const now = Date.now()

    try {
      const record = this.getAttemptRecord(storageKey)
      const blocked = record.blockedUntil ? now < record.blockedUntil : false
      const blockTimeRemaining = blocked && record.blockedUntil ? record.blockedUntil - now : 0

      return {
        attempts: record.count,
        blocked,
        blockTimeRemaining,
        resetTime: record.firstAttempt
          ? new Date(record.firstAttempt + this.DEFAULT_CONFIG.windowMs)
          : null,
      }
    } catch (error) {
      return {
        attempts: 0,
        blocked: false,
        blockTimeRemaining: 0,
        resetTime: null,
      }
    }
  }

  // Private helper methods

  private static getAttemptRecord(storageKey: string): AttemptRecord {
    try {
      const stored = storage.getObject(storageKey) as AttemptRecord | null
      return (
        stored || {
          count: 0,
          firstAttempt: Date.now(),
          lastAttempt: Date.now(),
        }
      )
    } catch (error) {
      return {
        count: 0,
        firstAttempt: Date.now(),
        lastAttempt: Date.now(),
      }
    }
  }

  private static saveAttemptRecord(storageKey: string, record: AttemptRecord): void {
    storage.set(storageKey, record)
  }

  private static blockKey(storageKey: string, blockUntil: number): void {
    const record = this.getAttemptRecord(storageKey)
    this.saveAttemptRecord(storageKey, {
      ...record,
      blockedUntil: blockUntil,
    })
  }
}
