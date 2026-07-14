import { Redirect } from "expo-router"

import { useAuth } from "@/contexts/AuthContext"
import * as storage from "@/utils/storage"

/**
 * Entry redirect (replaces AppNavigator's `getInitialRouteName`). Cold-start
 * lands here and routes to onboarding, auth, or the role home.
 */
export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return null

  if (!isAuthenticated) {
    // First launch: show the onboarding carousel once (the screen writes the
    // "onboarding.seen" flag when completed or skipped).
    if (!storage.loadString("onboarding.seen")) {
      return <Redirect href="/onboarding" />
    }
    return <Redirect href="/sign-in" />
  }

  if (user?.role === "tailor") {
    return <Redirect href="/dashboard" />
  }

  return <Redirect href="/home" />
}
