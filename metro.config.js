/* eslint-env node */
// Learn more https://docs.expo.io/guides/customizing-metro
// getSentryExpoConfig wraps expo's default config with Sentry's serializer
// (debug-id injection for source maps) — Obytes Sentry recipe, step 6.
const { getSentryExpoConfig } = require("@sentry/react-native/metro")

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname)

config.transformer.getTransformOptions = async () => ({
  transform: {
    // Inline requires are very useful for deferring loading of large dependencies/components.
    // For example, we use it in app.tsx to conditionally load Reactotron.
    // However, this comes with some gotchas.
    // Read more here: https://reactnative.dev/docs/optimizing-javascript-loading
    // And here: https://github.com/expo/expo/issues/27279#issuecomment-1971610698
    inlineRequires: true,
  },
})

// This helps support certain popular third-party libraries
// such as Firebase that use the extension cjs.
config.resolver.sourceExts.push("cjs")

// Native-only packages get web shims (they call requireNativeComponent,
// which crashes react-native-web).
const path = require("path")
const WEB_SHIMS = {
  "react-native-linear-gradient": path.resolve(__dirname, "app/shims/linear-gradient.web.tsx"),
}
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && WEB_SHIMS[moduleName]) {
    return { filePath: WEB_SHIMS[moduleName], type: "sourceFile" }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform)
}

module.exports = config
