import { StyleProp, TextStyle, View, ViewStyle } from "react-native"
import { Text } from "./Text"

export type ChipTone = "neutral" | "success" | "info" | "warning" | "error" | "accent"

export interface ChipProps {
  /**
   * Label shown inside the pill.
   */
  text: string
  /**
   * Semantic tone controlling the tinted background + label color.
   */
  tone?: ChipTone
  /**
   * Optional style override for the pill container.
   */
  style?: StyleProp<ViewStyle>
  /**
   * Optional style override for the label.
   */
  textStyle?: StyleProp<TextStyle>
}

/**
 * Maps an order/invoice status string to a chip tone so every screen
 * renders statuses with the same colors.
 */
export function statusTone(status: string): ChipTone {
  switch (status) {
    case "completed":
    case "delivered":
    case "paid":
    case "confirmed_payment":
    case "confirmed":
      return "success"
    case "ready":
    case "in_progress":
    case "partially_paid":
      return "info"
    case "pending":
    case "draft":
    case "sent":
      return "warning"
    case "cancelled":
    case "void":
    case "overdue":
    case "failed":
      return "error"
    default:
      return "neutral"
  }
}

/**
 * Humanizes a snake_case status for display: "in_progress" -> "In Progress".
 */
export function statusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Tinted background + label color per tone, each with a `dark:` twin mapped from
// the dark palette (matches the previous theme.colors.palette lookups exactly).
const $toneClasses: Record<ChipTone, { container: string; label: string }> = {
  neutral: {
    container: "bg-sand200 dark:bg-sand200-dark",
    label: "text-gray600 dark:text-gray600-dark",
  },
  success: {
    container: "bg-success100 dark:bg-success100-dark",
    label: "text-success600 dark:text-success600-dark",
  },
  info: {
    container: "bg-secondary100 dark:bg-secondary100-dark",
    label: "text-secondary500 dark:text-secondary500-dark",
  },
  warning: {
    container: "bg-warning100 dark:bg-warning100-dark",
    label: "text-warning600 dark:text-warning600-dark",
  },
  error: {
    container: "bg-error100 dark:bg-error100-dark",
    label: "text-error500 dark:text-error500-dark",
  },
  accent: {
    container: "bg-emerald100 dark:bg-emerald100-dark",
    label: "text-emerald500 dark:text-emerald500-dark",
  },
}

/**
 * A small tinted pill used for statuses and filters, consistent across screens.
 */
export function Chip(props: ChipProps) {
  const { text, tone = "neutral", style: $styleOverride, textStyle: $textStyleOverride } = props
  const { container, label } = $toneClasses[tone]

  return (
    <View className={`self-start rounded-full px-2.5 py-[3px] ${container}`} style={$styleOverride}>
      <Text
        weight="medium"
        className={`text-xxs leading-[17px] ${label}`}
        numberOfLines={1}
        text={text}
        style={$textStyleOverride}
      />
    </View>
  )
}
