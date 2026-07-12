import { StyleProp, TextStyle, View, ViewStyle } from "react-native"
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
  const { colors } = theme

  return (
    <View
      style={[
        $tile,
        { backgroundColor: colors.surface, borderColor: colors.border },
        $styleOverride,
      ]}
    >
      {!!icon && (
        <View style={[$iconWell, { backgroundColor: iconBackgroundColor ?? colors.accentSoft }]}>
          <Icon icon={icon} size={16} color={iconColor ?? colors.accent} />
        </View>
      )}
      <Text
        weight="bold"
        style={[$value, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        text={value}
      />
      <Text weight="medium" style={[$label, { color: colors.textDim }]} numberOfLines={1} text={label} />
    </View>
  )
}

const $tile: ViewStyle = {
  flex: 1,
  borderRadius: 16,
  borderWidth: 1,
  paddingVertical: 14,
  paddingHorizontal: 14,
}

const $iconWell: ViewStyle = {
  width: 30,
  height: 30,
  borderRadius: 15,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
}

const $value: TextStyle = {
  fontSize: 20,
  lineHeight: 26,
}

const $label: TextStyle = {
  fontSize: 12,
  lineHeight: 17,
}
