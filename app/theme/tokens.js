/* eslint-env node */
/**
 * tokens.js — the single source of truth for the app's design tokens.
 *
 * CommonJS so that BOTH the TypeScript theme (`colors.ts` / `colorsDark.ts`)
 * and the Node-based Tailwind config (`tailwind.config.js`) can `require` it.
 *
 * `palette` / `paletteDark` mirror the raw brand + neutral scales that used to
 * live inline in `colors.ts` / `colorsDark.ts`. `semanticLight` / `semanticDark`
 * are the resolved semantic tokens (surface, accent, textDim, …). `tailwindColors`
 * flattens both into a single map: light values under the canonical name, every
 * dark value under `<name>-dark`, so `dark:` variants line up with the runtime
 * theme override.
 *
 * Literal types for consumers are declared in `tokens.d.ts` (allowJs stays false).
 */

// ---------------------------------------------------------------------------
// Raw palettes (verbatim from the emerald Ignite theme)
// ---------------------------------------------------------------------------

const palette = {
  // Brand Colors - Tailoring App
  deepCharcoal: "#2C2E33",
  warmIvory: "#FAF7F2",
  tailorGold: "#D4A574",
  threadBlue: "#4A6B8C",
  blushPink: "#E8D5D0",
  sageGreen: "#8B9D83",

  // Brand emerald (Nigerian green) — primary action + accent scale
  emerald100: "#E9F1EA",
  emerald200: "#CDE0D0",
  emerald300: "#9BC0A0",
  emerald400: "#3E7A44",
  emerald500: "#2B5D2F",
  emerald600: "#224B26",
  emerald700: "#19381C",

  // Warm neutrals for text/borders/surfaces
  sand100: "#F6F2EB",
  sand200: "#F0EAE0",
  sand300: "#E6DED2",
  gray500: "#8C877C",
  gray600: "#6C675E",

  // Functional Colors
  alertRed: "#C85450",
  successGreen: "#6B8E6B",
  warningAmber: "#E8B04B",

  // Neutral scale (true warm neutrals — brand colors live under their own names)
  neutral100: "#FFFFFF",
  neutral200: "#FAF7F2", // warmIvory
  neutral300: "#E6DED2", // warm sand border
  neutral400: "#C9C2B4", // muted sand
  neutral500: "#8C877C", // warm gray
  neutral600: "#6C675E", // deep warm gray
  neutral700: "#2C2E33", // deepCharcoal
  neutral800: "#1A1B1E", // darker charcoal
  neutral900: "#000000",

  // Primary palette (using tailor's gold)
  primary100: "#F5EFE5",
  primary200: "#EADDCB",
  primary300: "#DFCAB0",
  primary400: "#D4A574", // tailorGold
  primary500: "#C1945D",
  primary600: "#A67D47",
  primary700: "#8A6635",
  primary900: "#553D1B",

  // Secondary palette (using thread blue)
  secondary100: "#E8EDF3",
  secondary200: "#D1DCE7",
  secondary300: "#BACADA",
  secondary400: "#4A6B8C", // threadBlue
  secondary500: "#3A5471",
  secondary600: "#2A3E56",

  // Accent palette (using sage green)
  accent100: "#F0F3F0",
  accent200: "#E1E7E0",
  accent300: "#D2DBD1",
  accent400: "#8B9D83", // sageGreen
  accent500: "#708066",
  accent600: "#55634A",

  // Error states
  angry100: "#F7E8E7",
  angry500: "#C85450", // alertRed
  error100: "#F7E8E7",
  error500: "#C85450", // alertRed
  error600: "#A93F3C",

  // Success states
  success100: "#EDF2ED",
  success500: "#6B8E6B", // successGreen
  success600: "#55714B",

  // Warning states
  warning100: "#FDF6E8",
  warning500: "#E8B04B", // warningAmber
  warning600: "#D19B2E",

  overlay20: "rgba(44, 46, 51, 0.2)",
  overlay50: "rgba(44, 46, 51, 0.5)",
}

