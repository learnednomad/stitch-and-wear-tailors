/* eslint-disable import/first */
/**
 * Root layout for Expo Router. Replaces the old `index.tsx` + `app/app.tsx`
 * entry: sets up global side-effect imports, the provider tree, font/i18n
 * bootstrapping, the splash-screen handoff, Sentry navigation instrumentation,
 * and renders a headerless <Stack> (Ignite screens draw their own headers).
 */
if (__DEV__) {
  // Load Reactotron in development only.
  require("@/devtools/ReactotronConfig.ts")
}
import "react-native-url-polyfill/auto" // Required for Appwrite React Native SDK
import "@expo/metro-runtime" // fast refresh on web
import "@/utils/gestureHandler"
import "../../global.css" // NativeWind styles (matches withNativeWind `input` in metro.config.js)

import { useEffect, useState } from "react"
import { useFonts } from "expo-font"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"
import * as SplashScreen from "expo-splash-screen"
import { Stack, useNavigationContainerRef } from "expo-router"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { QueryClientProvider } from "@tanstack/react-query"

import { initI18n } from "@/i18n"
import { queryClient } from "@/api/common"
import { customFontsToLoad } from "@/theme"
import { loadDateFnsLocale } from "@/utils/formatDate"
import { AuthProvider } from "@/contexts/AuthContext"
import { CartProvider } from "@/contexts/CartContext"
import { useThemeProvider } from "@/utils/useAppTheme"
import { initSentry, withSentry, registerSentryNavigationContainer } from "@/utils/sentry"
import { ErrorBoundary } from "@/screens/shared/ErrorScreen/ErrorBoundary"
import Config from "@/config"

// Initialize Sentry before the root component renders (no-op in dev or
// without a DSN) — Obytes Sentry recipe, steps 7-8.
initSentry()

// Keep the splash screen visible until fonts + i18n are ready.
SplashScreen.preventAutoHideAsync()

function RootLayout() {
  const { themeScheme, setThemeContextOverride, ThemeProvider } = useThemeProvider()

  const [areFontsLoaded, fontLoadError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)

  // Register the expo-router navigation container with Sentry's navigation
  // integration (replaces react-navigation's onReady callback).
  const navigationRef = useNavigationContainerRef()
  useEffect(() => {
    if (navigationRef?.current) {
      registerSentryNavigationContainer(navigationRef.current)
    }
  }, [navigationRef])

  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])

  const isReady = isI18nInitialized && (areFontsLoaded || !!fontLoadError)

  useEffect(() => {
    if (isReady) {
      // Slight delay to prevent splash flicker (matches the old entry).
      setTimeout(SplashScreen.hideAsync, 500)
    }
  }, [isReady])

  // Before we show the app, wait for state to be ready. Render nothing in the
  // meantime (native rootView background shows through).
  if (!isReady) {
    return null
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <AuthProvider>
            <CartProvider>
              <ThemeProvider value={{ themeScheme, setThemeContextOverride }}>
                <ErrorBoundary catchErrors={Config.catchErrors}>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(app)" />
                    <Stack.Screen name="two-factor-setup" />
                    <Stack.Screen name="biometric-setup" />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                </ErrorBoundary>
              </ThemeProvider>
            </CartProvider>
          </AuthProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

// Sentry.wrap adds touch-event and profiler instrumentation to the root
// component (pass-through when Sentry isn't initialized).
export default withSentry(RootLayout)
