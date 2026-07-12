/**
 * PocketBase Authentication Adapter
 *
 * Replaces the Appwrite auth adapter. PocketBase handles sessions, email
 * verification, password reset and OTP natively, so this layer is thin:
 * it wraps SDK calls in the app's ServiceResult shape and normalizes the
 * user record.
 */

import { pb, handlePocketBaseError } from "./pocketbase-client"
import { ServiceResult } from "../api/base-api-service"

export interface PBUser {
  id: string
  email: string
  firstName: string
  lastName: string
  userType: "client" | "tailor" | "admin"
  phone: string
  status: string
  avatar: string
  businessName: string
  location: string
  verified: boolean
  created: string
  updated: string
}

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  role: "client" | "tailor"
  phone?: string
}

function toPBUser(record: any): PBUser {
  return {
    id: record.id,
    email: record.email ?? "",
    firstName: record.firstName ?? "",
    lastName: record.lastName ?? "",
    userType: record.userType || "client",
    phone: record.phone ?? "",
    status: record.status ?? "active",
    avatar: record.avatar ?? "",
    businessName: record.businessName ?? "",
    location: record.location ?? "",
    verified: !!record.verified,
    created: record.created ?? "",
    updated: record.updated ?? "",
  }
}

function failure<T>(error: any, fallback: string): ServiceResult<T> {
  const status = error?.status ?? 0
  const kind =
    status === 401 || status === 403
      ? ("unauthorized" as const)
      : status === 404
        ? ("not-found" as const)
        : status === 0
          ? ("cannot-connect" as const)
          : ("rejected" as const)
  return {
    success: false,
    problem: (kind === "cannot-connect" ? { kind, temporary: true } : { kind }) as any,
    message: handlePocketBaseError(error) || fallback,
  }
}

export class PocketBaseAuthAdapter {
  /**
   * Login with email and password.
   */
  async login(
    email: string,
    password: string,
  ): Promise<ServiceResult<{ user: PBUser; token: string }>> {
    try {
      const auth = await pb.collection("users").authWithPassword(email, password)
      return {
        success: true,
        data: { user: toPBUser(auth.record), token: auth.token },
      }
    } catch (error: any) {
      return failure(error, "Login failed")
    }
  }

  /**
   * Register a new user and send the verification email.
   */
  async register(input: RegisterInput): Promise<ServiceResult<PBUser>> {
    try {
      const record = await pb.collection("users").create({
        email: input.email,
        password: input.password,
        passwordConfirm: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        userType: input.role,
        phone: input.phone ?? "",
        status: "pending_verification",
      })
      // fire-and-forget: verification email failures shouldn't fail signup
      pb.collection("users")
        .requestVerification(input.email)
        .catch(() => {})
      return { success: true, data: toPBUser(record) }
    } catch (error: any) {
      return failure(error, "Registration failed")
    }
  }

  /**
   * Get (and revalidate) the current authenticated user.
   */
  async getCurrentUser(): Promise<ServiceResult<PBUser>> {
    try {
      if (!pb.authStore.isValid) {
        return {
          success: false,
          problem: { kind: "unauthorized" } as any,
          message: "Not authenticated",
        }
      }
      const auth = await pb.collection("users").authRefresh()
      return { success: true, data: toPBUser(auth.record) }
    } catch (error: any) {
      pb.authStore.clear()
      return failure(error, "Not authenticated")
    }
  }

  /**
   * Logout (PocketBase tokens are stateless — clearing local state is all
   * that's needed).
   */
  async logout(): Promise<ServiceResult<void>> {
    pb.authStore.clear()
    return { success: true, data: undefined }
  }

  /**
   * Send (or resend) the email verification message.
   */
  async sendEmailVerification(email?: string): Promise<ServiceResult<void>> {
    try {
      const target = email || (pb.authStore.record as any)?.email
      if (!target) {
        return {
          success: false,
          problem: { kind: "rejected" } as any,
          message: "No email address available for verification",
        }
      }
      await pb.collection("users").requestVerification(target)
      return { success: true, data: undefined }
    } catch (error: any) {
      return failure(error, "Failed to send verification email")
    }
  }

