/**
 * MyPurchasesScreen
 *
 * The buyer's marketplace orders with status, item summary and totals.
 * Orders still awaiting payment confirmation can be cancelled.
 */
import { FC } from "react"
import { Alert, RefreshControl, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Button, Chip, ChipTone, Icon, Screen, Text } from "@/components"
import { useCancelMarketplaceOrder, useMyPurchases } from "@/api/marketplace"
import { errorMessage } from "@/api/common"
import { MarketplaceOrderStatus } from "@/services/api/marketplace-api"
import { formatNaira } from "@/utils/formatCurrency"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface MyPurchasesScreenProps extends AppStackScreenProps<"MyPurchases"> {}

const STATUS_TONES: Record<MarketplaceOrderStatus, ChipTone> = {
  pending_payment: "warning",
  paid: "success",
  processing: "neutral",
  shipped: "neutral",
  delivered: "success",
  cancelled: "error",
}

const STATUS_LABELS: Record<MarketplaceOrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

export const MyPurchasesScreen: FC<MyPurchasesScreenProps> = function MyPurchasesScreen({
  navigation,
}) {
  const { theme } = useAppTheme()
  const purchasesQuery = useMyPurchases()
  const cancelOrder = useCancelMarketplaceOrder()

  const orders = purchasesQuery.data ?? []
  const error = purchasesQuery.error ? errorMessage(purchasesQuery.error) : null

  const handleCancel = (orderId: string) => {
    Alert.alert("Cancel order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelOrder.mutateAsync(orderId)
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not cancel the order.")
          }
        },
      },
    ])
  }

  return (
    <Screen
      style={$root}
      preset="scroll"
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={purchasesQuery.isRefetching}
            onRefresh={() => purchasesQuery.refetch()}
          />
        ),
      }}
    >
      <View style={$headerRow}>
        <TouchableOpacity
          style={$backButton}
          onPress={() => navigation.goBack()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon icon="back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text preset="heading" text="My Purchases" style={$headingText} />
      </View>

      {error && <Text style={[$error, { color: theme.colors.error }]} text={error} />}
      {!error && orders.length === 0 && (
        <Text
          style={[$empty, { color: theme.colors.textDim }]}
          text={purchasesQuery.isLoading ? "Loading..." : "You haven't bought anything yet."}
        />
      )}

      {orders.map((order) => {
        const itemCount = (order.items ?? []).reduce((sum, i) => sum + i.quantity, 0)
        const canCancel = order.status === "pending_payment"
        return (
          <View
            key={order.id}
            style={[$card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <View style={$cardHeader}>
              <Text style={[$orderNumber, { color: theme.colors.text }]} text={`#${order.orderNumber}`} />
              <Chip
                text={STATUS_LABELS[order.status] ?? order.status}
                tone={STATUS_TONES[order.status] ?? "neutral"}
              />
            </View>
            <Text
              style={[$itemsSummary, { color: theme.colors.textDim }]}
              text={(order.items ?? [])
                .map((i) => `${i.quantity}× ${i.name}`)
                .join(", ")}
              numberOfLines={2}
            />
            <View style={$cardFooter}>
              <Text
                style={[$meta, { color: theme.colors.textDim }]}
                text={`${itemCount} item${itemCount === 1 ? "" : "s"} · ${new Date(
                  order.created,
                ).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`}
              />
              <Text style={[$total, { color: theme.colors.accent }]} text={formatNaira(order.subtotal)} />
            </View>
            {order.expand?.seller?.name && (
              <Text
                style={[$seller, { color: theme.colors.textDim }]}
                text={`Sold by ${order.expand.seller.name}`}
              />
            )}
            {canCancel && (
              <Button
                text="Cancel order"
                preset="default"
                onPress={() => handleCancel(order.id)}
                disabled={cancelOrder.isPending}
                style={$cancelButton}
              />
            )}
          </View>
        )
      })}
    </Screen>
  )
}

const $root: ViewStyle = { flex: 1 }

const $headerRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
}

const $backButton: ViewStyle = {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.xs,
}

const $headingText: TextStyle = { flex: 1 }

const $error: TextStyle = { padding: spacing.md, textAlign: "center" }
const $empty: TextStyle = { padding: spacing.md, textAlign: "center" }

const $card: ViewStyle = {
  marginHorizontal: spacing.md,
  marginBottom: spacing.sm,
  borderRadius: 16,
  borderWidth: 1,
  padding: spacing.md,
}

const $cardHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $orderNumber: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
}

const $itemsSummary: TextStyle = {
  fontSize: 13,
  marginTop: spacing.xs,
}

const $cardFooter: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: spacing.sm,
}

const $meta: TextStyle = {
  fontSize: 12,
  flexShrink: 1,
}

const $total: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  marginLeft: spacing.sm,
}

const $seller: TextStyle = {
  fontSize: 12,
  marginTop: spacing.xs,
}

const $cancelButton: ViewStyle = {
  marginTop: spacing.sm,
}
