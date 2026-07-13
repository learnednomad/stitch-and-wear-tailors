/**
 * ClientNotificationsScreen
 *
 * Thin wrapper around the shared NotificationList component.
 */
import { FC } from "react"
import { observer } from "mobx-react-lite"
import { TouchableOpacity, View, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Icon, NotificationList, Screen, Text } from "@/components"

interface NotificationsScreenProps extends AppStackScreenProps<"ClientNotifications"> {}

export const ClientNotificationsScreen: FC<NotificationsScreenProps> = observer(
  function NotificationsScreen({ navigation }) {
    return (
      <Screen style={$root} preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$content}>
        <View className="flex-row items-center gap-xs px-4 pt-4">
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              className="p-xxs"
            >
              <Icon icon="back" size={24} />
            </TouchableOpacity>
          )}
          <Text preset="heading" text="Notifications" />
        </View>
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
