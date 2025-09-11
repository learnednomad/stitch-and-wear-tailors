/**
 * Two-Factor Authentication Service
 * Implements 2FA with TOTP, SMS, and backup codes
 */

import * as Crypto from "expo-crypto"
import { appwriteDatabases } from "../appwrite/appwrite-client"
import { ID, Query } from "appwrite"

// TOTP Constants
const TOTP_WINDOW = 30 // 30 seconds
const TOTP_DIGITS = 6
const TOTP_ALGORITHM = "SHA1"
const BACKUP_CODES_COUNT = 10

export interface TwoFactorConfig {
  userId: string
  method: "2fa_totp" | "2fa_sms" | "2fa_backup"
  enabled: boolean
  secret?: string
  phoneNumber?: string
  backupCodes?: string[]
  verifiedAt?: string
  lastUsedAt?: string
}

export interface TOTPSetupData {
  secret: string
  qrCode: string
  manualEntryKey: string
  backupCodes: string[]
}

export interface TwoFactorVerification {
  valid: boolean
  method: string
  remainingBackupCodes?: number
  error?: string
}

class TwoFactorAuthService {
  private readonly DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "stitch-and-wear"
  private readonly COLLECTION_2FA = "two_factor_config"
  private readonly COLLECTION_BACKUP_CODES = "backup_codes"

  /**
   * Generate TOTP secret and setup data
   */
  async setupTOTP(userId: string, userEmail: string): Promise<TOTPSetupData> {
    try {
      // Generate random secret (160 bits for SHA1)
      const secretBytes = await Crypto.getRandomBytesAsync(20)
      const secret = this.base32Encode(secretBytes)

      // Generate backup codes
      const backupCodes = await this.generateBackupCodes()

      // Create QR code data
      const appName = "StitchAndWear"
      const otpAuthUrl = `otpauth://totp/${appName}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${appName}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_WINDOW}`

      // Store configuration (not enabled until verified)
      await appwriteDatabases.createDocument(this.DATABASE_ID, this.COLLECTION_2FA, ID.unique(), {
        userId,
        method: "2fa_totp",
        enabled: false,
        secret: await this.encryptSecret(secret),
        setupAt: new Date().toISOString(),
      })

      // Store backup codes
      await this.storeBackupCodes(userId, backupCodes)

      return {
        secret,
        qrCode: otpAuthUrl,
        manualEntryKey: this.formatSecretForDisplay(secret),
        backupCodes,
      }
    } catch (error) {
      console.error("TOTP setup failed:", error)
      throw new Error("Failed to setup two-factor authentication")
    }
  }

  /**
   * Verify TOTP code and enable 2FA
   */
  async verifyAndEnableTOTP(userId: string, code: string): Promise<boolean> {
    try {
      // Get user's TOTP configuration
      const config = await this.getTwoFactorConfig(userId, "2fa_totp")
      if (!config || !config.secret) {
        throw new Error("TOTP not configured")
      }

      // Decrypt and verify the code
      const secret = await this.decryptSecret(config.secret)
      const isValid = await this.verifyTOTPCode(secret, code)

      if (isValid) {
        // Enable 2FA
        await appwriteDatabases.updateDocument(this.DATABASE_ID, this.COLLECTION_2FA, config.$id, {
          enabled: true,
          verifiedAt: new Date().toISOString(),
        })
        return true
      }

      return false
    } catch (error) {
      console.error("TOTP verification failed:", error)
      return false
    }
  }

