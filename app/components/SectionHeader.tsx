import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native"
import { Text } from "./Text"

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

  return (
    <View className="flex-row items-baseline justify-between" style={$styleOverride}>
      <Text
        weight="semiBold"
        className="text-md leading-6 text-text dark:text-text-dark"
        text={title}
      />
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
            className="text-xs leading-5 text-accent dark:text-accent-dark"
            text={actionText}
          />
        </TouchableOpacity>
      )}
    </View>
  )
}
