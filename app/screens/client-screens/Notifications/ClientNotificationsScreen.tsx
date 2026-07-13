/**
 * ClientNotificationsScreen
 *
 * Thin wrapper around the shared NotificationList component.
 */
import { FC } from "react"
import { observer } from "mobx-react-lite"
import { TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Icon, NotificationList, Screen, Text } from "@/components"
import { spacing } from "@/theme"

interface NotificationsScreenProps extends AppStackScreenProps<"ClientNotifications"> {}

export const ClientNotificationsScreen: FC<NotificationsScreenProps> = observer(
  function NotificationsScreen({ navigation }) {
    return (
      <Screen style={$root} preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$content}>
        <View style={$header}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              style={$backButton}
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

const $root: ViewStyle = {
  flex: 1,
}

const $content: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
}

const $backButton: ViewStyle = {
  padding: spacing.xxs,
}
