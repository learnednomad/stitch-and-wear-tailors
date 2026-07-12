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
} as const

export const colors = {
  /**
   * The palette is available to use, but prefer using the name.
   * This is only included for rare, one-off cases. Try to use
   * semantic names as much as possible.
   */
  palette,
  /**
   * A helper for making something see-thru.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The default text color in many components.
   */
  text: palette.deepCharcoal,
  /**
   * Secondary text information.
   */
  textDim: palette.gray600,
  /**
   * The default color of the screen background.
   */
  background: palette.warmIvory,
  /**
   * The default border color.
   */
  border: palette.sand300,
  /**
   * The main tinting color.
   */
  tint: palette.tailorGold,
  /**
   * The inactive tinting color.
   */
  tintInactive: palette.sageGreen,
  /**
   * A subtle color used for lines.
   */
  separator: palette.sand300,
  /**
   * Card/tile surface color, sits on top of `background`.
   */
  surface: palette.neutral100,
  /**
   * Muted surface for icon wells, input backgrounds, subtle fills.
   */
  surfaceMuted: palette.sand100,
  /**
   * Primary brand action color (buttons, active states).
   */
  accent: palette.emerald500,
  /**
   * Soft tint of the accent for icon wells and selected chips.
   */
  accentSoft: palette.emerald100,
  /**
   * Success + warning semantic pairs.
   */
  success: palette.success600,
  successBackground: palette.success100,
  warning: palette.warning600,
  warningBackground: palette.warning100,
  /**
   * Error messages.
   */
  error: palette.alertRed,
  /**
   * Error Background.
   */
  errorBackground: palette.angry100,
} as const
