export interface ConfigBaseProps {
  persistNavigation: "always" | "dev" | "prod" | "never"
  catchErrors: "always" | "dev" | "prod" | "never"
  exitRoutes: string[]
  PB_URL?: string
  PASSWORD_RECOVERY_URL?: string
  /** Sentry DSN — crash reporting is disabled when empty */
  SENTRY_DSN?: string
}

export type PersistNavigationConfig = ConfigBaseProps["persistNavigation"]

const BaseConfig: ConfigBaseProps = {
  // This feature is particularly useful in development mode, but
  // can be used in production as well if you prefer.
  persistNavigation: "dev",

  /**
   * Only enable if we're catching errors in the right environment
   */
  catchErrors: "always",

  /**
   * This is a list of all the route names that will exit the app if the back button
   * is pressed while in that screen. Only affects Android.
   */
  exitRoutes: ["Welcome"],

  /**
   * Sentry crash reporting (https://starter.obytes.com/recipes/sentry-setup/).
   * Only used in production builds; an empty DSN disables Sentry entirely.
   */
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || "",
}

export default BaseConfig
