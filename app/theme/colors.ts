const palette = {
  // Brand Colors - Tailoring App
  deepCharcoal: "#2C2E33",
  warmIvory: "#FAF7F2",
  tailorGold: "#D4A574",
  threadBlue: "#4A6B8C", 
  blushPink: "#E8D5D0",
  sageGreen: "#8B9D83",
  
  // Functional Colors
  alertRed: "#C85450",
  successGreen: "#6B8E6B",
  warningAmber: "#E8B04B",
  
  // Neutral scale (based on brand colors)
  neutral100: "#FFFFFF",
  neutral200: "#FAF7F2", // warmIvory
  neutral300: "#E8D5D0", // blushPink  
  neutral400: "#D4A574", // tailorGold
  neutral500: "#8B9D83", // sageGreen
  neutral600: "#4A6B8C", // threadBlue
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
  textDim: palette.threadBlue,
  /**
   * The default color of the screen background.
   */
  background: palette.warmIvory,
  /**
   * The default border color.
   */
  border: palette.blushPink,
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
  separator: palette.blushPink,
  /**
   * Error messages.
   */
  error: palette.alertRed,
  /**
   * Error Background.
   */
  errorBackground: palette.angry100,
} as const
