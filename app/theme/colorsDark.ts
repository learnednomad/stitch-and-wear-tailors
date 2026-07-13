// The raw dark palette and the resolved dark semantic tokens now live in
// `tokens.js` (the single source of truth shared with Tailwind). This file
// stays the app-facing dark `colors` object; its values and types are identical
// to the previous inline definition.
import { paletteDark as palette, semanticDark } from "./tokens"

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  ...semanticDark,
} as const
