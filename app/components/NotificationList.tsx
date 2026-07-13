/**
 * NotificationList
 *
 * Shared notification list used by the client and tailor notification
 * screens. Sections into Today / Earlier, shows an unread dot, marks
 * items read on tap and navigates by the notification's data payload
 * (orderId -> OrderDetail, appointment -> BookFitting). Subscribes to
 * PocketBase realtime while mounted.
 */
import { useCallback, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { RefreshControl, ScrollView, TouchableOpacity, View, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Text } from "./Text"
import { useStores } from "@/models"
import { PBNotification } from "@/services/api/notification-api"
import { subscribeToCollection, COLLECTIONS, pb } from "@/services/pocketbase/pocketbase-client"

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

export const NotificationList = observer(function NotificationList() {
  const navigation = useNavigation<any>()
  const { notificationStore } = useStores()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async () => {
    await notificationStore.loadServerNotifications()
  }, [notificationStore])

  useEffect(() => {
    load()
    // realtime: fold own-record events into the store while mounted
    const currentUserId = pb.authStore.record?.id ?? ""
    const unsubscribe = subscribeToCollection(COLLECTIONS.NOTIFICATIONS, (event) => {
      if (event.record?.user === currentUserId) {
        notificationStore.applyRealtimeNotification(event.action, event.record)
      }
    })
    return unsubscribe
  }, [load, notificationStore])

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await load()
    setIsRefreshing(false)
  }, [load])

  const handlePress = useCallback(
    (notification: PBNotification) => {
      if (!notification.isRead) {
        notificationStore.markServerNotificationRead(notification.id)
      }
      const data = notification.data ?? {}
      if (data.orderId) {
        navigation.navigate("OrderDetail", { orderId: data.orderId })
      } else if (notification.type === "appointment" || data.appointmentId) {
        navigation.navigate("BookFitting")
      }
    },
    [navigation, notificationStore],
  )

  const items = notificationStore.serverNotifications
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
      {items.length > 0 && notificationStore.unreadCount > 0 && (
        <TouchableOpacity
          className="self-end px-4 pt-3"
          onPress={() => notificationStore.markAllServerNotificationsRead()}
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
      {items.length === 0 && !notificationStore.isLoading && (
        <View className="items-center p-8">
          <Text text="No notifications yet" className="text-textDim dark:text-textDim-dark" />
        </View>
      )}
    </ScrollView>
  )
})

// ScrollView `style` stays inline per the recipe.
const $container: ViewStyle = {
  flex: 1,
}