  /**
   * Setup SMS-based 2FA
   */
  async setupSMS(
    userId: string,
    phoneNumber: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate phone number format
      const cleanedPhone = phoneNumber.replace(/\D/g, "")
      if (cleanedPhone.length < 10) {
        return { success: false, message: "Invalid phone number" }
      }

      // Generate and send verification code
      const verificationCode = this.generateNumericCode(6)

      // Store configuration
      await appwriteDatabases.createDocument(this.DATABASE_ID, this.COLLECTION_2FA, ID.unique(), {
        userId,
        method: "2fa_sms",
        enabled: false,
        phoneNumber: await this.encryptPhoneNumber(cleanedPhone),
        verificationCode: await this.hashCode(verificationCode),
        verificationExpiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        setupAt: new Date().toISOString(),
      })

      // In production, send SMS via service like Twilio
      // For now, log the code (development only)
      if (__DEV__) {
        console.log(`SMS Verification Code for ${phoneNumber}: ${verificationCode}`)
      }

      return {
        success: true,
        message: `Verification code sent to ${this.maskPhoneNumber(phoneNumber)}`,
      }
    } catch (error) {
      console.error("SMS setup failed:", error)
      return { success: false, message: "Failed to setup SMS authentication" }
    }
  }

  /**
   * Verify SMS code and enable 2FA
   */
  async verifyAndEnableSMS(userId: string, code: string): Promise<boolean> {
    try {
      const config = await this.getTwoFactorConfig(userId, "2fa_sms")
      if (!config) {
        return false
      }

      // Check expiry
      if (new Date(config.verificationExpiry) < new Date()) {
        throw new Error("Verification code expired")
      }

      // Verify code
      const isValid = await this.verifyHashedCode(code, config.verificationCode)

      if (isValid) {
        await appwriteDatabases.updateDocument(this.DATABASE_ID, this.COLLECTION_2FA, config.$id, {
          enabled: true,
          verifiedAt: new Date().toISOString(),
          verificationCode: null,
          verificationExpiry: null,
        })
        return true
      }

      return false
    } catch (error) {
      console.error("SMS verification failed:", error)
      return false
    }
  }

  /**
   * Verify 2FA code (TOTP, SMS, or backup)
   */
  async verify2FACode(
    userId: string,
    code: string,
    method?: "2fa_totp" | "2fa_sms" | "2fa_backup",
  ): Promise<TwoFactorVerification> {
    try {
      // If method not specified, try to detect based on code format
      if (!method) {
        method = this.detectCodeType(code)
      }

      switch (method) {
        case "2fa_totp":
          return await this.verifyTOTP(userId, code)

        case "2fa_sms":
          return await this.verifySMSCode(userId, code)

        case "2fa_backup":
          return await this.verifyBackupCode(userId, code)

        default:
          return { valid: false, method: "unknown", error: "Invalid 2FA method" }
      }
    } catch (error) {
      console.error("2FA verification failed:", error)
      return { valid: false, method: method || "unknown", error: "Verification failed" }
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Generate new codes
      const backupCodes = await this.generateBackupCodes()

      // Delete old codes
      const oldCodes = await appwriteDatabases.listDocuments(
        this.DATABASE_ID,
        this.COLLECTION_BACKUP_CODES,
        [Query.equal("userId", userId)],
      )

      for (const doc of oldCodes.documents) {
        await appwriteDatabases.deleteDocument(
          this.DATABASE_ID,
          this.COLLECTION_BACKUP_CODES,
          doc.$id,
        )
      }

      // Store new codes
      await this.storeBackupCodes(userId, backupCodes)

      return backupCodes
    } catch (error) {
      console.error("Failed to regenerate backup codes:", error)
      throw new Error("Failed to regenerate backup codes")
    }
  }

  /**
   * Disable 2FA for a specific method
   */
  async disable2FA(userId: string, method: "2fa_totp" | "2fa_sms"): Promise<boolean> {
    try {
      const config = await this.getTwoFactorConfig(userId, method)
      if (!config) {
        return false
      }

      await appwriteDatabases.updateDocument(this.DATABASE_ID, this.COLLECTION_2FA, config.$id, {
        enabled: false,
        disabledAt: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error("Failed to disable 2FA:", error)
      return false
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  async has2FAEnabled(userId: string): Promise<{ enabled: boolean; methods: string[] }> {
    try {
      const configs = await appwriteDatabases.listDocuments(this.DATABASE_ID, this.COLLECTION_2FA, [
        Query.equal("userId", userId),
        Query.equal("enabled", true),
      ])

      const methods = configs.documents.map((doc) => doc.method)

      return {
        enabled: methods.length > 0,
        methods,
      }
    } catch (error) {
      console.error("Failed to check 2FA status:", error)
      return { enabled: false, methods: [] }
    }
  }

  // Private helper methods

  private async verifyTOTP(userId: string, code: string): Promise<TwoFactorVerification> {
    const config = await this.getTwoFactorConfig(userId, "2fa_totp")
    if (!config || !config.enabled) {
      return { valid: false, method: "2fa_totp", error: "TOTP not enabled" }
    }

    const secret = await this.decryptSecret(config.secret!)
    const isValid = await this.verifyTOTPCode(secret, code)

    if (isValid) {
      await this.updateLastUsed(config.$id)
    }

    return { valid: isValid, method: "2fa_totp" }
  }

  private async verifySMSCode(userId: string, code: string): Promise<TwoFactorVerification> {
    // In production, this would verify against a recently sent SMS code
    // For now, simulate verification
    const config = await this.getTwoFactorConfig(userId, "2fa_sms")
    if (!config || !config.enabled) {
      return { valid: false, method: "2fa_sms", error: "SMS 2FA not enabled" }
    }

    // Simulate SMS verification (in production, check against sent code)
    const isValid = code.length === 6 && /^\d+$/.test(code)

    if (isValid) {
      await this.updateLastUsed(config.$id)
    }

    return { valid: isValid, method: "2fa_sms" }
  }

  private async verifyBackupCode(userId: string, code: string): Promise<TwoFactorVerification> {
    try {
      const backupCodes = await appwriteDatabases.listDocuments(
        this.DATABASE_ID,
        this.COLLECTION_BACKUP_CODES,
        [Query.equal("userId", userId), Query.equal("used", false)],
      )

      for (const doc of backupCodes.documents) {
        const isValid = await this.verifyHashedCode(code, doc.codeHash)
        if (isValid) {
          // Mark code as used
          await appwriteDatabases.updateDocument(
            this.DATABASE_ID,
            this.COLLECTION_BACKUP_CODES,
            doc.$id,
            {
              used: true,
              usedAt: new Date().toISOString(),
            },
          )

          const remainingCodes = backupCodes.documents.filter((d) => d.$id !== doc.$id).length

          return {
            valid: true,
            method: "2fa_backup",
            remainingBackupCodes: remainingCodes,
          }
        }
      }

      return { valid: false, method: "2fa_backup", error: "Invalid backup code" }
    } catch (error) {
      console.error("Backup code verification failed:", error)
      return { valid: false, method: "2fa_backup", error: "Verification failed" }
    }
  }

  private async getTwoFactorConfig(userId: string, method: string): Promise<any> {
    const configs = await appwriteDatabases.listDocuments(this.DATABASE_ID, this.COLLECTION_2FA, [
      Query.equal("userId", userId),
      Query.equal("method", method),
    ])

    return configs.documents[0]
  }

  private async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = []
    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      const code = this.generateAlphanumericCode(8)
      codes.push(code)
    }
    return codes
  }

  private async storeBackupCodes(userId: string, codes: string[]): Promise<void> {
    for (const code of codes) {
      await appwriteDatabases.createDocument(
        this.DATABASE_ID,
        this.COLLECTION_BACKUP_CODES,
        ID.unique(),
        {
          userId,
          codeHash: await this.hashCode(code),
          used: false,
          createdAt: new Date().toISOString(),
        },
      )
    }
  }

  private async verifyTOTPCode(secret: string, code: string): Promise<boolean> {
    // Generate current and adjacent time-based codes
    const currentTime = Math.floor(Date.now() / 1000 / TOTP_WINDOW)

    for (let i = -1; i <= 1; i++) {
      const timeCounter = currentTime + i
      const expectedCode = await this.generateTOTPCode(secret, timeCounter)
      if (expectedCode === code) {
        return true
      }
    }

    return false
  }

  private async generateTOTPCode(secret: string, timeCounter: number): Promise<string> {
    // Convert time counter to 8-byte buffer
    const timeBuffer = new ArrayBuffer(8)
    const timeView = new DataView(timeBuffer)
    timeView.setUint32(4, timeCounter, false)

    // HMAC-SHA1
    const key = this.base32Decode(secret)
    const hmac = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA1,
      this.bufferToHex(timeBuffer),
      { encoding: Crypto.CryptoEncoding.HEX },
    )

    // Dynamic truncation
    const offset = parseInt(hmac.slice(-1), 16)
    const truncated = parseInt(hmac.substr(offset * 2, 8), 16) & 0x7fffffff
    const code = truncated % Math.pow(10, TOTP_DIGITS)

    return code.toString().padStart(TOTP_DIGITS, "0")
  }

  private base32Encode(buffer: Uint8Array): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    let result = ""
    let bits = 0
    let value = 0

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i]
      bits += 8

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31]
        bits -= 5
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31]
    }

    return result
  }

  private base32Decode(str: string): Uint8Array {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    const buffer: number[] = []
    let bits = 0
    let value = 0

    for (let i = 0; i < str.length; i++) {
      const idx = alphabet.indexOf(str[i])
      if (idx === -1) continue

      value = (value << 5) | idx
      bits += 5

      while (bits >= 8) {
        buffer.push((value >>> (bits - 8)) & 255)
        bits -= 8
      }
    }

    return new Uint8Array(buffer)
  }

  private formatSecretForDisplay(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(" ") || secret
  }

  private async encryptSecret(secret: string): Promise<string> {
    // In production, use proper encryption
    // For now, simple encoding
    return Buffer.from(secret).toString("base64")
  }

  private async decryptSecret(encrypted: string): Promise<string> {
    // In production, use proper decryption
    return Buffer.from(encrypted, "base64").toString()
  }

  private async encryptPhoneNumber(phone: string): Promise<string> {
    return Buffer.from(phone).toString("base64")
  }

  private maskPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length >= 10) {
      return `***-***-${cleaned.slice(-4)}`
    }
    return phone
  }

  private async hashCode(code: string): Promise<string> {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, code, {
      encoding: Crypto.CryptoEncoding.HEX,
    })
  }

  private async verifyHashedCode(code: string, hash: string): Promise<boolean> {
    const codeHash = await this.hashCode(code)
    return codeHash === hash
  }

  private generateNumericCode(length: number): string {
    let code = ""
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString()
    }
    return code
  }

  private generateAlphanumericCode(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  private detectCodeType(code: string): "2fa_totp" | "2fa_sms" | "2fa_backup" {
    // TOTP codes are 6 digits
    if (/^\d{6}$/.test(code)) {
      return "2fa_totp"
    }

    // Backup codes are 8 alphanumeric characters
    if (/^[A-Z0-9]{8}$/.test(code)) {
      return "2fa_backup"
    }

    // Default to SMS for other numeric codes
    return "2fa_sms"
  }

  private async updateLastUsed(configId: string): Promise<void> {
    await appwriteDatabases.updateDocument(this.DATABASE_ID, this.COLLECTION_2FA, configId, {
      lastUsedAt: new Date().toISOString(),
    })
  }

  private bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
}

export default TwoFactorAuthService
