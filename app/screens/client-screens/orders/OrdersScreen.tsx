/**
 * Orders Screen
 * Main orders listing and management screen with Nigerian business context
 */

import { FC, useState, useEffect, useCallback } from "react"
import {
  View,
  RefreshControl,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native"
import { observer } from "mobx-react-lite"
import { TabScreenProps } from "@/navigators/ClientTabsNavigator"
import { Screen, Text, Button, Icon, Chip, statusTone } from "@/components"
import {
  OrderFilterBar,
  OrderFilterValue,
  EMPTY_ORDER_FILTER,
  orderFilterToParams,
  matchesOrderFilter,
  countActiveOrderFilters,
} from "@/components/OrderFilterBar"
import { colors, spacing } from "@/theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { Instance } from "mobx-state-tree"
import { NigerianOrderModel } from "@/models/stores/OrderStore"
import { NigerianGarmentType, OrderStatus } from "@/types/orders"

type OrderInstance = Instance<typeof NigerianOrderModel>

interface OrdersScreenProps extends TabScreenProps<"Orders"> {}

export const OrdersScreen: FC<OrdersScreenProps> = observer(function OrdersScreen() {
  const { orderStore, authStore } = useStores()
  const navigation = useNavigation()

  // Filters persist in component state for the session (v1)
  const [filter, setFilter] = useState<OrderFilterValue>(EMPTY_ORDER_FILTER)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const statusOptions = [
    { value: "pending" as OrderStatus, label: "Pending", color: colors.palette.tailorGold },
    { value: "confirmed" as OrderStatus, label: "Confirmed", color: colors.palette.threadBlue },
    { value: "in_progress" as OrderStatus, label: "In Progress", color: colors.palette.sageGreen },
    { value: "ready" as OrderStatus, label: "Ready", color: colors.palette.success500 },
    { value: "delivered" as OrderStatus, label: "Delivered", color: colors.palette.success500 },
    { value: "cancelled" as OrderStatus, label: "Cancelled", color: colors.palette.alertRed },
  ]

  const loadOrders = useCallback(async () => {
    if (!authStore.user?.id) return

    try {
      setIsLoading(true)
      setPage(1)
      await orderStore.loadNigerianOrders(
        { customerId: authStore.user.id, page: 1, ...orderFilterToParams(filter) },
        true,
      )
    } catch (error) {
      console.error("Failed to load orders:", error)
      Alert.alert("Error", "Failed to load orders. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [authStore.user?.id, orderStore, filter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadOrders()
    setIsRefreshing(false)
  }

  const handleLoadMore = async () => {
    if (isLoadingMore || isLoading || !orderStore.orders.hasMore || !authStore.user?.id) return

    try {
      setIsLoadingMore(true)
      const nextPage = page + 1
      await orderStore.loadNigerianOrders({
        customerId: authStore.user.id,
        page: nextPage,
        ...orderFilterToParams(filter),
      })
      setPage(nextPage)
    } catch (error) {
      console.error("Failed to load more orders:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Server-side filters do the heavy lifting; the client-side predicate adds
  // multi-status selection and name/garment search matching on top
  const filteredOrders = orderStore.orders.items.filter((order) =>
    matchesOrderFilter(order, filter),
  )

  const getGarmentDisplayName = (garmentType: NigerianGarmentType) => {
    return orderStore.getTranslation("garments", garmentType) || garmentType
  }

  const formatOrderDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const renderOrderCard = ({ item: order }: { item: OrderInstance }) => {
    const garmentSummary =
      order.items.length === 0
        ? "Custom Order"
        : `${getGarmentDisplayName(order.items[0].garmentType as NigerianGarmentType)}${
            order.items.length > 1 ? `  ·  +${order.items.length - 1} more` : ""
          }`
    const dateLine = order.estimatedDeliveryDate
      ? `Due ${formatOrderDate(order.estimatedDeliveryDate)}`
      : `Placed ${formatOrderDate(order.createdAt)}`

    return (
      <TouchableOpacity
        style={$orderCard}
        activeOpacity={0.7}
        onPress={() => {
          // Navigate to order detail screen
          ;(navigation as any).navigate("OrderDetail", { orderId: order.id })
        }}
      >
        <View style={$orderCardBody}>
          <View style={$orderHeader}>
            <Text style={$orderNumber} numberOfLines={1}>
              #{order.orderNumber}
            </Text>
            <Chip
              text={statusOptions.find((s) => s.value === order.status)?.label ?? order.status}
              tone={statusTone(order.status)}
            />
          </View>

          <Text style={$garmentText} numberOfLines={1}>
            {garmentSummary}
          </Text>

          <View style={$orderFooter}>
            <Text style={$totalAmount}>₦{order.pricing.totalPrice.toLocaleString()}</Text>
            <Text style={$orderDate}>{dateLine}</Text>
          </View>
        </View>
        <Icon icon="caretRight" size={18} color={colors.palette.gray500} />
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => {
    if (countActiveOrderFilters(filter) > 0) {
      return (
        <View style={$emptyState}>
          <Icon icon="view" size={64} color={colors.palette.gray500} />
          <Text style={$emptyTitle}>No Matching Orders</Text>
          <Text style={$emptyDescription}>
            Try adjusting your search or clearing some filters
          </Text>
        </View>
      )
    }
    return (
      <View style={$emptyState}>
        <Icon icon="sew" size={64} color={colors.palette.gray500} />
        <Text style={$emptyTitle}>No Orders Yet</Text>
        <Text style={$emptyDescription}>
          Start your tailoring journey by creating your first order
        </Text>
        <Button
          text="Create New Order"
          style={$createOrderButton}
          textStyle={$createOrderButtonText}
          onPress={() => navigation.navigate("NewOrder" as never)}
        />
      </View>
    )
  }

  return (
    <Screen
      style={$root}
      contentContainerStyle={$screenContent}
      preset="fixed"
      safeAreaEdges={["top"]}
    >
      <View style={$header}>
        <Text style={$title}>My Orders</Text>
        <TouchableOpacity
          style={$addButton}
          onPress={() => navigation.navigate("NewOrder" as never)}
        >
          <Icon icon="sew" size={22} color={colors.palette.neutral100} />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={$filterBarContainer}>
        <OrderFilterBar
          value={filter}
          onChange={setFilter}
          statusOptions={statusOptions}
        />
      </View>

      {/* Orders List */}
      <View style={$content}>
        {isLoading ? (
          <View style={$loadingState}>
            <Text style={$loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          renderEmptyState()
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
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={$listContainer}
          />
        )}
      </View>
    </Screen>
  )
})

// Styles
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

// Screen's fixed preset does not give its inner container a height; without
// flex the content area (and the orders list inside it) collapses to zero.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.md,
}

const $title: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: colors.text,
}

const $addButton: ViewStyle = {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: colors.accent,
  justifyContent: "center",
  alignItems: "center",
}

const $filterBarContainer: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
}

const $content: ViewStyle = {
  flex: 1,
}

const $listContainer: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.xs,
  paddingBottom: spacing.lg,
  gap: spacing.sm,
}

const $orderCard: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.surface,
  borderRadius: 16,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  gap: spacing.xs,
}

const $orderCardBody: ViewStyle = {
  flex: 1,
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.xs,
  marginBottom: spacing.xs,
}

const $orderNumber: TextStyle = {
  flexShrink: 1,
  fontSize: 15,
  fontWeight: "600",
  color: colors.text,
}

const $garmentText: TextStyle = {
  fontSize: 13,
  color: colors.textDim,
  marginBottom: spacing.sm,
}

const $orderFooter: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $totalAmount: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.accent,
}

const $orderDate: TextStyle = {
  fontSize: 12,
  color: colors.palette.gray500,
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
  color: colors.text,
  marginTop: spacing.lg,
  marginBottom: spacing.xs,
}

const $emptyDescription: TextStyle = {
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  marginBottom: spacing.xl,
  lineHeight: 20,
}

const $createOrderButton: ViewStyle = {
  backgroundColor: colors.accent,
  borderWidth: 0,
  borderRadius: 14,
  paddingHorizontal: spacing.xl,
  paddingVertical: spacing.md,
}

const $createOrderButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

const $loadingState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.textDim,
}
