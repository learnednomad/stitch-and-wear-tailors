import { Redirect, Stack } from "expo-router"

import { useAuth } from "@/contexts/AuthContext"

/**
 * Auth group. Redirects already-authenticated users to their role home so the
 * login/signup flow is never shown to a signed-in user.
 */
export default function AuthLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return null

  if (isAuthenticated) {
    return <Redirect href={user?.role === "tailor" ? "/dashboard" : "/home"} />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
