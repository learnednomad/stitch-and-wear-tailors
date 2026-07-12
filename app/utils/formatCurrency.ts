/**
 * Currency formatting helpers.
 *
 * Amounts across the app are stored as plain NGN numbers, so a thin
 * formatter is all that's needed (no Intl currency codes on RN by default).
 */

/**
 * Format an amount as Naira, e.g. 85000 -> "₦85,000".
 */
export function formatNaira(amount: number | null | undefined): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0
  return `₦${value.toLocaleString("en-NG")}`
}
