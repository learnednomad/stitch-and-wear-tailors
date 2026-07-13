/**
 * TailorNotificationsScreen
 *
 * Thin wrapper around the shared NotificationList component (mirrors
 * ClientNotificationsScreen).
 */
import { FC } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { NotificationList, Screen, Text } from "@/components"

interface NotificationsScreenProps extends AppStackScreenProps<"TailorNotifications"> {}

export const TailorNotificationsScreen: FC<NotificationsScreenProps> = observer(
  function NotificationsScreen() {
    return (
      <Screen style={$root} preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$content}>
        <Text preset="heading" text="Notifications" className="px-4 pt-4" />
        <NotificationList />
      </Screen>
    )
  },
)

// Screen style + contentContainerStyle props — stay inline style objects.
const $root: ViewStyle = {
  flex: 1,
}

const $content: ViewStyle = {
  flex: 1,
}
