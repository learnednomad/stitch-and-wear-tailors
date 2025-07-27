/**
 * Tailor Order List Screen
 * Comprehensive order management interface for tailors with Nigerian business context
 */

import React, { FC, useState, useEffect } from "react"
import {
  View,
  ScrollView,
  ViewStyle,
  TextStyle,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, Icon, Button, Card, TextField } from "app/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { OrderStatus, OrderPriority, NigerianGarmentType, NigerianCity } from "@/types/orders"

interface TailorOrderListScreenProps extends AppStackScreenProps<"TailorOrderList"> {}

export const TailorOrderListScreen: FC<TailorOrderListScreenProps> = observer(({ navigation }) => {
  const { orderStore } = useStores()
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<"all" | OrderStatus>("all")
  const [selectedPriority, setSelectedPriority] = useState<"all" | OrderPriority>("all")
  const [showFilters, setShowFilters] = useState(false)
  
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

  useEffect(() => {
    loadOrders()
  }, [selectedFilter, selectedPriority])

  const loadOrders = async () => {
    try {
      const params: any = {}
      if (selectedFilter !== "all") params.status = selectedFilter
      if (selectedPriority !== "all") params.priority = selectedPriority
      if (searchQuery.trim()) params.search = searchQuery.trim()
      
      await orderStore.loadNigerianOrders(params, true)
    } catch (error) {
      console.error("Failed to load orders:", error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadOrders()
    } finally {
      setRefreshing(false)
    }
  }

  const handleSearch = async () => {
    await loadOrders()
  }

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case "pending": return colors.palette.threadBlue
      case "confirmed": return colors.palette.sageGreen
      case "in_progress": return colors.palette.tailorGold
      case "ready": return colors.palette.deepCharcoal
      case "delivered": return colors.palette.sageGreen
      case "cancelled": return colors.error
      default: return colors.palette.threadBlue
    }
  }

  const getPriorityColor = (priority: OrderPriority): string => {
    switch (priority) {
      case "urgent": return colors.error
      case "high": return colors.palette.orange500
      case "normal": return colors.palette.threadBlue
      case "low": return colors.palette.neutral500
      default: return colors.palette.threadBlue
    }
  }

  const formatCurrency = (amount: number): string => {
    return `₦${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const orderStatuses: Array<{ label: string; value: "all" | OrderStatus }> = [
    { label: "All Orders", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "In Progress", value: "in_progress" },
    { label: "Ready", value: "ready" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ]

  const orderPriorities: Array<{ label: string; value: "all" | OrderPriority }> = [
    { label: "All Priorities", value: "all" },
    { label: "Urgent", value: "urgent" },
    { label: "High", value: "high" },
    { label: "Normal", value: "normal" },
    { label: "Low", value: "low" },
  ]

  const renderOrderCard = ({ item: order }: { item: any }) => (
    <Card 
      style={$orderCard}
      preset="default"
      onPress={() => navigation.navigate("TailorOrderDetail", { orderId: order.id })}
    >
      {/* Order Header */}
      <View style={$orderHeader}>
        <View style={$orderTitleContainer}>
          <Text style={$orderNumber}>#{order.orderNumber}</Text>
          <Text style={$customerName}>
            {order.customerInfo.firstName} {order.customerInfo.lastName}
          </Text>
        </View>
        <View style={$orderBadges}>
          <View style={[$priorityBadge, { backgroundColor: getPriorityColor(order.priority) + "20" }]}>
            <Text style={[$priorityText, { color: getPriorityColor(order.priority) }]}>
              {order.priority.toUpperCase()}
            </Text>
          </View>
          <View style={[$statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
            <Text style={[$statusText, { color: getStatusColor(order.status) }]}>
              {order.status.replace("_", " ").toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Details */}
      <View style={$orderDetails}>
        <View style={$detailRow}>
          <Icon icon="construct" size={16} color={colors.palette.threadBlue} />
          <Text style={$detailText}>
            {orderStore.getTranslation("garments", order.garmentType)}
          </Text>
        </View>
        <View style={$detailRow}>
          <Icon icon="location" size={16} color={colors.palette.threadBlue} />
          <Text style={$detailText}>
            {orderStore.getTranslation("cities", order.city)}
          </Text>
        </View>
        <View style={$detailRow}>
          <Icon icon="calendar" size={16} color={colors.palette.threadBlue} />
          <Text style={$detailText}>
            Due: {formatDate(order.estimatedDeliveryDate)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={$progressSection}>
        <View style={$progressHeader}>
          <Text style={$progressLabel}>Progress</Text>
          <Text style={$progressPercentage}>{order.progress.percentage}%</Text>
        </View>
        <View style={$progressBarContainer}>
          <View 
            style={[
              $progressBar,
              { width: `${order.progress.percentage}%` }
            ]} 
          />
        </View>
      </View>

      {/* Order Footer */}
      <View style={$orderFooter}>
        <View style={$priceContainer}>
          <Text style={$priceLabel}>Total:</Text>
          <Text style={$priceValue}>{formatCurrency(order.pricing.totalPrice)}</Text>
        </View>
        <TouchableOpacity 
          style={$actionButton}
          onPress={() => navigation.navigate("TailorOrderDetail", { orderId: order.id })}
        >
          <Text style={$actionButtonText}>View Details</Text>
          <Icon icon="caretRight" size={16} color={colors.palette.tailorGold} />
        </TouchableOpacity>
      </View>
    </Card>
  )

  const renderEmptyState = () => (
    <View style={$emptyState}>
      <Icon icon="list" size={64} color={colors.palette.neutral400} />
      <Text style={$emptyStateTitle}>No Orders Found</Text>
      <Text style={$emptyStateText}>
        {searchQuery ? 
          "No orders match your search criteria." :
          "You don't have any orders yet."
        }
      </Text>
      {searchQuery && (
        <Button
          text="Clear Search"
          style={$clearSearchButton}
          textStyle={$clearSearchButtonText}
          onPress={() => {
            setSearchQuery("")
            setSelectedFilter("all")
            setSelectedPriority("all")
          }}
        />
      )}
    </View>
  )

  const orders = orderStore.orders.items
  const filteredOrders = orders.filter(order => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerInfo.firstName.toLowerCase().includes(query) ||
        order.customerInfo.lastName.toLowerCase().includes(query) ||
        order.garmentType.toLowerCase().includes(query)
      )
    }
    return true
  })

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
          <Text style={$headerTitle}>Order Management</Text>
          <Text style={$headerSubtitle}>{filteredOrders.length} orders</Text>
        </View>
        
        <Button
          style={$filterButton}
          onPress={() => setShowFilters(!showFilters)}
          accessibilityLabel="Toggle filters"
        >
          <Icon icon="settings" size={24} color={colors.palette.deepCharcoal} />
        </Button>
      </View>

      {/* Search and Filters */}
      <View style={$searchSection}>
        <TextField
          placeholder="Search orders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          RightAccessory={() => (
            <TouchableOpacity onPress={handleSearch} style={$searchButton}>
              <Icon icon="find" size={20} color={colors.palette.threadBlue} />
            </TouchableOpacity>
          )}
          style={$searchInput}
        />
      </View>

      {/* Filter Chips */}
      {showFilters && (
        <View style={$filtersSection}>
          <Text style={$filtersTitle}>Status</Text>
          <FlatList
            data={orderStatuses}
            keyExtractor={item => item.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  $filterChip,
                  selectedFilter === item.value && $selectedFilterChip
                ]}
                onPress={() => setSelectedFilter(item.value)}
              >
                <Text style={[
                  $filterChipText,
                  selectedFilter === item.value && $selectedFilterChipText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={$filtersList}
          />

          <Text style={$filtersTitle}>Priority</Text>
          <FlatList
            data={orderPriorities}
            keyExtractor={item => item.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  $filterChip,
                  selectedPriority === item.value && $selectedFilterChip
                ]}
                onPress={() => setSelectedPriority(item.value)}
              >
                <Text style={[
                  $filterChipText,
                  selectedPriority === item.value && $selectedFilterChipText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={$filtersList}
          />
        </View>
      )}

      {/* Orders List */}
      <View style={$ordersContainer}>
        {orderStore.isLoading ? (
          <View style={$loadingContainer}>
            <Text style={$loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={item => item.id}
            renderItem={renderOrderCard}
            contentContainerStyle={$ordersList}
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[$fab, $bottomContainerInsets]}
        onPress={() => navigation.navigate("OrderCreation")}
        accessibilityLabel="Create new order"
      >
        <Icon icon="plus" size={24} color={colors.palette.warmIvory} />
      </TouchableOpacity>
    </Screen>
  )
})

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

const $filterButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "center",
  alignItems: "center",
}

const $searchSection: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
}

const $searchInput: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
}

const $searchButton: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
}

const $filtersSection: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.blushPink,
}

const $filtersTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.sm,
  marginTop: spacing.sm,
}

const $filtersList: ViewStyle = {
  paddingRight: spacing.lg,
}

const $filterChip: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderRadius: 16,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  marginRight: spacing.sm,
}

const $selectedFilterChip: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
}

const $filterChipText: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $selectedFilterChipText: TextStyle = {
  color: colors.palette.warmIvory,
  fontWeight: "600",
}

const $ordersContainer: ViewStyle = {
  flex: 1,
}

const $ordersList: ViewStyle = {
  padding: spacing.lg,
  paddingBottom: spacing.xxl,
}

const $orderCard: ViewStyle = {
  marginBottom: spacing.md,
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.md,
}

const $orderTitleContainer: ViewStyle = {
  flex: 1,
}

const $orderNumber: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $customerName: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  marginTop: spacing.xxs,
}

const $orderBadges: ViewStyle = {
  gap: spacing.xs,
}

const $priorityBadge: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  alignSelf: "flex-end",
}

const $priorityText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  alignSelf: "flex-end",
}

const $statusText: TextStyle = {
  fontSize: 10,
  fontWeight: "600",
}

const $orderDetails: ViewStyle = {
  gap: spacing.sm,
  marginBottom: spacing.md,
}

const $detailRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
}

const $detailText: TextStyle = {
  fontSize: 14,
  color: colors.palette.deepCharcoal,
  flex: 1,
}

const $progressSection: ViewStyle = {
  marginBottom: spacing.md,
}

const $progressHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $progressLabel: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $progressPercentage: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.tailorGold,
}

const $progressBarContainer: ViewStyle = {
  height: 4,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 2,
  overflow: "hidden",
}

const $progressBar: ViewStyle = {
  height: "100%",
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 2,
}

const $orderFooter: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $priceContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
}

const $priceLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
}

const $priceValue: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $actionButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  backgroundColor: colors.palette.tailorGold + "20",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 8,
}

const $actionButtonText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.tailorGold,
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

const $clearSearchButton: ViewStyle = {
  marginTop: spacing.lg,
  backgroundColor: colors.palette.sageGreen,
  borderRadius: 8,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
}

const $clearSearchButtonText: TextStyle = {
  color: colors.palette.warmIvory,
  fontWeight: "600",
}

const $fab: ViewStyle = {
  position: "absolute",
  bottom: spacing.lg,
  right: spacing.lg,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.palette.tailorGold,
  justifyContent: "center",
  alignItems: "center",
  elevation: 8,
  shadowColor: colors.palette.deepCharcoal,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
}