/**
 * Twilio SMS Service
 * Handles SMS sending for 2FA and notifications
 */

import AsyncStorage from "@react-native-async-storage/async-storage"

export interface SMSConfig {
  accountSid: string
  authToken: string
  fromNumber: string
  verifyServiceId?: string
}

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
  status?: string
}

export interface VerificationResult {
  success: boolean
  status?: "pending" | "approved" | "canceled" | "failed"
  error?: string
}

class TwilioService {
  private config: SMSConfig
  private baseUrl = "https://api.twilio.com/2010-04-01"
  private verifyUrl = "https://verify.twilio.com/v2"

  constructor() {
    this.config = {
      accountSid: process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID || "",
      authToken: process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN || "",
      fromNumber: process.env.EXPO_PUBLIC_TWILIO_PHONE_NUMBER || "",
      verifyServiceId: process.env.EXPO_PUBLIC_TWILIO_VERIFY_SERVICE_ID || "",
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    try {
      if (!this.validatePhoneNumber(to)) {
        return { success: false, error: "Invalid phone number format" }
      }

      const url = `${this.baseUrl}/Accounts/${this.config.accountSid}/Messages.json`

      const auth = this.getAuthHeader()
      const body = new URLSearchParams({
        To: to,
        From: this.config.fromNumber,
        Body: message,
      })

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": auth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Twilio SMS error:", data)
        return {
          success: false,
          error: data.message || "Failed to send SMS",
        }
      }

      return {
        success: true,
        messageId: data.sid,
        status: data.status,
      }
    } catch (error) {
      console.error("SMS sending failed:", error)
      return {
        success: false,
        error: "Failed to send SMS",
      }
    }
  }

  /**
   * Send verification code via Twilio Verify
   */
  async sendVerificationCode(
    phoneNumber: string,
    channel: "sms" | "call" = "sms",
  ): Promise<SMSResult> {
    try {
      if (!this.config.verifyServiceId) {
        // Fallback to regular SMS with generated code
        return this.sendSMSWithCode(phoneNumber)
      }

      const url = `${this.verifyUrl}/Services/${this.config.verifyServiceId}/Verifications`

      const auth = this.getAuthHeader()
      const body = new URLSearchParams({
        To: phoneNumber,
        Channel: channel,
      })

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": auth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Twilio Verify error:", data)
        return {
          success: false,
          error: data.message || "Failed to send verification code",
        }
      }

      return {
        success: true,
        messageId: data.sid,
        status: data.status,
      }
    } catch (error) {
      console.error("Verification code sending failed:", error)
      return {
        success: false,
        error: "Failed to send verification code",
      }
    }
  }

  /**
   * Verify the code entered by user
   */
  async verifyCode(phoneNumber: string, code: string): Promise<VerificationResult> {
    try {
      if (!this.config.verifyServiceId) {
        // Fallback to local verification
        return this.verifyLocalCode(phoneNumber, code)
      }

      const url = `${this.verifyUrl}/Services/${this.config.verifyServiceId}/VerificationCheck`

      const auth = this.getAuthHeader()
      const body = new URLSearchParams({
        To: phoneNumber,
        Code: code,
      })

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": auth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Twilio verification error:", data)
        return {
          success: false,
          error: data.message || "Verification failed",
        }
      }

      return {
        success: data.status === "approved",
        status: data.status,
      }
    } catch (error) {
      console.error("Code verification failed:", error)
      return {
        success: false,
        error: "Failed to verify code",
      }
    }
  }

  /**
   * Send SMS with generated code (fallback when Verify not available)
   */
  private async sendSMSWithCode(phoneNumber: string): Promise<SMSResult> {
    const code = this.generateVerificationCode()

    // Store code for later verification
    await this.storeVerificationCode(phoneNumber, code)

    const message = `Your Stitch & Wear verification code is: ${code}. Valid for 5 minutes.`

    return this.sendSMS(phoneNumber, message)
  }

  /**
   * Verify locally stored code (fallback)
   */
  private async verifyLocalCode(phoneNumber: string, code: string): Promise<VerificationResult> {
    try {
      const storedData = await AsyncStorage.getItem(`sms_code_${phoneNumber}`)

      if (!storedData) {
        return {
          success: false,
          error: "No verification code found",
        }
      }

      const { code: storedCode, timestamp } = JSON.parse(storedData)

      // Check expiration (5 minutes)
      const isExpired = Date.now() - timestamp > 5 * 60 * 1000
      if (isExpired) {
        await AsyncStorage.removeItem(`sms_code_${phoneNumber}`)
        return {
          success: false,
          error: "Verification code expired",
        }
      }

      // Verify code
      if (code === storedCode) {
        await AsyncStorage.removeItem(`sms_code_${phoneNumber}`)
        return {
          success: true,
          status: "approved",
        }
      }

      return {
        success: false,
        error: "Invalid verification code",
      }
    } catch (error) {
      console.error("Local verification failed:", error)
      return {
        success: false,
        error: "Verification failed",
      }
    }
  }

  /**
   * Store verification code locally
   */
  private async storeVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const data = {
      code,
      timestamp: Date.now(),
    }

    await AsyncStorage.setItem(`sms_code_${phoneNumber}`, JSON.stringify(data))
  }

  /**
   * Generate 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/
    return e164Regex.test(phoneNumber)
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): string {
    const credentials = `${this.config.accountSid}:${this.config.authToken}`
    const encoded = Buffer.from(credentials).toString("base64")
    return `Basic ${encoded}`
  }

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phoneNumber: string, countryCode: string = "+1"): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "")

    // Add country code if not present
    if (!phoneNumber.startsWith("+")) {
      // Remove leading 1 for US numbers if present
      if (countryCode === "+1" && cleaned.length === 11 && cleaned.startsWith("1")) {
        cleaned = cleaned.substring(1)
      }

      return `${countryCode}${cleaned}`
    }

    return phoneNumber
  }

  /**
   * Send notification SMS
   */
  async sendNotification(
    phoneNumber: string,
    notification: {
      type: "order_update" | "appointment_reminder" | "promotion"
      message: string
    },
  ): Promise<SMSResult> {
    const formattedMessage = this.formatNotificationMessage(notification)
    return this.sendSMS(phoneNumber, formattedMessage)
  }

  /**
   * Format notification message
   */
  private formatNotificationMessage(notification: { type: string; message: string }): string {
    const prefix = "Stitch & Wear: "
    const suffix = "\nReply STOP to unsubscribe."

    return `${prefix}${notification.message}${suffix}`
  }

  /**
   * Check if phone number is opted out
   */
  async isOptedOut(phoneNumber: string): Promise<boolean> {
    try {
      const optedOut = await AsyncStorage.getItem(`sms_opted_out_${phoneNumber}`)
      return optedOut === "true"
    } catch {
      return false
    }
  }

  /**
   * Opt out phone number from SMS
   */
  async optOut(phoneNumber: string): Promise<void> {
    await AsyncStorage.setItem(`sms_opted_out_${phoneNumber}`, "true")
  }

  /**
   * Opt in phone number for SMS
   */
  async optIn(phoneNumber: string): Promise<void> {
    await AsyncStorage.removeItem(`sms_opted_out_${phoneNumber}`)
  }

  /**
   * Get SMS usage statistics
   */
  async getUsageStats(): Promise<{
    sent: number
    failed: number
    lastReset: string
  }> {
    try {
      const stats = await AsyncStorage.getItem("sms_usage_stats")
      if (stats) {
        return JSON.parse(stats)
      }
    } catch {
      // Ignore errors
    }

    return {
      sent: 0,
      failed: 0,
      lastReset: new Date().toISOString(),
    }
  }

  /**
   * Update usage statistics
   */
  private async updateUsageStats(success: boolean): Promise<void> {
    try {
      const stats = await this.getUsageStats()

      if (success) {
        stats.sent++
      } else {
        stats.failed++
      }

      await AsyncStorage.setItem("sms_usage_stats", JSON.stringify(stats))
    } catch {
      // Ignore errors
    }
  }
}

export default TwilioService
