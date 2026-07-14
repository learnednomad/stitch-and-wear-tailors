/**
 * Environment variable validation (Obytes starter pattern, adapted).
 * https://starter.obytes.com/getting-started/environment-vars-config/
 *
 * Two schemas:
 * - `client`: EXPO_PUBLIC_* variables that are inlined into the JS bundle.
 *   Because babel-preset-expo inlines literal `process.env.EXPO_PUBLIC_X`
 *   references, this module is safe to import from app code (app/config)
 *   as well as from app.config.ts.
 * - `buildTime`: variables only needed while building (config plugins,
 *   source-map upload). Never referenced from app code.
 *
 * Every variable is validated for shape but optional with a documented
 * fallback — this app ships sensible defaults (per-platform PB_URL,
 * Sentry disabled without a DSN), so a missing var must not brick local
 * dev, tests, or CI. A malformed var, however, fails fast.
 */
import { z } from "zod"

const client = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  /** PocketBase base URL; app/config falls back per platform when unset */
  EXPO_PUBLIC_PB_URL: z.string().url().optional(),
  /** Sentry client DSN; crash reporting is disabled while empty */
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().or(z.literal("")).optional(),
})

const buildTime = z.object({
  /** Enable the @sentry/react-native/expo plugin (with SENTRY_PROJECT) */
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
})

// NOTE: EXPO_PUBLIC_* values must be referenced literally so
// babel-preset-expo can inline them into the client bundle.
const _clientEnv = {
  APP_ENV: process.env.APP_ENV,
  EXPO_PUBLIC_PB_URL: process.env.EXPO_PUBLIC_PB_URL,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
}

const _buildTimeEnv = {
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
}

const parsedClient = client.safeParse(_clientEnv)
if (!parsedClient.success) {
  console.error(
    "❌ Invalid client environment variables:",
    JSON.stringify(parsedClient.error.flatten().fieldErrors, null, 2),
    "\nFix your .env file (see .env.example).",
  )
  throw new Error("Invalid client environment variables")
}

const parsedBuildTime = buildTime.safeParse(_buildTimeEnv)
if (!parsedBuildTime.success) {
  console.error(
    "❌ Invalid build-time environment variables:",
    JSON.stringify(parsedBuildTime.error.flatten().fieldErrors, null, 2),
    "\nFix your .env file (see .env.example).",
  )
  throw new Error("Invalid build-time environment variables")
}

/** Client-side env (safe to import from app code — values are inlined). */
export const ClientEnv = parsedClient.data

/** Full env for app.config.ts and build scripts (client + build-time). */
export const Env = { ...parsedClient.data, ...parsedBuildTime.data }
