import { ExpoConfig, ConfigContext } from "@expo/config"

/**
 * Use ts-node here so we can use TypeScript for our Config Plugins
 * and not have to compile them to JavaScript
 */
require("ts-node/register")

// Validate environment variables at config-evaluation time (expo start /
// prebuild / EAS builds) — Obytes starter env pattern, see ./env.ts
const { Env } = require("./env") as typeof import("./env")

/**
 * @param config ExpoConfig coming from the static config app.json if it exists
 *
 * You can read more about Expo's Configuration Resolution Rules here:
 * https://docs.expo.dev/workflow/configuration/#configuration-resolution-rules
 */
module.exports = ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const existingPlugins = config.plugins ?? []

  // Sentry (https://starter.obytes.com/recipes/sentry-setup/):
  // the expo plugin wires native crash handling and source-map upload.
  // Org/project come from build-time env (SENTRY_AUTH_TOKEN should be an EAS
  // secret); the plugin is skipped entirely until both are configured.
  const sentryPlugin =
    Env.SENTRY_ORG && Env.SENTRY_PROJECT
      ? [
          [
            "@sentry/react-native/expo",
            {
              url: "https://sentry.io/",
              organization: Env.SENTRY_ORG,
              project: Env.SENTRY_PROJECT,
            },
          ] as const,
        ]
      : []

  return {
    ...config,
    ios: {
      ...config.ios,
      // This privacyManifests is to get you started.
      // See Expo's guide on apple privacy manifests here:
      // https://docs.expo.dev/guides/apple-privacy/
      // You may need to add more privacy manifests depending on your app's usage of APIs.
      // More details and a list of "required reason" APIs can be found in the Apple Developer Documentation.
      // https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"], // CA92.1 = "Access info from same app, per documentation"
          },
          {
            // Sentry reads file timestamps for crash/session bookkeeping
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"], // C617.1 = "Access timestamps of files inside the app container"
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"], // 35F9.1 = "Measure time within the app"
          },
        ],
        // Sentry collects crash and performance diagnostics (not linked to
        // identity, not used for tracking)
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePerformanceData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeOtherDiagnosticData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
        ],
      },
    },
    plugins: [
      ...existingPlugins,
      ...sentryPlugin,
      require("./plugins/withSplashScreen").withSplashScreen,
    ],
  }
}
