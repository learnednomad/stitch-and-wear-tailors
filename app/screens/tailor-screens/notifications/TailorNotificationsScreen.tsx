/**
 * TailorNotificationsScreen
 *
 * Thin wrapper around the shared NotificationList component (mirrors
 * ClientNotificationsScreen).
 */
import { useRouter } from "expo-router"
import { FC } from "react"
import { TouchableOpacity, View, ViewStyle } from "react-native"
import { Icon, NotificationList, Screen, Text } from "@/components"


export const TailorNotificationsScreen: FC = 
  function NotificationsScreen() {
    const router = useRouter()
    return (
      <Screen style={$root} preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$content}>
        <View className="flex-row items-center gap-xs px-4 pt-4">
          {router.canGoBack() && (
            <TouchableOpacity
              onPress={() =>router.back()}
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
  }

// Screen style + contentContainerStyle props — stay inline style objects.
const $root: ViewStyle = {
  flex: 1,
}

const $content: ViewStyle = {
  flex: 1,
}
