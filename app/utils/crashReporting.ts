/**
 * Sentry crash reporting, set up per the Obytes starter recipe
 * (https://starter.obytes.com/recipes/sentry-setup/). Initialization lives
 * in ./sentry (called from app/app.tsx); this module keeps Ignite's
 * reportCrash API and routes it to Sentry in production.
 */
import * as Sentry from "@sentry/react-native"

import { initSentry, isSentryEnabled } from "./sentry"

/**
 * Crash reporting initialization (delegates to the Sentry setup).
 */
export const initCrashReporting = () => {
  initSentry()
}

/**
 * Error classifications used to sort errors on error reporting services.
 */
export enum ErrorType {
  /**
   * An error that would normally cause a red screen in dev
   * and force the user to sign out and restart.
   */
  FATAL = "Fatal",
  /**
   * An error caught by try/catch where defined using Reactotron.tron.error.
   */
  HANDLED = "Handled",
}

/**
 * Manually report a handled error.
 */
export const reportCrash = (error: Error, type: ErrorType = ErrorType.FATAL) => {
  if (__DEV__) {
    // Log to console and Reactotron in development
    const message = error.message || "Unknown"
    console.error(error)
    console.log(message, type)
  } else if (isSentryEnabled()) {
    Sentry.captureException(error, { tags: { errorType: type } })
  }
}
