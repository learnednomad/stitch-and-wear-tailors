/**
 * Orders Screen
 * Main orders listing and management screen with Nigerian business context
 */

import { FC, useState, useEffect, useCallback } from "react"
import {
  View,
  ScrollView,
  RefreshControl,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native"
import { observer } from "mobx-react-lite"
import { TabScreenProps } from "@/navigators/ClientTabsNavigator"
import { Screen, Text, Button, Icon, TextField } from "@/components"
import { colors, spacing } from "@/theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { Instance } from "mobx-state-tree"
import { NigerianOrderModel } from "@/models/stores/OrderStore"
import { NigerianGarmentType, OrderStatus, NigerianCity } from "@/types/orders"

type OrderInstance = Instance<typeof NigerianOrderModel>

interface OrdersScreenProps extends TabScreenProps<"Orders"> {}

export const OrdersScreen: FC<OrdersScreenProps> = observer(function OrdersScreen() {
  const { orderStore, authStore } = useStores()
  const navigation = useNavigation()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "all">("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const statusOptions = [
    { value: "all" as const, label: "All Orders", color: colors.palette.neutral500 },
    { value: "pending" as OrderStatus, label: "Pending", color: colors.palette.tailorGold },
    { value: "confirmed" as OrderStatus, label: "Confirmed", color: colors.palette.threadBlue },
    { value: "in_progress" as OrderStatus, label: "In Progress", color: colors.palette.sageGreen },
    { value: "completed" as OrderStatus, label: "Completed", color: colors.palette.success500 },
    { value: "cancelled" as OrderStatus, label: "Cancelled", color: colors.palette.alertRed },
  ]

  const loadOrders = useCallback(async () => {
    if (!authStore.user?.id) return

    try {
      setIsLoading(true)
      await orderStore.loadNigerianOrders(authStore.user.id)
    } catch (error) {
      console.error("Failed to load orders:", error)
      Alert.alert("Error", "Failed to load orders. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [authStore.user?.id, orderStore])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadOrders()
    setIsRefreshing(false)
  }

  const filteredOrders = orderStore.orders.items.filter((order) => {
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerInfo.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerInfo.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orderStore
        .getTranslation("garments", order.items[0]?.garmentType || "")
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getStatusColor = (status: OrderStatus) => {
    const statusOption = statusOptions.find((opt) => opt.value === status)
    return statusOption?.color || colors.palette.neutral500
  }

  const getGarmentDisplayName = (garmentType: NigerianGarmentType) => {
    return orderStore.getTranslation("garments", garmentType) || garmentType
  }

  const getCityDisplayName = (city: NigerianCity) => {
    return orderStore.getTranslation("cities", city) || city
  }

  const formatOrderDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const renderOrderCard = ({ item: order }: { item: OrderInstance }) => (
    <TouchableOpacity
      style={$orderCard}
      onPress={() => {
        // Navigate to order detail screen
        navigation.navigate("OrderDetail" as never, { orderId: order.id })
      }}
    >
      <View style={$orderHeader}>
        <View style={$orderTitleSection}>
          <Text style={$orderNumber}>#{order.orderNumber}</Text>
          <View
            style={[
              $statusBadge,
              { backgroundColor: getStatusColor(order.status as OrderStatus) + "20" },
            ]}
          >
            <Text style={[$statusText, { color: getStatusColor(order.status as OrderStatus) }]}>
              {statusOptions.find((s) => s.value === order.status)?.label}
            </Text>
          </View>
        </View>
        <Text style={$orderDate}>{formatOrderDate(order.createdAt)}</Text>
      </View>

      <View style={$orderInfo}>
        <View style={$customerInfo}>
          <Text style={$customerName}>
            {order.customerInfo.firstName} {order.customerInfo.lastName}
          </Text>
          <Text style={$customerDetails}>
            {order.customerInfo.phone} • {getCityDisplayName(order.city as NigerianCity)}
          </Text>
        </View>
      </View>

      <View style={$orderItems}>
        {order.items.slice(0, 2).map((item: any, index: number) => (
          <View key={index} style={$orderItem}>
            <Icon icon="sew" size={16} color={colors.palette.threadBlue} />
            <Text style={$itemName}>
              {getGarmentDisplayName(item.garmentType as NigerianGarmentType)}
            </Text>
            <Text style={$itemPrice}>₦{item.totalPrice.toLocaleString()}</Text>
          </View>
        ))}
        {order.items.length > 2 && (
          <Text style={$moreItems}>+{order.items.length - 2} more items</Text>
        )}
      </View>

      <View style={$orderFooter}>
        <View style={$totalSection}>
          <Text style={$totalLabel}>Total:</Text>
          <Text style={$totalAmount}>₦{order.pricing.totalPrice.toLocaleString()}</Text>
        </View>

        <View style={$progressSection}>
          <View style={$progressBar}>
            <View
              style={[
                $progressFill,
                {
                  width: `${order.progress.percentage}%`,
                  backgroundColor: getStatusColor(order.status as OrderStatus),
                },
              ]}
            />
          </View>
          <Text style={$progressText}>{order.progress.percentage}% Complete</Text>
        </View>
      </View>

      {order.estimatedDeliveryDate && (
        <View style={$deliveryInfo}>
          <Icon icon="appointment" size={14} color={colors.palette.threadBlue} />
          <Text style={$deliveryText}>
            Est. Delivery: {formatOrderDate(order.estimatedDeliveryDate)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={$emptyState}>
      <Icon icon="sew" size={64} color={colors.palette.neutral400} />
      <Text style={$emptyTitle}>No Orders Yet</Text>
      <Text style={$emptyDescription}>
        Start your tailoring journey by creating your first order
      </Text>
      <Button
        text="Create New Order"
        style={$createOrderButton}
        textStyle={$createOrderButtonText}
        onPress={() => navigation.navigate("OrderCreation" as never)}
      />
    </View>
  )

  return (
    <Screen style={$root} preset="fixed">
      <View style={$header}>
        <Text style={$title}>My Orders</Text>
        <TouchableOpacity
          style={$addButton}
          onPress={() => navigation.navigate("OrderCreation" as never)}
        >
          <Icon icon="sew" size={24} color={colors.palette.warmIvory} />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={$searchContainer}>
        <TextField
          placeholder="Search orders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          LeftAccessory={() => <Icon icon="view" size={20} color={colors.palette.threadBlue} />}
          containerStyle={$searchField}
        />
      </View>

      {/* Status Filter */}
      <View style={$filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={$filterList}>
            {statusOptions.map((status) => (
              <Button
                key={status.value}
                text={status.label}
                style={[$filterButton, selectedStatus === status.value && $selectedFilterButton]}
                textStyle={[
                  $filterButtonText,
                  selectedStatus === status.value && $selectedFilterButtonText,
                ]}
                onPress={() => setSelectedStatus(status.value)}
              />
            ))}
          </View>
        </ScrollView>
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
  backgroundColor: colors.palette.neutral100,
}

const $header: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.lg,
  backgroundColor: colors.palette.warmIvory,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $title: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $addButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.tailorGold,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: colors.palette.deepCharcoal,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
}

const $searchContainer: ViewStyle = {
  padding: spacing.lg,
  backgroundColor: colors.palette.warmIvory,
}

const $searchField: ViewStyle = {
  marginBottom: 0,
}

const $filterContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.md,
  backgroundColor: colors.palette.warmIvory,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $filterList: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $filterButton: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderRadius: 20,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $selectedFilterButton: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
  borderColor: colors.palette.tailorGold,
}

const $filterButtonText: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $selectedFilterButtonText: TextStyle = {
  color: colors.palette.warmIvory,
}

const $content: ViewStyle = {
  flex: 1,
}

const $listContainer: ViewStyle = {
  padding: spacing.lg,
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

const $orderInfo: ViewStyle = {
  marginBottom: spacing.md,
}

const $customerInfo: ViewStyle = {
  gap: spacing.xxs,
}

const $customerName: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $customerDetails: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
}

const $orderItems: ViewStyle = {
  gap: spacing.xs,
  marginBottom: spacing.md,
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

const $moreItems: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  fontStyle: "italic",
  marginLeft: spacing.xl,
}

const $orderFooter: ViewStyle = {
  gap: spacing.sm,
}

const $totalSection: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral300,
}

const $totalLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $totalAmount: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.sageGreen,
}

const $progressSection: ViewStyle = {
  gap: spacing.xs,
}

const $progressBar: ViewStyle = {
  height: 4,
  backgroundColor: colors.palette.neutral300,
  borderRadius: 2,
  overflow: "hidden",
}

const $progressFill: ViewStyle = {
  height: "100%",
  borderRadius: 2,
}

const $progressText: TextStyle = {
  fontSize: 11,
  color: colors.palette.threadBlue,
  textAlign: "right",
}

const $deliveryInfo: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  marginTop: spacing.sm,
  paddingTop: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral300,
}

const $deliveryText: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
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
  marginBottom: spacing.xl,
  lineHeight: 20,
}

const $createOrderButton: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 12,
  paddingHorizontal: spacing.xl,
  paddingVertical: spacing.md,
}

const $createOrderButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
}

const $loadingState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.palette.threadBlue,
}
