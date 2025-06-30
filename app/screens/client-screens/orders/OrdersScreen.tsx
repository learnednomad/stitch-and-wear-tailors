import React, { FC } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
import { useNavigation } from "@react-navigation/native"

interface Order {
  id: string
  measurementName: string
  status:
    | "Measuring"
    | "Fabric Selection"
    | "Cutting"
    | "Sewing"
    | "Finishing"
    | "Ready"
    | "Delivered"
  dueDate: string
  paymentStatus: "Pending" | "Partial" | "Paid"
}

/**
 * Todo: Pagination for multiple records
 */

interface OrderListScreenProps extends AppStackScreenProps<"Orders"> {}

export const OrdersScreen: FC<OrderListScreenProps> = () => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()

  // Dummy data
  const orders: Order[] = [
    {
      id: "TLR-2025-001",
      measurementName: "Summer Kaftan",
      status: "Sewing",
      dueDate: "June 10, 2025",
      paymentStatus: "Pending",
    },
    {
      id: "TLR-2025-002",
      measurementName: "Wedding Agbada",
      status: "Ready",
      dueDate: "June 15, 2025",
      paymentStatus: "Paid",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ready":
      case "Delivered":
        return colors.palette.success500
      case "Sewing":
      case "Cutting":
      case "Finishing":
        return colors.palette.primary500
      case "Measuring":
      case "Fabric Selection":
        return colors.palette.warning500
      default:
        return colors.palette.neutral600
    }
  }

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={$orderCard}>
      <TouchableOpacity
        style={$orderContent}
        onPress={() => navigation.navigate("OrderDetail" as never, { orderId: item.id })}
        accessible
        accessibilityLabel={`Order: ${item.id}`}
        accessibilityRole="button"
      >
        <View style={$orderHeader}>
          <Text style={$orderId}>#{item.id}</Text>
          <View style={[$statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
            <Text style={[$statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={$orderTitle}>{item.measurementName}</Text>
        <Text style={$orderText}>Due: {item.dueDate}</Text>
        <Text style={$orderText}>Payment: {item.paymentStatus}</Text>
      </TouchableOpacity>
      
      {item.paymentStatus === "Pending" && (
        <TouchableOpacity
          style={$paymentButton}
          onPress={() => navigation.navigate("Payment" as never, {
            orderId: item.id,
            amount: 45000, // Would come from order data
            orderDetails: {
              measurementName: item.measurementName,
              status: item.status,
              dueDate: item.dueDate,
            },
          })}
          accessible
          accessibilityLabel={`Pay for order ${item.id}`}
          accessibilityRole="button"
        >
          <Text style={$paymentButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <Screen
      backgroundColor={colors.palette.neutral100}
      contentContainerStyle={$root}
      safeAreaEdges={["top"]}
      preset="auto"
      statusBarStyle="dark"
    >
      <View style={$container}>
        <Text style={$sectionTitle} tx="orderList.title">
          Your Orders
        </Text>
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={$orderListContent}
          accessibilityLabel="Orders List"
        />
        <View style={$bottomContainerInsets} />
      </View>
    </Screen>
  )
}

// Styles
const $root: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  flex: 1,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
}

const $sectionTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.md,
}

const $orderListContent: ViewStyle = {
  paddingBottom: spacing.lg,
}

const $orderCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $orderContent: ViewStyle = {
  flex: 1,
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $orderId: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.palette.neutral600,
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 4,
}

const $statusText: TextStyle = {
  fontSize: 11,
  fontWeight: "600",
}

const $orderTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $orderText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral700,
  marginBottom: spacing.xs,
}

const $paymentButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 6,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  marginTop: spacing.sm,
  alignItems: "center",
}

const $paymentButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral100,
}
