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
import {
  RefreshControl,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Text } from "./Text"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
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
  const { theme } = useAppTheme()
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
      style={[$item, { backgroundColor: theme.colors.palette.neutral100 }]}
      onPress={() => handlePress(notification)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={notification.title}
    >
      <View style={$itemRow}>
        {!notification.isRead && <View style={[$unreadDot, { backgroundColor: theme.colors.tint }]} />}
        <View style={$itemBody}>
          <View style={$itemHeader}>
            <Text
              style={[
                $itemTitle,
                { color: theme.colors.text },
                !notification.isRead && $itemTitleUnread,
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={[$itemTime, { color: theme.colors.textDim }]}>
              {formatTime(notification.created)}
            </Text>
          </View>
          <Text style={[$itemMessage, { color: theme.colors.textDim }]} numberOfLines={2}>
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
          style={$markAllButton}
          onPress={() => notificationStore.markAllServerNotificationsRead()}
        >
          <Text style={[$markAllText, { color: theme.colors.tint }]} text="Mark all as read" />
        </TouchableOpacity>
      )}
      {todayItems.length > 0 && (
        <>
          <Text style={[$sectionTitle, { color: theme.colors.textDim }]} text="Today" />
          {todayItems.map(renderItem)}
        </>
      )}
      {earlierItems.length > 0 && (
        <>
          <Text style={[$sectionTitle, { color: theme.colors.textDim }]} text="Earlier" />
          {earlierItems.map(renderItem)}
        </>
      )}
      {items.length === 0 && !notificationStore.isLoading && (
        <View style={$empty}>
          <Text text="No notifications yet" style={{ color: theme.colors.textDim }} />
        </View>
      )}
    </ScrollView>
  )
})

const $container: ViewStyle = {
  flex: 1,
}

const $markAllButton: ViewStyle = {
  alignSelf: "flex-end",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
}

const $markAllText: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
}

const $sectionTitle: TextStyle = {
  fontSize: 13,
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  paddingHorizontal: spacing.md,
  marginTop: spacing.md,
  marginBottom: spacing.xs,
}

const $item: ViewStyle = {
  marginHorizontal: spacing.md,
  marginBottom: spacing.xs,
  borderRadius: 12,
  padding: spacing.md,
}

const $itemRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
}

const $unreadDot: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginTop: 6,
  marginRight: spacing.xs,
}

const $itemBody: ViewStyle = {
  flex: 1,
}

const $itemHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $itemTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  flex: 1,
  marginRight: spacing.xs,
}

const $itemTitleUnread: TextStyle = {
  fontWeight: "700",
}

const $itemTime: TextStyle = {
  fontSize: 12,
}

const $itemMessage: TextStyle = {
  fontSize: 13,
  marginTop: 2,
  lineHeight: 18,
}

const $empty: ViewStyle = {
  padding: spacing.xl,
  alignItems: "center",
}
