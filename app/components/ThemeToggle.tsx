import { FC } from "react"
import { TouchableOpacity, ViewStyle } from "react-native"
import { useAppTheme } from "@/utils/useAppTheme"
import { Icon } from "./Icon"

export interface ThemeToggleProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle
  /**
   * Size of the toggle icon
   */
  size?: number
}

/**
 * Theme toggle component that allows users to switch between light and dark themes.
 * Shows a sun icon when in dark mode (to switch to light) and moon icon when in light mode (to switch to dark).
 */
export const ThemeToggle: FC<ThemeToggleProps> = ({ style: $styleOverride, size = 24 }) => {
  const { theme, themeContext, setThemeContextOverride } = useAppTheme()

  const toggleTheme = () => {
    const newTheme = themeContext === "dark" ? "light" : "dark"
    setThemeContextOverride(newTheme)
  }

  const iconName = themeContext === "dark" ? "sun" : "moon"

  return (
    <TouchableOpacity
      style={[$container, $styleOverride]}
      onPress={toggleTheme}
      accessible
      accessibilityLabel={`Switch to ${themeContext === "dark" ? "light" : "dark"} theme`}
      accessibilityRole="button"
      accessibilityHint="Toggles between light and dark theme"
    >
      <Icon icon={iconName} size={size} color={theme.colors.text} />
    </TouchableOpacity>
  )
}

const $container: ViewStyle = {
  padding: 8,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
}
