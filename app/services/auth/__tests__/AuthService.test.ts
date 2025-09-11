/**
 * AuthService Test Suite
 * Tests for the core authentication service
 */

import AuthService from "../AuthService"
import { appwriteAccount } from "../../appwrite/appwrite-client"
import { RateLimiter } from "@/utils/rate-limiter"
import { validateEmail } from "@/utils/emailValidation"
import { validatePassword } from "@/utils/passwordValidation"

// Mock dependencies
jest.mock("../../appwrite/appwrite-client")
jest.mock("@/utils/rate-limiter")
jest.mock("@/utils/emailValidation")
jest.mock("@/utils/passwordValidation")
jest.mock("../SessionManager")
jest.mock("../TokenService")
jest.mock("../EmailVerificationService")

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset rate limiter
    ;(RateLimiter.checkRegistrationAttempts as jest.Mock).mockReturnValue(true)
    ;(RateLimiter.checkLoginAttempts as jest.Mock).mockReturnValue({ allowed: true })
  })

  describe("register", () => {
    const validRegistrationData = {
      email: "test@example.com",
      password: "Test123!@#",
      firstName: "John",
      lastName: "Doe",
      userType: "client" as const,
      phone: "+1234567890",
    }

    beforeEach(() => {
      // Mock validation functions
      ;(validateEmail as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      })
      ;(validatePassword as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        strength: 80,
        score: 4,
      })
    })

    it("should successfully register a new user", async () => {
      // Mock Appwrite account creation
      const mockUser = {
        $id: "user123",
        email: validRegistrationData.email,
        name: `${validRegistrationData.firstName} ${validRegistrationData.lastName}`,
        emailVerification: false,
        registration: new Date().toISOString(),
      }
      ;(appwriteAccount.create as jest.Mock).mockResolvedValue(mockUser)

      const result = await AuthService.register(validRegistrationData)

      expect(result.success).toBe(true)
      expect(result.requiresVerification).toBe(true)
      expect(appwriteAccount.create).toHaveBeenCalledWith(
        expect.any(String),
        validRegistrationData.email.toLowerCase(),
        validRegistrationData.password,
        `${validRegistrationData.firstName} ${validRegistrationData.lastName}`,
      )
    })

    it("should fail registration with invalid email", async () => {
      ;(validateEmail as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ["Invalid email format"],
        warnings: [],
        suggestions: [],
      })

      const result = await AuthService.register({
        ...validRegistrationData,
        email: "invalid-email",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invalid email format")
      expect(appwriteAccount.create).not.toHaveBeenCalled()
    })

    it("should fail registration with weak password", async () => {
      ;(validatePassword as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ["Password too weak"],
        strength: 20,
        score: 1,
      })

      const result = await AuthService.register({
        ...validRegistrationData,
        password: "weak",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Password does not meet security requirements")
      expect(appwriteAccount.create).not.toHaveBeenCalled()
    })

    it("should handle rate limiting", async () => {
      ;(RateLimiter.checkRegistrationAttempts as jest.Mock).mockReturnValue(false)

      const result = await AuthService.register(validRegistrationData)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Too many registration attempts. Please try again later.")
      expect(appwriteAccount.create).not.toHaveBeenCalled()
    })

    it("should handle duplicate email registration", async () => {
      const error = new Error("User already exists")
      ;(error as any).code = 409
      ;(appwriteAccount.create as jest.Mock).mockRejectedValue(error)

      const result = await AuthService.register(validRegistrationData)

      expect(result.success).toBe(false)
      expect(result.error).toContain("already exists")
    })
  })

  describe("login", () => {
    const validCredentials = {
      email: "test@example.com",
      password: "Test123!@#",
      rememberMe: true,
    }

    beforeEach(() => {
      ;(validateEmail as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      })
    })

    it("should successfully login a verified user", async () => {
      // Mock session creation
      const mockSession = {
        $id: "session123",
        expire: new Date(Date.now() + 3600000).toISOString(),
      }
      ;(appwriteAccount.createEmailPasswordSession as jest.Mock).mockResolvedValue(mockSession)

      // Mock user account
      const mockUser = {
        $id: "user123",
        email: validCredentials.email,
        emailVerification: true,
        name: "John Doe",
      }
      ;(appwriteAccount.get as jest.Mock).mockResolvedValue(mockUser)

      const result = await AuthService.login(validCredentials)

      expect(result.success).toBe(true)
      expect(result.requiresVerification).toBeFalsy()
      expect(result.data).toBeDefined()
      expect(appwriteAccount.createEmailPasswordSession).toHaveBeenCalledWith(
        validCredentials.email.toLowerCase(),
        validCredentials.password,
      )
    })

    it("should require email verification for unverified users", async () => {
      const mockSession = {
        $id: "session123",
        expire: new Date(Date.now() + 3600000).toISOString(),
      }
      ;(appwriteAccount.createEmailPasswordSession as jest.Mock).mockResolvedValue(mockSession)

      const mockUser = {
        $id: "user123",
        email: validCredentials.email,
        emailVerification: false,
        name: "John Doe",
      }
      ;(appwriteAccount.get as jest.Mock).mockResolvedValue(mockUser)
      ;(appwriteAccount.deleteSession as jest.Mock).mockResolvedValue({})

      const result = await AuthService.login(validCredentials)

      expect(result.success).toBe(false)
      expect(result.requiresVerification).toBe(true)
      expect(result.error).toBe("Please verify your email before signing in.")
      expect(appwriteAccount.deleteSession).toHaveBeenCalledWith(mockSession.$id)
    })

    it("should handle invalid credentials", async () => {
      const error = new Error("Invalid credentials")
      ;(error as any).code = 401
      ;(appwriteAccount.createEmailPasswordSession as jest.Mock).mockRejectedValue(error)

      const result = await AuthService.login(validCredentials)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should handle rate limiting on login", async () => {
      ;(RateLimiter.checkLoginAttempts as jest.Mock).mockReturnValue({
        allowed: false,
      })
      ;(RateLimiter.getBlockTimeRemaining as jest.Mock).mockReturnValue(300000)
      ;(RateLimiter.formatTimeRemaining as jest.Mock).mockReturnValue("5 minutes")

      const result = await AuthService.login(validCredentials)

      expect(result.success).toBe(false)
      expect(result.error).toContain("Too many failed attempts")
      expect(appwriteAccount.createEmailPasswordSession).not.toHaveBeenCalled()
    })

    it("should handle suspended accounts", async () => {
      const mockSession = {
        $id: "session123",
        expire: new Date(Date.now() + 3600000).toISOString(),
      }
      ;(appwriteAccount.createEmailPasswordSession as jest.Mock).mockResolvedValue(mockSession)

      const mockUser = {
        $id: "user123",
        email: validCredentials.email,
        emailVerification: true,
        name: "John Doe",
      }
      ;(appwriteAccount.get as jest.Mock).mockResolvedValue(mockUser)

      // Mock suspended user profile
      AuthService.getUserProfile = jest.fn().mockResolvedValue({
        status: "suspended",
        userType: "client",
      })
      ;(appwriteAccount.deleteSession as jest.Mock).mockResolvedValue({})

      const result = await AuthService.login(validCredentials)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Your account has been suspended. Please contact support.")
      expect(appwriteAccount.deleteSession).toHaveBeenCalledWith(mockSession.$id)
    })
  })

  describe("logout", () => {
    it("should successfully logout user", async () => {
      const mockSession = { $id: "session123" }
      ;(appwriteAccount.getSession as jest.Mock).mockResolvedValue(mockSession)
      ;(appwriteAccount.deleteSession as jest.Mock).mockResolvedValue({})

      const result = await AuthService.logout()

      expect(result.success).toBe(true)
      expect(appwriteAccount.deleteSession).toHaveBeenCalledWith("current")
    })

    it("should handle logout errors gracefully", async () => {
      ;(appwriteAccount.deleteSession as jest.Mock).mockRejectedValue(new Error("Network error"))

      const result = await AuthService.logout()

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to logout")
    })
  })

  describe("verifyEmail", () => {
    it("should successfully verify email", async () => {
      const mockVerificationService = {
        verifyEmail: jest.fn().mockResolvedValue({ success: true }),
      }
      ;(AuthService as any).emailVerificationService = mockVerificationService

      const result = await AuthService.verifyEmail("user123", "token123")

      expect(result.success).toBe(true)
      expect(mockVerificationService.verifyEmail).toHaveBeenCalledWith("user123", "token123")
    })

    it("should handle verification failure", async () => {
      const mockVerificationService = {
        verifyEmail: jest.fn().mockResolvedValue({
          success: false,
          error: "Invalid token",
        }),
      }
      ;(AuthService as any).emailVerificationService = mockVerificationService

      const result = await AuthService.verifyEmail("user123", "invalid-token")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invalid token")
    })
  })

  describe("resendVerificationEmail", () => {
    it("should successfully resend verification email", async () => {
      const mockVerificationService = {
        resendVerification: jest.fn().mockResolvedValue({ success: true }),
      }
      ;(AuthService as any).emailVerificationService = mockVerificationService

      const result = await AuthService.resendVerificationEmail("user123")

      expect(result.success).toBe(true)
      expect(mockVerificationService.resendVerification).toHaveBeenCalledWith("user123")
    })

    it("should handle resend failure", async () => {
      const mockVerificationService = {
        resendVerification: jest.fn().mockResolvedValue({
          success: false,
          error: "Too many attempts",
        }),
      }
      ;(AuthService as any).emailVerificationService = mockVerificationService

      const result = await AuthService.resendVerificationEmail("user123")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Too many attempts")
    })
  })
})
