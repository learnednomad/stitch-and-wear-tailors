/**
 * Pure order-translation lookup.
 *
 * Extracted verbatim from the MST OrderStore's `getTranslation` action — it is
 * a lookup, not state. The active language lives in `useOrderDraftStore`
 * (`currentLanguage`); callers pass it in. Delegates to the existing
 * `getTranslation` table in `nigerian-languages.ts` so the translations stay
 * defined in one place.
 */

import { getTranslation, orderTranslations } from "./nigerian-languages"
import type { SupportedLanguage } from "../types/orders"

/**
 * Translate `key.subKey` into `lang`, falling back to English then the raw
 * subKey (identical semantics to the former MST `getTranslation`).
 */
export function t(key: string, subKey: string, lang: SupportedLanguage = "en"): string {
  const translations = (orderTranslations as any)[key]
  if (!translations) return subKey
  return getTranslation(key as keyof typeof orderTranslations, subKey, lang)
}
