import { StyleProp, View, ViewStyle } from "react-native"
import { Icon, IconTypes } from "./Icon"
import { Text } from "./Text"
import { useAppTheme } from "@/utils/useAppTheme"

export interface StatTileProps {
  /**
   * The stat value, e.g. "3" or "₦45,000".
   */
  value: string
  /**
   * Short label under the value, e.g. "Active Orders".
   */
  label: string
  /**
   * Optional icon rendered in a soft accent well above the value.
   */
  icon?: IconTypes
  /**
   * Optional override for the icon well / icon color pairing.
   */
  iconColor?: string
  iconBackgroundColor?: string
  /**
   * Optional style override for the tile.
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A flat stat tile: soft icon well, prominent value, dim label.
 * Used on dashboards so every stat reads the same.
 */
export function StatTile(props: StatTileProps) {
  const { value, label, icon, iconColor, iconBackgroundColor, style: $styleOverride } = props
  const { theme } = useAppTheme()

  return (
    <View
      className="flex-1 rounded-2xl border border-border bg-surface p-[14px] dark:border-border-dark dark:bg-surface-dark"
      style={$styleOverride}
    >
      {!!icon && (
        <View
          className={`mb-2.5 h-[30px] w-[30px] items-center justify-center rounded-[15px] ${
            iconBackgroundColor ? "" : "bg-accentSoft dark:bg-accentSoft-dark"
          }`}
          style={iconBackgroundColor ? { backgroundColor: iconBackgroundColor } : undefined}
        >
          <Icon icon={icon} size={16} color={iconColor ?? theme.colors.accent} />
        </View>
      )}
      <Text
        weight="bold"
        className="text-lg leading-[26px] text-text dark:text-text-dark"
        numberOfLines={1}
        adjustsFontSizeToFit
        text={value}
      />
      <Text
        weight="medium"
        className="text-xxs leading-[17px] text-textDim dark:text-textDim-dark"
        numberOfLines={1}
        text={label}
      />
    </View>
  )
}
