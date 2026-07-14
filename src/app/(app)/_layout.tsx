import { Redirect, Stack } from "expo-router"

import { useAuth } from "@/contexts/AuthContext"

/**
 * Authenticated app group. Gates all authenticated screens behind sign-in and
 * hosts both role tab groups plus the shared pushed/modal routes.
 */
export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(client)" />
      <Stack.Screen name="(tailor)" />
      <Stack.Screen name="orders/[id]/chat" options={{ presentation: "modal" }} />
      <Stack.Screen name="invoices/new" options={{ presentation: "modal" }} />
      <Stack.Screen name="measurements/add" options={{ presentation: "modal" }} />
      <Stack.Screen name="measurements/delete" options={{ presentation: "modal" }} />
    </Stack>
  )
}