const paletteDark = {
  neutral900: "#FFFFFF",
  neutral800: "#F4F2F1",
  neutral700: "#D7CEC9",
  neutral600: "#B6ACA6",
  neutral500: "#978F8A",
  neutral400: "#564E4A",
  neutral300: "#3C3836",
  neutral200: "#191015",
  neutral100: "#000000",

  primary600: "#F4E0D9",
  primary500: "#E8C1B4",
  primary400: "#DDA28E",
  primary300: "#D28468",
  primary200: "#C76542",
  primary100: "#A54F31",

  secondary500: "#DCDDE9",
  secondary400: "#BCC0D6",
  secondary300: "#9196B9",
  secondary200: "#626894",
  secondary100: "#41476E",

  accent500: "#FFEED4",
  accent400: "#FFE1B2",
  accent300: "#FDD495",
  accent200: "#FBC878",
  accent100: "#FFBB50",

  angry100: "#F2D6CD",
  angry500: "#C03403",

  // Brand emerald scale (inverted for dark surfaces)
  emerald100: "#22301F",
  emerald200: "#2E4630",
  emerald300: "#3E5F41",
  emerald400: "#5C8F61",
  emerald500: "#7BAE80",
  emerald600: "#9BC49F",
  emerald700: "#BCD9BF",

  // Warm neutrals (map to dark greys)
  sand100: "#241F1D",
  sand200: "#2E2926",
  sand300: "#3C3836",
  gray500: "#978F8A",
  gray600: "#B6ACA6",

  // Semantic scales
  success100: "#1F2E1C",
  success500: "#7FA96F",
  success600: "#9BC08B",
  warning100: "#332A18",
  warning500: "#D9A94F",
  warning600: "#E5BE72",
  error100: "#3A211C",
  error500: "#E07868",
  error600: "#EC9A8D",

  overlay20: "rgba(25, 16, 21, 0.2)",
  overlay50: "rgba(25, 16, 21, 0.5)",
}

// ---------------------------------------------------------------------------
// Semantic token wiring (semantic name -> palette key), per theme.
// ---------------------------------------------------------------------------

const LIGHT_SEMANTIC_KEYS = {
  text: "deepCharcoal",
  textDim: "gray600",
  background: "warmIvory",
  border: "sand300",
  tint: "tailorGold",
  tintInactive: "sageGreen",
  separator: "sand300",
  surface: "neutral100",
  surfaceMuted: "sand100",
  accent: "emerald500",
  accentSoft: "emerald100",
  success: "success600",
  successBackground: "success100",
  warning: "warning600",
  warningBackground: "warning100",
  error: "alertRed",
  errorBackground: "angry100",
}

const DARK_SEMANTIC_KEYS = {
  text: "neutral800",
  textDim: "neutral600",
  background: "neutral200",
  border: "neutral400",
  tint: "primary500",
  tintInactive: "neutral300",
  separator: "neutral300",
  surface: "neutral300",
  surfaceMuted: "sand100",
  accent: "emerald500",
  accentSoft: "emerald100",
  success: "success600",
  successBackground: "success100",
  warning: "warning600",
  warningBackground: "warning100",
  error: "angry500",
  errorBackground: "angry100",
}

/**
 * Resolve a semantic-key -> palette-key spec against a palette into concrete
 * color values. Used to build the semantic token objects consumed by the theme
 * and the Tailwind color map from a single wiring definition.
 */
function semanticFrom(pal, spec) {
  const out = {}
  for (const key of Object.keys(spec)) {
    out[key] = pal[spec[key]]
  }
  return out
}

const semanticLight = semanticFrom(palette, LIGHT_SEMANTIC_KEYS)
const semanticDark = semanticFrom(paletteDark, DARK_SEMANTIC_KEYS)

// ---------------------------------------------------------------------------
// Scales shared with Tailwind
// ---------------------------------------------------------------------------

const spacing = {
  xxxs: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
}

// Matches the Ignite `Text` component preset scale (fontSize / lineHeight).
const fontSize = {
  xxl: ["36px", { lineHeight: "44px" }],
  xl: ["24px", { lineHeight: "34px" }],
  lg: ["20px", { lineHeight: "32px" }],
  md: ["18px", { lineHeight: "26px" }],
  sm: ["16px", { lineHeight: "24px" }],
  xs: ["14px", { lineHeight: "21px" }],
  xxs: ["12px", { lineHeight: "18px" }],
}

// Named to avoid clashing with Tailwind's font-weight utilities (font-medium…).
const fontFamily = {
  spaceLight: ["spaceGroteskLight"],
  spaceRegular: ["spaceGroteskRegular"],
  spaceMedium: ["spaceGroteskMedium"],
  spaceSemiBold: ["spaceGroteskSemiBold"],
  spaceBold: ["spaceGroteskBold"],
}

// ---------------------------------------------------------------------------
// Flattened Tailwind color map: canonical name = light, `<name>-dark` = dark.
// ---------------------------------------------------------------------------

const tailwindColors = { transparent: "transparent" }

// Raw palette names (every light key + its dark counterpart, falling back to the
// light value when the dark palette does not remap that raw name).
for (const key of Object.keys(palette)) {
  tailwindColors[key] = palette[key]
  tailwindColors[`${key}-dark`] = Object.prototype.hasOwnProperty.call(paletteDark, key)
    ? paletteDark[key]
    : palette[key]
}

// Semantic names.
for (const key of Object.keys(LIGHT_SEMANTIC_KEYS)) {
  tailwindColors[key] = semanticLight[key]
  tailwindColors[`${key}-dark`] = semanticDark[key]
}

module.exports = {
  palette,
  paletteDark,
  semanticLight,
  semanticDark,
  semanticFrom,
  spacing,
  fontSize,
  fontFamily,
  tailwindColors,
}
