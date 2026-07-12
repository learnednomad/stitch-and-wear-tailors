/**
 * Compact relative time formatter ("just now", "5m ago", "3h ago", "2d ago",
 * falling back to a short date beyond a week). Dependency-free.
 */
export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ""

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}
