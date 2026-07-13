/**
 * ClientNotificationsScreen
 *
 * Thin wrapper around the shared NotificationList component.
 */
import { FC } from "react"
import { observer } from "mobx-react-lite"
import { TextStyle, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { NotificationList, Screen, Text } from "@/components"
import { spacing } from "@/theme"

interface NotificationsScreenProps extends AppStackScreenProps<"ClientNotifications"> {}

export const ClientNotificationsScreen: FC<NotificationsScreenProps> = observer(
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
