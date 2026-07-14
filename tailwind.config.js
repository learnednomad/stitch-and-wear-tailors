/* eslint-env node */
/**
 * Tailwind config for NativeWind v4, mapped from the app's emerald Ignite theme.
 *
 * - `theme.colors` is REPLACED (not extended) with the token names from
 *   `app/theme/tokens.js`, so a raw hex can no longer be used where a token
 *   exists. Each canonical name carries a `<name>-dark` twin for `dark:` variants.
 * - `fontSize` is REPLACED to match the Ignite `Text` preset scale.
 * - `spacing` and the Space Grotesk `fontFamily` are EXTENDED (defaults kept).
 * - `darkMode: "class"` — the active scheme is driven imperatively via
 *   NativeWind's `colorScheme.set(...)` from the app's theme provider.
 */
const { tailwindColors, spacing, fontSize, fontFamily } = require("./app/theme/tokens")

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    colors: tailwindColors,
    fontSize,
    extend: {
      spacing,
      fontFamily,
    },
  },
  plugins: [],
}
