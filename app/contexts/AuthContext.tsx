/**
 * Authentication Context
 *
 * Thin wrapper around `useAuthStore` (Zustand). Preserves the `useAuth()` shape
 * consumed across the auth screens and the navigator; all state and actions are
 * sourced from the Zustand store's selectors.
 */

import React, { createContext, useContext, useEffect, ReactNode } from "react"
import { useAuthStore, selectIsAuthenticated } from "@/state/authStore"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: any
  signIn: (email: string, password: string) => Promise<void>
  signUp: (userData: any) => Promise<void>
  signOut: () => Promise<void>
  checkAuthStatus: () => Promise<void>
  sendEmailVerification: () => Promise<void>
  verifyEmail: (userId: string, secret: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Subscribe to the Zustand store so the provider re-renders (and the
  // navigator re-gates) whenever auth state changes.
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isLoading = useAuthStore((s) => s.status === "checking" || s.isLoading)

  // Check authentication status on app start
  useEffect(() => {
    // Small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      useAuthStore.getState().checkAuthStatus()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const checkAuthStatus = async () => {
    await useAuthStore.getState().checkAuthStatus()
  }

  const clearStoredAuth = async () => {
    useAuthStore.getState().clearAuth()
  }

  const signIn = async (email: string, password: string) => {
    try {
      await useAuthStore.getState().signIn({ email, password })
    } catch (error) {
      await clearStoredAuth()
      throw error
    }
  }

  const signUp = async (userData: any) => {
    try {
      await useAuthStore.getState().signUp(userData)
    } catch (error) {
      await clearStoredAuth()
      throw error
    }
  }

  const signOut = async () => {
    await useAuthStore.getState().signOut()
  }

  const sendEmailVerification = async () => {
    await useAuthStore.getState().sendEmailVerification()
  }

  const verifyEmail = async (userId: string, secret: string) => {
    await useAuthStore.getState().verifyEmail(userId, secret)
  }

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    signIn,
    signUp,
    signOut,
    checkAuthStatus,
    sendEmailVerification,
    verifyEmail,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
