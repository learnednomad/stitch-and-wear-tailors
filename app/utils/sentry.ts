/**
 * Sentry setup, following the Obytes starter recipe
 * (https://starter.obytes.com/recipes/sentry-setup/), adapted for this
 * Ignite app: react-navigation's navigationRef instead of expo-router's
 * useNavigationContainerRef, and app/config instead of a generated env.ts.
 *
 * Sentry is only initialized in production builds and only when a DSN is
 * configured (EXPO_PUBLIC_SENTRY_DSN) — in development or without a DSN
 * everything here is a no-op.
 */
import * as Sentry from "@sentry/react-native"
import type { NavigationContainerRef } from "@react-navigation/native"

import Config from "../config"

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
})

/** True when Sentry should actually run (prod build with a DSN). */
export const isSentryEnabled = () => !__DEV__ && !!Config.SENTRY_DSN

/**
 * Initialize Sentry. Call once at app startup, before the root component
 * renders (module scope of app/app.tsx).
 */
export const initSentry = () => {
  if (!isSentryEnabled()) return

  Sentry.init({
    dsn: Config.SENTRY_DSN,
    integrations: [navigationIntegration],
    // Tracing is required for the navigation integration's spans
    tracesSampleRate: 1.0,
  })
}

/**
 * Register the react-navigation container with Sentry's navigation
 * integration. Call from NavigationContainer's onReady with the app's
 * navigationRef.
 */
export const registerSentryNavigationContainer = (
  navigationRef: NavigationContainerRef<any>,
) => {
  if (!isSentryEnabled()) return
  navigationIntegration.registerNavigationContainer(navigationRef)
}

/** Wrap the root component (touch-event and profiler instrumentation). */
export const withSentry = Sentry.wrap
