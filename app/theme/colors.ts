// The raw palette and the resolved light semantic tokens now live in
// `tokens.js` (the single source of truth shared with Tailwind). This file
// stays the app-facing `colors` object; its values and types are identical to
// the previous inline definition.
import { palette, semanticLight } from "./tokens"

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
   * Semantic tokens (text, textDim, background, border, tint, tintInactive,
   * separator, surface, surfaceMuted, accent, accentSoft, success,
   * successBackground, warning, warningBackground, error, errorBackground).
   */
  ...semanticLight,
} as const