  /**
   * Confirm email verification. Accepts (token) or the legacy
   * (userId, secret) call shape — PocketBase only needs the token.
   */
  async verifyEmail(tokenOrUserId: string, secret?: string): Promise<ServiceResult<void>> {
    try {
      const token = secret || tokenOrUserId
      await pb.collection("users").confirmVerification(token)
      // refresh local auth record so `verified` flips without re-login
      if (pb.authStore.isValid) {
        await pb.collection("users").authRefresh().catch(() => {})
      }
      return { success: true, data: undefined }
    } catch (error: any) {
      return failure(error, "Email verification failed")
    }
  }

  /**
   * Send the password recovery email.
   */
  async sendPasswordRecovery(email: string): Promise<ServiceResult<void>> {
    try {
      await pb.collection("users").requestPasswordReset(email)
      return { success: true, data: undefined }
    } catch (error: any) {
      return failure(error, "Password recovery failed")
    }
  }

  /**
   * Complete password recovery with the emailed token.
   */
  async completePasswordRecovery(
    token: string,
    password: string,
    passwordConfirm?: string,
  ): Promise<ServiceResult<void>> {
    try {
      await pb.collection("users").confirmPasswordReset(token, password, passwordConfirm || password)
      return { success: true, data: undefined }
    } catch (error: any) {
      return failure(error, "Password recovery completion failed")
    }
  }

  /**
   * Change password for the authenticated user (requires old password).
   */
  async updatePassword(newPassword: string, oldPassword: string): Promise<ServiceResult<PBUser>> {
    try {
      const userId = pb.authStore.record?.id
      if (!userId) {
        return {
          success: false,
          problem: { kind: "unauthorized" } as any,
          message: "Not authenticated",
        }
      }
      const record = await pb.collection("users").update(userId, {
        oldPassword,
        password: newPassword,
        passwordConfirm: newPassword,
      })
      // changing the password invalidates the token — re-authenticate
      await pb
        .collection("users")
        .authWithPassword((record as any).email, newPassword)
        .catch(() => pb.authStore.clear())
      return { success: true, data: toPBUser(record) }
    } catch (error: any) {
      return failure(error, "Password update failed")
    }
  }

  /**
   * Update profile fields on the authenticated user.
   */
  async updateProfile(
    updates: Partial<Pick<PBUser, "firstName" | "lastName" | "phone" | "businessName" | "location">>,
  ): Promise<ServiceResult<PBUser>> {
    try {
      const userId = pb.authStore.record?.id
      if (!userId) {
        return {
          success: false,
          problem: { kind: "unauthorized" } as any,
          message: "Not authenticated",
        }
      }
      const record = await pb.collection("users").update(userId, updates)
      return { success: true, data: toPBUser(record) }
    } catch (error: any) {
      return failure(error, "Profile update failed")
    }
  }

  /**
   * Request an email change (PocketBase sends a confirmation email).
   */
  async updateEmail(newEmail: string): Promise<ServiceResult<void>> {
    try {
      await pb.collection("users").requestEmailChange(newEmail)
      return { success: true, data: undefined }
    } catch (error: any) {
      return failure(error, "Email update failed")
    }
  }

  /**
   * Verify the backend is reachable.
   */
  async testConnection(): Promise<ServiceResult<boolean>> {
    try {
      await pb.health.check()
      return { success: true, data: true }
    } catch (error: any) {
      return failure(error, "Connection test failed")
    }
  }
}

let adapter: PocketBaseAuthAdapter | null = null

export function getPocketBaseAuthAdapter(): PocketBaseAuthAdapter {
  if (!adapter) {
    adapter = new PocketBaseAuthAdapter()
  }
  return adapter
}

export function resetPocketBaseAuthAdapter(): void {
  adapter = null
}
