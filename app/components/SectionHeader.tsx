import { StyleProp, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { Text } from "./Text"
import { useAppTheme } from "@/utils/useAppTheme"

export interface SectionHeaderProps {
  /**
   * Section title, e.g. "Recent Orders".
   */
  title: string
  /**
   * Optional action label rendered on the right, e.g. "View All".
   */
  actionText?: string
  /**
   * Called when the action label is pressed.
   */
  onActionPress?: () => void
  /**
   * Optional style override for the row container.
   */
  style?: StyleProp<ViewStyle>
}

/**
 * Standard section header row: bold title on the left, optional accent action on the right.
 */
export function SectionHeader(props: SectionHeaderProps) {
  const { title, actionText, onActionPress, style: $styleOverride } = props
  const { theme } = useAppTheme()

  return (
    <View style={[$row, $styleOverride]}>
      <Text weight="semiBold" style={[$title, { color: theme.colors.text }]} text={title} />
      {!!actionText && (
        <TouchableOpacity
          onPress={onActionPress}
          accessible
          accessibilityRole="button"
          accessibilityLabel={actionText}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            weight="medium"
            style={[$action, { color: theme.colors.accent }]}
            text={actionText}
          />
        </TouchableOpacity>
      )}
    </View>
  )
}

const $row: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "baseline",
}

const $title: TextStyle = {
  fontSize: 18,
  lineHeight: 24,
}

const $action: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
}
