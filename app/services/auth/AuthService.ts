/**
 * AuthService — thin PocketBase-backed authentication facade.
 *
 * Keeps the public surface the auth screens already consume
 * (login/register/verifyEmail/resendVerificationEmail/getUserProfile/
 * createPasswordRecovery/updatePassword) while delegating everything to
 * PocketBase built-ins: sessions, verification tokens, password reset and
 * rate limiting all live server-side now.
 */

import { pb, handlePocketBaseError } from "../pocketbase/pocketbase-client"

export interface RegistrationData {
  email: string
  password: string
  firstName: string
  lastName: string
  userType: "client" | "tailor"
  phone?: string
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * User shape kept compatible with the old Appwrite account object that the
 * screens read ($id, name, emailVerification) plus the PocketBase fields.
 */
export interface AuthUser {
  $id: string
  id: string
  email: string
  name: string
  phone: string
  emailVerification: boolean
  userType: "client" | "tailor" | "admin"
  firstName: string
  lastName: string
  status: string
}

export interface AuthResponse {
  success: boolean
  data?: { user: AuthUser; token?: string }
  error?: string
  requiresVerification?: boolean
}

export interface UserProfile {
  userType: "client" | "tailor" | "admin"
  status: string
  firstName: string
  lastName: string
  phone: string
  email: string
  businessName?: string
  location?: string
}

function toAuthUser(record: any): AuthUser {
  const firstName = record.firstName ?? ""
  const lastName = record.lastName ?? ""
  return {
    $id: record.id,
    id: record.id,
    email: record.email ?? "",
    name: `${firstName} ${lastName}`.trim(),
    phone: record.phone ?? "",
    emailVerification: !!record.verified,
    userType: record.userType || "client",
    firstName,
    lastName,
    status: record.status ?? "active",
  }
}

class AuthService {
  /**
   * Register a new account and send the verification email.
   */
  async register(data: RegistrationData): Promise<AuthResponse> {
    try {
      const record = await pb.collection("users").create({
        email: data.email,
        password: data.password,
        passwordConfirm: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        userType: data.userType,
        phone: data.phone ?? "",
        status: "pending_verification",
      })
      pb.collection("users")
        .requestVerification(data.email)
        .catch(() => {})
      return { success: true, data: { user: toAuthUser(record) } }
    } catch (error: any) {
      return { success: false, error: handlePocketBaseError(error) }
    }
  }

  /**
   * Login with email/password. Succeeds even when the email is unverified,
   * but flags `requiresVerification` so the UI can gate access.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const auth = await pb
        .collection("users")
        .authWithPassword(credentials.email, credentials.password)
      const user = toAuthUser(auth.record)
      return {
        success: true,
        data: { user, token: auth.token },
        requiresVerification: !user.emailVerification,
      }
    } catch (error: any) {
      return { success: false, error: handlePocketBaseError(error) }
    }
  }

  /**
   * Logout — PocketBase tokens are stateless; clearing local state suffices.
   */
  async logout(): Promise<void> {
    pb.authStore.clear()
  }

  /**
   * Revalidate/refresh the stored auth token.
   */
  async refreshToken(_refreshToken?: string): Promise<AuthResponse> {
    try {
      const auth = await pb.collection("users").authRefresh()
      return { success: true, data: { user: toAuthUser(auth.record), token: auth.token } }
    } catch (error: any) {
      pb.authStore.clear()
      return { success: false, error: handlePocketBaseError(error) }
    }
  }

  /**
   * Confirm email verification. Accepts (token) or the legacy
   * (userId, token) shape — only the token matters.
   */
  async verifyEmail(tokenOrUserId: string, token?: string): Promise<AuthResponse> {
    try {
      await pb.collection("users").confirmVerification(token || tokenOrUserId)
      if (pb.authStore.isValid) {
        await pb
          .collection("users")
          .authRefresh()
          .catch(() => {})
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: handlePocketBaseError(error) }
    }
  }

  /**
   * Resend the verification email. Accepts an email address, or falls back
   * to the currently authenticated user's email when given a user id.
   */
  async resendVerificationEmail(idOrEmail?: string): Promise<AuthResponse> {
    try {
      const email = idOrEmail?.includes("@")
        ? idOrEmail
        : ((pb.authStore.record as any)?.email as string | undefined)
      if (!email) {
        return { success: false, error: "No email address available for verification" }
      }
      await pb.collection("users").requestVerification(email)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: handlePocketBaseError(error) }
    }
  }

  /**
   * Fetch a user profile. With PocketBase the auth record IS the profile.
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const record =
        pb.authStore.record?.id === userId
          ? pb.authStore.record
          : await pb.collection("users").getOne(userId)
      if (!record) return null
      return {
        userType: (record as any).userType || "client",
        status: (record as any).status ?? "active",
        firstName: (record as any).firstName ?? "",
        lastName: (record as any).lastName ?? "",
        phone: (record as any).phone ?? "",
        email: (record as any).email ?? "",
        businessName: (record as any).businessName ?? "",
        location: (record as any).location ?? "",
      }
    } catch {
      return null
    }
  }

  /**
   * Send the password recovery email.
   */
  async createPasswordRecovery(email: string): Promise<AuthResponse> {
    try {
      await pb.collection("users").requestPasswordReset(email)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: handlePocketBaseError(error) }
    }
  }

  /**
   * Complete password recovery. Accepts (token, password) or the legacy
   * (userId, secret, password) shape — the secret/token is what matters.
   */
  async updatePassword(
    tokenOrUserId: string,
    secretOrPassword: string,
    password?: string,
  ): Promise<AuthResponse> {
    const token = password ? secretOrPassword : tokenOrUserId
    const newPassword = password ?? secretOrPassword
    try {
      await pb.collection("users").confirmPasswordReset(token, newPassword, newPassword)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: handlePocketBaseError(error) }
    }
  }
}

export default new AuthService()
