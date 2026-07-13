import { ErrorInfo } from "react"
import { ScrollView, View, ViewStyle } from "react-native"
import { Button, Icon, Screen, Text } from "@/components"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

export interface ErrorDetailsProps {
  error: Error
  errorInfo: ErrorInfo | null
  onReset(): void
}

/**
 * Renders the error details screen.
 * @param {ErrorDetailsProps} props - The props for the `ErrorDetails` component.
 * @returns {JSX.Element} The rendered `ErrorDetails` component.
 */
export function ErrorDetails(props: ErrorDetailsProps) {
  const { themed } = useAppTheme()
  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={themed($contentContainer)}
    >
      <View className="flex-1 items-center">
        <Icon icon="ladybug" size={64} />
        <Text
          className="mb-4 text-error dark:text-error-dark"
          preset="subheading"
          tx="errorScreen:title"
        />
        <Text tx="errorScreen:friendlySubtitle" />
      </View>

      <ScrollView
        style={themed($errorSection)}
        contentContainerStyle={themed($errorSectionContentContainer)}
      >
        <Text
          className="text-error dark:text-error-dark"
          weight="bold"
          text={`${props.error}`.trim()}
        />
        <Text
          selectable
          className="mt-4 text-textDim dark:text-textDim-dark"
          text={`${props.errorInfo?.componentStack ?? ""}`.trim()}
        />
      </ScrollView>

      <Button
        preset="reversed"
        style={themed($resetButton)}
        onPress={props.onReset}
        tx="errorScreen:reset"
      />
    </Screen>
  )
}

// Style-prop overrides that cannot take a className (Screen contentContainerStyle,
// ScrollView style/contentContainerStyle, Button style) stay as themed inline styles.
const $contentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
  flex: 1,
})

const $errorSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 2,
  backgroundColor: colors.separator,
  marginVertical: spacing.md,
  borderRadius: 6,
})

const $errorSectionContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
})

const $resetButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.error,
  paddingHorizontal: spacing.xxl,
})
