import React, { FC, useEffect, useState, useCallback } from "react"
import { View, FlatList, TouchableOpacity, ViewStyle, TextStyle, RefreshControl } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import {
  Button,
  Screen,
  Icon,
  Text,
  ThemeToggle,
  IconTypes,
  StatTile,
  SectionHeader,
  Chip,
  statusTone,
  statusLabel,
} from "@/components"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/utils/useAppTheme"
import { useClientOrders } from "@/api/orders"
import { useNotifications, unreadCountOf } from "@/api/notifications"
import { useClientMeasurements } from "@/api/measurements"
import { useOrderDraftStore } from "@/state/orderDraftStore"
import { useAuthStore } from "@/state/authStore"
import { useNavigation } from "@react-navigation/native"
import { appointmentApi, PBAppointment } from "@/services/api/appointment-api"

interface ClientPortalScreenProps extends AppStackScreenProps<"Home"> {}

const getGreeting = () => {
  const currentHour = new Date().getHours()
  return currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening"
}

export const HomeScreen: FC<ClientPortalScreenProps> = () => {
  const { theme } = useAppTheme()
  const navigation = useNavigation()
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const [greeting] = React.useState(getGreeting())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [nextAppointment, setNextAppointment] = useState<PBAppointment | null>(null)

  const authStore = useAuthStore()
  const getTranslation = useOrderDraftStore((s) => s.getTranslation)

  // Get user data from stores
  const currentUser = authStore.user
  const userProfile = currentUser?.profile
  const userName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Welcome User"

  // Notifications drive the bell badge (React Query)
  const { data: notifications = [], refetch: refetchNotifications } = useNotifications()
  const unreadNotifications = unreadCountOf(notifications)

  // Real order data via React Query (loaded/kept fresh automatically)
  const { data: myOrders = [], refetch: refetchOrders } = useClientOrders(currentUser?.id)
  // Client's own measurement records (React Query)
  const { data: measurements = [] } = useClientMeasurements(currentUser?.id)
  const activeOrdersCount = myOrders.filter((order: any) =>
    ["pending", "confirmed", "in_progress", "ready"].includes(order.status),
  ).length
  const outstandingBalance = myOrders
    .filter((order: any) => order.status !== "cancelled")
    .reduce((sum: number, order: any) => sum + (order.pricing?.balanceAmount ?? 0), 0)

  // Get recent data with safe access
  const recentOrders = myOrders.slice(0, 3) // Get first 3 orders
  const recentMeasurements = measurements.slice(0, 3) // Get first 3 measurements

  // Button style overrides (Button owns its className; these inline overrides
  // read the live theme so they stay dark-aware).
  const $primaryButton: ViewStyle = {
    backgroundColor: theme.colors.accent,
    borderWidth: 0,
    borderRadius: 14,
    paddingVertical: 12,
    minHeight: 52,
  }
  const $primaryButtonPressed: ViewStyle = {
    backgroundColor: theme.colors.palette.emerald600,
  }
  const $primaryButtonText: TextStyle = {
    fontSize: 16,
    color: theme.colors.palette.neutral100,
  }

  // Load data on component mount
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = useCallback(async () => {
    if (!currentUser?.id) return

    try {
      await Promise.all([
        // Own orders drive the stat tiles and the recent-orders rail (React Query)
        refetchOrders(),
        // Next upcoming appointment
        appointmentApi.listUpcoming().then((result) => {
          if (result.success) {
            const upcoming = result.data.filter((a) => a.status !== "cancelled")
            setNextAppointment(upcoming[0] ?? null)
          }
        }),
        // Refresh notifications from PocketBase so the bell badge is live
        refetchNotifications(),
      ])
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    }
  }, [currentUser?.id])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadDashboardData()
    setIsRefreshing(false)
  }, [loadDashboardData])

  // Helper function to format Nigerian currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`
  }

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const renderOrder = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="w-60 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
      onPress={() => (navigation as any).navigate("OrderDetail", { orderId: item.id })}
      accessible
      accessibilityLabel={`Order: ${item.orderNumber}`}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <Text
          className="shrink text-[12px] leading-4 tracking-[0.4px] text-gray500 dark:text-gray500-dark"
          numberOfLines={1}
        >
          #{item.orderNumber}
        </Text>
        <Chip text={statusLabel(item.status)} tone={statusTone(item.status)} />
      </View>
      <Text
        weight="semiBold"
        className="mb-1 text-[16px] leading-[22px] text-text dark:text-text-dark"
        numberOfLines={1}
      >
        {item.items?.[0]?.garmentType
          ? getTranslation("garments", item.items[0].garmentType) || item.items[0].garmentType
          : "Custom Order"}
      </Text>
      <Text className="mb-2 text-[13px] leading-[18px] text-textDim dark:text-textDim-dark">
        Due {item.estimatedDeliveryDate ? formatDate(item.estimatedDeliveryDate) : "TBD"}
      </Text>
      <Text
        weight="semiBold"
        className="text-[16px] leading-[22px] text-accent dark:text-accent-dark"
      >
        {formatCurrency(item.pricing?.totalPrice || 0)}
      </Text>
    </TouchableOpacity>
  )

  const quickActions = [
    {
      title: "Add Measurement",
      subtitle: "Submit new sizes",
      icon: "profile" as const,
      onPress: () => navigation.navigate("Measurement" as never),
    },
    {
      title: "Browse Fabrics",
      subtitle: "Choose materials",
      icon: "view" as const,
      onPress: () => navigation.navigate("FabricSearch" as never),
    },
    {
      title: "Track Orders",
      subtitle: "View progress",
      icon: "sew" as const,
      onPress: () => navigation.navigate("Orders" as never),
    },
    {
      title: "Book Fitting",
      subtitle: "Schedule a visit",
      icon: "appointment" as const,
      onPress: () => navigation.navigate("BookFitting" as never),
    },
    {
      title: "Style Catalog",
      subtitle: "Browse designs",
      icon: "menu" as const,
      onPress: () => navigation.navigate("Catalog" as never),
    },
  ]

  const renderQuickAction = (item: {
    title: string
    subtitle: string
    icon: IconTypes
    onPress: () => void
  }) => (
    <TouchableOpacity
      key={item.title}
      className="basis-[31%] grow rounded-2xl border border-border bg-surface p-3 dark:border-border-dark dark:bg-surface-dark"
      onPress={item.onPress}
      accessible
      accessibilityLabel={item.title}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <View className="mb-2 h-[34px] w-[34px] items-center justify-center rounded-[17px] bg-accentSoft dark:bg-accentSoft-dark">
        <Icon icon={item.icon} size={18} color={theme.colors.accent} />
      </View>
      <Text
        weight="semiBold"
        className="text-[13px] leading-[18px] text-text dark:text-text-dark"
        text={item.title}
      />
      <Text className="text-[11px] leading-[15px] text-textDim dark:text-textDim-dark">
        {item.subtitle}
      </Text>
    </TouchableOpacity>
  )

  const nextFittingLabel = nextAppointment
    ? new Date(nextAppointment.scheduledAt).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
      })
    : "—"

  return (
    <Screen
      backgroundColor={theme.colors.background}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle={theme.isDark ? "light" : "dark"}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        ),
      }}
    >
      <View className="flex-1">
        {/* Greeting header */}
        <View className="mb-6 flex-row items-center justify-between px-4 pt-3">
          <View className="mr-3 flex-1">
            <Text
              className="text-[14px] leading-5 text-textDim dark:text-textDim-dark"
              accessibilityLabel={greeting}
            >
              {greeting},
            </Text>
            <Text
              weight="bold"
              className="text-[24px] leading-8 text-text dark:text-text-dark"
              numberOfLines={1}
              accessibilityLabel="Client Name"
            >
              {userName}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-surface dark:border-border-dark dark:bg-surface-dark">
              <ThemeToggle size={20} />
            </View>
            <TouchableOpacity
              className="h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-surface dark:border-border-dark dark:bg-surface-dark"
              onPress={() => navigation.navigate("ClientNotifications" as never)}
              accessible
              accessibilityLabel="Notifications"
            >
              <Icon icon="bell" size={20} color={theme.colors.text} />
              {unreadNotifications > 0 && (
                <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-[9px] border-2 border-background bg-error px-1 dark:border-background-dark dark:bg-error-dark">
                  <Text
                    weight="semiBold"
                    className="text-[10px] leading-3 text-neutral100 dark:text-neutral100-dark"
                  >
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stat tiles */}
        <View className="mb-8 flex-row gap-2 px-4">
          <StatTile icon="sew" value={String(activeOrdersCount)} label="Active Orders" />
          <StatTile icon="money" value={formatCurrency(outstandingBalance)} label="Outstanding" />
          <StatTile icon="appointment" value={nextFittingLabel} label="Next Fitting" />
        </View>

        {/* Quick Actions */}
        <View className="mb-8">
          <SectionHeader title="Quick Actions" style={$sectionHeader} />
          <View className="flex-row flex-wrap gap-2 px-4" accessibilityLabel="Quick Actions List">
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* Recent Orders */}
        <View className="mb-8">
          <SectionHeader
            title="Recent Orders"
            actionText="View All"
            onActionPress={() => navigation.navigate("Orders" as never)}
            style={$sectionHeader}
          />
          <FlatList
            data={recentOrders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={252}
            decelerationRate="fast"
            contentContainerStyle={$orderListContent}
            accessibilityLabel="Recent Orders List"
          />
        </View>

        {/* Recent Measurements */}
        <View className="mb-8">
          <SectionHeader
            title="Recent Measurements"
            actionText="View All"
            onActionPress={() => navigation.navigate("Measurement" as never)}
            style={$sectionHeader}
          />
          {recentMeasurements.map((item) => (
            <TouchableOpacity
              key={item.id}
              className="mx-4 mb-3 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
              onPress={() => console.log(`Navigate to Measurement Details: ${item.id}`)}
              accessible
              accessibilityLabel={`Measurement: ${item.name || "Custom"}`}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    weight="semiBold"
                    className="text-[15px] leading-[21px] text-text dark:text-text-dark"
                  >
                    {item.name || "Custom Measurement"}
                  </Text>
                  <Text className="text-[12px] leading-[17px] text-textDim dark:text-textDim-dark">
                    {item.measurementType || "General"} · {item.isDefault ? "Default" : "Saved"}
                  </Text>
                </View>
                <Icon icon="caretRight" size={18} color={theme.colors.palette.gray500} />
              </View>
              <View className="flex-row justify-between border-t border-separator py-3 dark:border-separator-dark">
                {[
                  { label: "Chest", value: item.chest },
                  { label: "Waist", value: item.waist },
                  { label: "Hips", value: item.hips },
                ].map(({ label, value }) => (
                  <View key={label} className="flex-1 items-center">
                    <Text className="mb-1 text-[12px] leading-[17px] text-textDim dark:text-textDim-dark">
                      {label}
                    </Text>
                    <Text
                      weight="semiBold"
                      className="text-[14px] leading-5 text-text dark:text-text-dark"
                    >
                      {value || 0} cm
                    </Text>
                  </View>
                ))}
              </View>
              <Text className="text-[12px] leading-[17px] text-gray500 dark:text-gray500-dark">
                Measured on {item.created ? formatDate(item.created) : "Unknown"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA Button */}
        <View className="px-4 pb-4" style={$bottomContainerInsets}>
          <Button
            text="Add Measurement"
            style={$primaryButton}
            pressedStyle={$primaryButtonPressed}
            textStyle={$primaryButtonText}
            onPress={() => navigation.navigate("Measurement" as never)}
            accessible
            accessibilityLabel="Add new measurement"
          />
        </View>
      </View>
    </Screen>
  )
}

// Styles
// This screen was fully themed(); container colors are now className token
// utilities with `dark:` twins. Non-className surfaces (Screen background, Icon
// color, RefreshControl tint, Button style overrides) read the live theme so
// they stay dark-aware. These two plain layout objects feed props that take a
// style (SectionHeader.style and FlatList.contentContainerStyle).
const $sectionHeader: ViewStyle = { paddingHorizontal: 16, marginBottom: 12 }
const $orderListContent: ViewStyle = { paddingHorizontal: 16, gap: 12 }
