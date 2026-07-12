/**
 * Order History Screen
 *
 * Past (delivered or cancelled) orders for the current user, reusing the
 * order-card look from OrdersScreen in a lighter form.
 */

import { FC, useCallback, useEffect, useState } from "react"
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native"
import { observer } from "mobx-react-lite"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon } from "@/components"
import { colors, spacing } from "@/theme"
import { useStores } from "@/models"
import { orderApi } from "@/services/api/order-api"
import { formatRelativeTime } from "@/utils/formatRelativeTime"

type HistoryFilter = "all" | "delivered" | "cancelled"

interface OrderHistoryScreenProps extends AppStackScreenProps<"OrderHistory"> {}

export const OrderHistoryScreen: FC<OrderHistoryScreenProps> = observer(
  function OrderHistoryScreen() {
    const navigation = useNavigation()
    const { authStore } = useStores()

    const [orders, setOrders] = useState<Record<string, any>[]>([])
    const [filter, setFilter] = useState<HistoryFilter>("all")
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Fetch delivered + cancelled orders for the current user, newest first
    const loadHistory = useCallback(async () => {
      const userId = authStore.user?.id
      if (!userId) return
      const [delivered, cancelled] = await Promise.all([
        orderApi.fetchOrders({ customerId: userId, status: "delivered", perPage: 50 }),
        orderApi.fetchOrders({ customerId: userId, status: "cancelled", perPage: 50 }),
      ])
      const merged = [
        ...(delivered.success ? delivered.data.orders : []),
        ...(cancelled.success ? cancelled.data.orders : []),
      ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      setOrders(merged)
    }, [authStore.user?.id])

    useEffect(() => {
      let cancelled = false
      setIsLoading(true)
      loadHistory().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
      return () => {
        cancelled = true
      }
    }, [loadHistory])

    const handleRefresh = async () => {
      setIsRefreshing(true)
      await loadHistory()
      setIsRefreshing(false)
    }

    const filteredOrders =
      filter === "all" ? orders : orders.filter((order) => order.status === filter)

    const filterOptions: { value: HistoryFilter; label: string }[] = [
      { value: "all", label: "All" },
      { value: "delivered", label: "Delivered" },
      { value: "cancelled", label: "Cancelled" },
    ]

    const titleCase = (value: string) =>
      value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

    const renderOrderCard = ({ item: order }: { item: Record<string, any> }) => {
      const isDelivered = order.status === "delivered"
      const statusColor = isDelivered ? colors.palette.success500 : colors.palette.alertRed
      return (
        <TouchableOpacity
          style={$orderCard}
          onPress={() => (navigation as any).navigate("OrderDetail", { orderId: order.id })}
        >
          <View style={$orderHeader}>
            <View style={$orderTitleSection}>
              <Text style={$orderNumber}>#{order.orderNumber}</Text>
              <View style={[$statusBadge, { backgroundColor: statusColor + "20" }]}>
                <Text style={[$statusText, { color: statusColor }]}>
                  {titleCase(order.status)}
                </Text>
              </View>
            </View>
            <Text style={$orderDate}>{formatRelativeTime(order.createdAt)}</Text>
          </View>

          <View style={$orderItem}>
            <Icon icon="sew" size={16} color={colors.palette.threadBlue} />
            <Text style={$itemName}>{titleCase(order.garmentType ?? "custom")}</Text>
            <Text style={$itemPrice}>
              ₦{(order.pricing?.totalPrice ?? 0).toLocaleString()}
            </Text>
          </View>

          {isDelivered && order.actualDeliveryDate && (
            <Text style={$deliveredText}>
              Delivered{" "}
              {new Date(order.actualDeliveryDate).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          )}
        </TouchableOpacity>
      )
    }

    return (
      <Screen
        style={$root}
        preset="fixed"
        safeAreaEdges={["top"]}
        statusBarStyle="dark"
        contentContainerStyle={$screenContent}
      >
        {/* Header */}
        <View style={$header}>
          <TouchableOpacity
            style={$backButton}
            onPress={() => navigation.goBack()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={colors.palette.neutral900} />
          </TouchableOpacity>
          <Text style={$headerTitle}>Order History</Text>
          <View style={$headerSpacer} />
        </View>

        {/* Filter chips */}
        <View style={$filterRow}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[$filterChip, filter === option.value && $filterChipActive]}
              onPress={() => setFilter(option.value)}
            >
              <Text style={[$filterChipText, filter === option.value && $filterChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={$emptyState}>
            <Text style={$emptyDescription}>Loading history...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={$emptyState}>
            <Icon icon="sew" size={64} color={colors.palette.neutral400} />
            <Text style={$emptyTitle}>No Past Orders</Text>
            <Text style={$emptyDescription}>
              Delivered and cancelled orders will show up here
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderCard}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.palette.tailorGold}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={$listContainer}
          />
        )}
      </Screen>
    )
  },
)

// Styles
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.neutral100,
}

// Screen's fixed preset gives its inner container no height; without flex the
// history list collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $backButton: ViewStyle = {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
}

const $headerTitle: TextStyle = {
  flex: 1,
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.neutral900,
  textAlign: "center",
}

const $headerSpacer: ViewStyle = {
  width: 40,
}

const $filterRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
}

const $filterChip: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  backgroundColor: colors.palette.neutral200,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $filterChipActive: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
  borderColor: colors.palette.tailorGold,
}

const $filterChipText: TextStyle = {
  fontSize: 13,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $filterChipTextActive: TextStyle = {
  color: colors.palette.warmIvory,
}

const $listContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xl,
  gap: spacing.md,
}

const $orderCard: ViewStyle = {
  backgroundColor: colors.palette.warmIvory,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  shadowColor: colors.palette.deepCharcoal,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.sm,
}

const $orderTitleSection: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
}

const $orderNumber: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $statusBadge: ViewStyle = {
  borderRadius: 6,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
}

const $statusText: TextStyle = {
  fontSize: 11,
  fontWeight: "600",
  textTransform: "uppercase",
}

const $orderDate: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
}

const $orderItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
}

const $itemName: TextStyle = {
  flex: 1,
  fontSize: 13,
  color: colors.palette.deepCharcoal,
}

const $itemPrice: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
  color: colors.palette.tailorGold,
}

const $deliveredText: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  marginTop: spacing.sm,
}

const $emptyState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
}

const $emptyTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginTop: spacing.lg,
  marginBottom: spacing.xs,
}

const $emptyDescription: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  textAlign: "center",
  lineHeight: 20,
}
