/**
 * NotificationList
 *
 * Shared notification list used by the client and tailor notification
 * screens. Sections into Today / Earlier, shows an unread dot, marks
 * items read on tap and navigates by the notification's data payload
 * (orderId -> OrderDetail, appointment -> BookFitting). Subscribes to
 * PocketBase realtime while mounted.
 */
import { useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { RefreshControl, ScrollView, TouchableOpacity, View, ViewStyle } from "react-native"
import { Text } from "./Text"
import { PBNotification } from "@/services/api/notification-api"
import {
  useNotifications,
  useNotificationRealtime,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  unreadCountOf,
} from "@/api/notifications"

function isToday(iso: string): boolean {
  const date = new Date(iso)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (isToday(iso)) {
    return date.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })
  }
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" })
}

export function NotificationList() {
  const router = useRouter()
  const { data: items = [], isLoading, refetch } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // realtime: fold this user's own-record events into the list cache while mounted
  useNotificationRealtime()

  const unreadCount = unreadCountOf(items)

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }, [refetch])

  const handlePress = useCallback(
    (notification: PBNotification) => {
      if (!notification.isRead) {
        markRead.mutate(notification.id)
      }
      const data = notification.data ?? {}
      if (data.orderId) {router.push(`/orders/${data.orderId}`)
      } else if (notification.type === "appointment" || data.appointmentId) {router.push("/book-fitting")
      }
    },
    [router, markRead],
  )

  const todayItems = items.filter((n) => isToday(n.created))
  const earlierItems = items.filter((n) => !isToday(n.created))

  const renderItem = (notification: PBNotification) => (
    <TouchableOpacity
      key={notification.id}
      className="mx-4 mb-2 rounded-xl bg-neutral100 p-4 dark:bg-neutral100-dark"
      onPress={() => handlePress(notification)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={notification.title}
    >
      <View className="flex-row items-start">
        {!notification.isRead && (
          <View className="mr-2 mt-1.5 h-2 w-2 rounded-full bg-tint dark:bg-tint-dark" />
        )}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className="mr-2 flex-1 text-[14px] text-text dark:text-text-dark"
              weight={notification.isRead ? "medium" : "bold"}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text className="text-[12px] text-textDim dark:text-textDim-dark">
              {formatTime(notification.created)}
            </Text>
          </View>
          <Text
            className="mt-0.5 text-[13px] leading-[18px] text-textDim dark:text-textDim-dark"
            numberOfLines={2}
          >
            {notification.body}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <ScrollView
      style={$container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {items.length > 0 && unreadCount > 0 && (
        <TouchableOpacity
          className="self-end px-4 pt-3"
          onPress={() => markAllRead.mutate()}
        >
          <Text
            className="text-[13px] text-tint dark:text-tint-dark"
            weight="semiBold"
            text="Mark all as read"
          />
        </TouchableOpacity>
      )}
      {todayItems.length > 0 && (
        <>
          <Text
            className="mb-2 mt-4 px-4 text-[13px] uppercase tracking-[0.5px] text-textDim dark:text-textDim-dark"
            weight="bold"
            text="Today"
          />
          {todayItems.map(renderItem)}
        </>
      )}
      {earlierItems.length > 0 && (
        <>
          <Text
            className="mb-2 mt-4 px-4 text-[13px] uppercase tracking-[0.5px] text-textDim dark:text-textDim-dark"
            weight="bold"
            text="Earlier"
          />
          {earlierItems.map(renderItem)}
        </>
      )}
      {items.length === 0 && !isLoading && (
        <View className="items-center p-8">
          <Text text="No notifications yet" className="text-textDim dark:text-textDim-dark" />
        </View>
      )}
    </ScrollView>
  )
}

// ScrollView `style` stays inline per the recipe.
const $container: ViewStyle = {
  flex: 1,
}
