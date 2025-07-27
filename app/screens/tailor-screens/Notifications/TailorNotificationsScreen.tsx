/**
 * Tailor Notifications Screen
 * Comprehensive notification management interface for tailors
 */

import React, { FC, useState, useEffect, useCallback } from "react"
import {
  View,
  ScrollView,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Alert,
  RefreshControl,
  FlatList,
} from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon, Button, Card } from "@/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"

interface TailorNotificationsScreenProps extends AppStackScreenProps<"TailorNotifications"> {}

export const TailorNotificationsScreen: FC<TailorNotificationsScreenProps> = observer(
  ({ navigation }) => {
    const { notificationStore, authStore } = useStores()
    const [refreshing, setRefreshing] = useState(false)
    const [selectedFilter, setSelectedFilter] = useState<"all" | "unread" | "important">("all")
    const [showSettings, setShowSettings] = useState(false)

    const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

    useEffect(() => {
      loadNotifications()
    }, [selectedFilter])

    const loadNotifications = async () => {
      try {
        const params: any = { userId: authStore.user?.id }
        if (selectedFilter === "unread") params.isRead = false
        if (selectedFilter === "important") params.priority = ["high", "urgent"]

        await notificationStore.loadNotifications(params, true)
      } catch (error) {
        console.error("Failed to load notifications:", error)
        Alert.alert("Error", "Failed to load notifications")
      }
    }

    const handleRefresh = async () => {
      setRefreshing(true)
      try {
        await loadNotifications()
      } finally {
        setRefreshing(false)
      }
    }

    const handleMarkAllAsRead = useCallback(() => {
      Alert.alert(
        "Mark All as Read",
        "Are you sure you want to mark all notifications as read?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark All",
            onPress: () => {
              notificationStore.markAllAsRead()
            },
          },
        ]
      )
    }, [notificationStore])

    const handleNotificationPress = useCallback((notification: any) => {
      // Mark as read
      if (!notification.isRead) {
        notificationStore.markAsRead(notification.id)
      }

      // Track click
      notificationStore.trackClick(notification.id)

      // Handle navigation based on notification type
      if (notification.actionUrl) {
        // Parse action URL and navigate accordingly
        if (notification.actionUrl.includes("/orders/")) {
          const orderId = notification.actionUrl.split("/orders/")[1]
          navigation.navigate("TailorOrderDetail", { orderId })
        } else if (notification.actionUrl.includes("/appointments/")) {
          const appointmentId = notification.actionUrl.split("/appointments/")[1]
          // Navigate to appointment detail when implemented
          console.log("Navigate to appointment:", appointmentId)
        } else if (notification.actionUrl.includes("/measurements/")) {
          const measurementId = notification.actionUrl.split("/measurements/")[1]
          // Navigate to measurement detail when implemented
          console.log("Navigate to measurement:", measurementId)
        }
      }
    }, [notificationStore, navigation])

    const handleDismissNotification = useCallback((notificationId: string) => {
      notificationStore.dismissNotification(notificationId)
    }, [notificationStore])

    const getNotificationIcon = (type: string): string => {
      switch (type) {
        case "order_update": return "construct"
        case "appointment_reminder": return "calendar"
        case "measurement_alert": return "ruler"
        case "payment_reminder": return "card"
        case "delivery_notification": return "checkmark"
        case "system_announcement": return "megaphone"
        case "feedback_request": return "chatbubble"
        default: return "notifications"
      }
    }

    const getPriorityColor = (priority: string): string => {
      switch (priority) {
        case "urgent": return colors.error
        case "high": return colors.palette.orange500
        case "medium": return colors.palette.threadBlue
        case "low": return colors.palette.neutral500
        default: return colors.palette.threadBlue
      }
    }

    const formatNotificationTime = (timestamp: string): string => {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMinutes < 1) return "Just now"
      if (diffMinutes < 60) return `${diffMinutes}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" })
    }

    const filteredNotifications = notificationStore.notifications.items.filter((notification: any) => {
      if (notification.userId !== authStore.user?.id) return false
      
      switch (selectedFilter) {
        case "unread": return !notification.isRead
        case "important": return notification.priority === "high" || notification.priority === "urgent"
        default: return true
      }
    })

    const renderNotificationCard = ({ item: notification }: { item: any }) => (
      <Card
        style={[
          $notificationCard,
          !notification.isRead && $unreadCard,
          notification.isDismissed && $dismissedCard
        ]}
        preset="default"
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={$notificationHeader}>
          <View style={$notificationIconContainer}>
            <View style={[
              $notificationIcon,
              { backgroundColor: getPriorityColor(notification.priority) + "20" }
            ]}>
              <Icon
                icon={getNotificationIcon(notification.type)}
                size={20}
                color={getPriorityColor(notification.priority)}
              />
            </View>
            {!notification.isRead && <View style={$unreadDot} />}
          </View>

          <View style={$notificationContent}>
            <View style={$notificationTitleRow}>
              <Text style={[$notificationTitle, !notification.isRead && $unreadTitle]}>
                {notification.title}
              </Text>
              <Text style={$notificationTime}>
                {formatNotificationTime(notification.createdAt)}
              </Text>
            </View>

            <Text style={$notificationBody} numberOfLines={2}>
              {notification.body}
            </Text>

            {notification.actionText && (
              <View style={$actionContainer}>
                <Text style={$actionText}>{notification.actionText}</Text>
                <Icon icon="caretRight" size={14} color={colors.palette.threadBlue} />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={$dismissButton}
            onPress={() => handleDismissNotification(notification.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon icon="x" size={16} color={colors.palette.neutral400} />
          </TouchableOpacity>
        </View>

        {notification.priority === "urgent" && (
          <View style={$urgentBanner}>
            <Icon icon="alert" size={16} color={colors.error} />
            <Text style={$urgentText}>Urgent</Text>
          </View>
        )}
      </Card>
    )

    const renderEmptyState = () => (
      <View style={$emptyState}>
        <Icon icon="notifications" size={64} color={colors.palette.neutral400} />
        <Text style={$emptyStateTitle}>No Notifications</Text>
        <Text style={$emptyStateText}>
          {selectedFilter === "unread" 
            ? "You're all caught up! No unread notifications." 
            : "You don't have any notifications yet."}
        </Text>
      </View>
    )

    const filterOptions = [
      { label: "All", value: "all" },
      { label: "Unread", value: "unread" },
      { label: "Important", value: "important" },
    ]

    return (
      <Screen
        backgroundColor={colors.palette.warmIvory}
        safeAreaEdges={["top"]}
        preset="fixed"
        statusBarStyle="dark"
      >
        {/* Header */}
        <View style={$header}>
          <Button
            style={$backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Icon icon="back" size={24} color={colors.palette.deepCharcoal} />
          </Button>

          <View style={$headerCenter}>
            <Text style={$headerTitle}>Notifications</Text>
            <Text style={$headerSubtitle}>
              {notificationStore.unreadCount} unread
            </Text>
          </View>

          <Button
            style={$settingsButton}
            onPress={() => setShowSettings(!showSettings)}
            accessibilityLabel="Notification settings"
          >
            <Icon icon="settings" size={24} color={colors.palette.deepCharcoal} />
          </Button>
        </View>

        {/* Filter Tabs */}
        <View style={$filtersContainer}>
          <View style={$filterTabs}>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  $filterTab,
                  selectedFilter === option.value && $activeFilterTab
                ]}
                onPress={() => setSelectedFilter(option.value as any)}
              >
                <Text style={[
                  $filterTabText,
                  selectedFilter === option.value && $activeFilterTabText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {notificationStore.unreadCount > 0 && (
            <Button
              text="Mark All Read"
              style={$markAllButton}
              textStyle={$markAllButtonText}
              onPress={handleMarkAllAsRead}
            />
          )}
        </View>

        {/* Notifications List */}
        <View style={$notificationsContainer}>
          {notificationStore.isLoading ? (
            <View style={$loadingContainer}>
              <Text style={$loadingText}>Loading notifications...</Text>
            </View>
          ) : filteredNotifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={filteredNotifications}
              keyExtractor={(item) => item.id}
              renderItem={renderNotificationCard}
              contentContainerStyle={$notificationsList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.palette.tailorGold}
                />
              }
            />
          )}
        </View>

        {/* Settings Panel */}
        {showSettings && (
          <View style={$settingsPanel}>
            <View style={$settingsPanelContent}>
              <Text style={$settingsTitle}>Notification Settings</Text>
              
              <TouchableOpacity style={$settingItem}>
                <Text style={$settingLabel}>Push Notifications</Text>
                <View style={$settingValue}>
                  <Text style={$settingValueText}>
                    {notificationStore.permissions.push === "granted" ? "Enabled" : "Disabled"}
                  </Text>
                  <Icon icon="caretRight" size={16} color={colors.palette.neutral400} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={$settingItem}>
                <Text style={$settingLabel}>Order Updates</Text>
                <View style={$settingValue}>
                  <Text style={$settingValueText}>
                    {notificationStore.preferences?.orderUpdates ? "On" : "Off"}
                  </Text>
                  <Icon icon="caretRight" size={16} color={colors.palette.neutral400} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={$settingItem}>
                <Text style={$settingLabel}>Quiet Hours</Text>
                <View style={$settingValue}>
                  <Text style={$settingValueText}>
                    {notificationStore.preferences?.quietHoursEnabled ? "Enabled" : "Disabled"}
                  </Text>
                  <Icon icon="caretRight" size={16} color={colors.palette.neutral400} />
                </View>
              </TouchableOpacity>

              <Button
                text="Close Settings"
                style={$closeSettingsButton}
                textStyle={$closeSettingsButtonText}
                onPress={() => setShowSettings(false)}
              />
            </View>
          </View>
        )}

        <View style={$bottomContainerInsets} />
      </Screen>
    )
  }
)

// Styles
const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.blushPink,
}

const $backButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "center",
  alignItems: "center",
}

const $headerCenter: ViewStyle = {
  flex: 1,
  alignItems: "center",
  marginHorizontal: spacing.md,
}

const $headerTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}

const $headerSubtitle: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  textAlign: "center",
  marginTop: spacing.xxs,
}

const $settingsButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "center",
  alignItems: "center",
}

const $filtersContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.blushPink,
}

const $filterTabs: ViewStyle = {
  flexDirection: "row",
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  padding: 2,
}

const $filterTab: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 6,
  minWidth: 60,
}

const $activeFilterTab: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
}

const $filterTabText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}

const $activeFilterTabText: TextStyle = {
  color: colors.palette.warmIvory,
  fontWeight: "600",
}

const $markAllButton: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
}

const $markAllButtonText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.warmIvory,
}

const $notificationsContainer: ViewStyle = {
  flex: 1,
}

const $notificationsList: ViewStyle = {
  padding: spacing.lg,
  paddingBottom: spacing.xxl,
}

const $notificationCard: ViewStyle = {
  marginBottom: spacing.md,
  borderLeftWidth: 4,
  borderLeftColor: colors.palette.neutral300,
}

const $unreadCard: ViewStyle = {
  borderLeftColor: colors.palette.tailorGold,
  backgroundColor: colors.palette.tailorGold + "05",
}

const $dismissedCard: ViewStyle = {
  opacity: 0.6,
}

const $notificationHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: spacing.sm,
}

const $notificationIconContainer: ViewStyle = {
  position: "relative",
}

const $notificationIcon: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
}

const $unreadDot: ViewStyle = {
  position: "absolute",
  top: -2,
  right: -2,
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: colors.palette.tailorGold,
}

const $notificationContent: ViewStyle = {
  flex: 1,
}

const $notificationTitleRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.xs,
}

const $notificationTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  flex: 1,
  marginRight: spacing.sm,
}

const $unreadTitle: TextStyle = {
  fontWeight: "700",
}

const $notificationTime: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
}

const $notificationBody: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  lineHeight: 20,
  marginBottom: spacing.sm,
}

const $actionContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
}

const $actionText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.threadBlue,
}

const $dismissButton: ViewStyle = {
  padding: spacing.xs,
}

const $urgentBanner: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  marginTop: spacing.sm,
  paddingTop: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.error + "20",
}

const $urgentText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.error,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.palette.threadBlue,
}

const $emptyState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
}

const $emptyStateTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginTop: spacing.md,
  textAlign: "center",
}

const $emptyStateText: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  marginTop: spacing.sm,
  textAlign: "center",
  lineHeight: 20,
}

const $settingsPanel: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "flex-end",
}

const $settingsPanelContent: ViewStyle = {
  backgroundColor: colors.palette.warmIvory,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: spacing.lg,
  maxHeight: "50%",
}

const $settingsTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.lg,
  textAlign: "center",
}

const $settingItem: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $settingLabel: TextStyle = {
  fontSize: 16,
  color: colors.palette.deepCharcoal,
  fontWeight: "500",
}

const $settingValue: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
}

const $settingValueText: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
}

const $closeSettingsButton: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 12,
  paddingVertical: spacing.md,
  marginTop: spacing.lg,
}

const $closeSettingsButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}
