/**
 * TailorNotificationsScreen
 *
 * Thin wrapper around the shared NotificationList component (mirrors
 * ClientNotificationsScreen).
 */
import { FC } from "react"
import { observer } from "mobx-react-lite"
import { TextStyle, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { NotificationList, Screen, Text } from "@/components"
import { spacing } from "@/theme"

interface NotificationsScreenProps extends AppStackScreenProps<"TailorNotifications"> {}

export const TailorNotificationsScreen: FC<NotificationsScreenProps> = observer(
  function NotificationsScreen() {
    return (
      <Screen style={$root} preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$content}>
        <Text preset="heading" text="Notifications" style={$heading} />
        <NotificationList />
      </Screen>
    )
  },
)

const $root: ViewStyle = {
  flex: 1,
}

const $content: ViewStyle = {
  flex: 1,
}

const $heading: TextStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
}
