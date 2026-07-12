import { StyleProp, TextStyle, View, ViewStyle } from "react-native"
import { Text } from "./Text"
import { useAppTheme } from "@/utils/useAppTheme"

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

/**
 * A small tinted pill used for statuses and filters, consistent across screens.
 */
export function Chip(props: ChipProps) {
  const { text, tone = "neutral", style: $styleOverride, textStyle: $textStyleOverride } = props
  const { theme } = useAppTheme()
  const { palette } = theme.colors

  const tones: Record<ChipTone, { bg: string; fg: string }> = {
    neutral: { bg: palette.sand200, fg: palette.gray600 },
    success: { bg: palette.success100, fg: palette.success600 },
    info: { bg: palette.secondary100, fg: palette.secondary500 },
    warning: { bg: palette.warning100, fg: palette.warning600 },
    error: { bg: palette.error100, fg: palette.error500 },
    accent: { bg: palette.emerald100, fg: palette.emerald500 },
  }

  const { bg, fg } = tones[tone]

  return (
    <View style={[$container, { backgroundColor: bg }, $styleOverride]}>
      <Text
        weight="medium"
        style={[$label, { color: fg }, $textStyleOverride]}
        numberOfLines={1}
        text={text}
      />
    </View>
  )
}

const $container: ViewStyle = {
  alignSelf: "flex-start",
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 3,
}

const $label: TextStyle = {
  fontSize: 12,
  lineHeight: 17,
}
