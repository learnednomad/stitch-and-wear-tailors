/**
 * Order Tracking Screen
 * Real-time order progress tracking with Nigerian cultural elements
 */

import React, { FC, useEffect, useState } from "react"
import { View, ScrollView, ViewStyle, TextStyle, RefreshControl, Animated } from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, Icon, Button, Card } from "app/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { OrderStage, OrderStatus } from "@/types/orders"

interface OrderTrackingScreenProps extends AppStackScreenProps<"OrderTracking"> {
  route: { params: { orderId: string } }
}

export const OrderTrackingScreen: FC<OrderTrackingScreenProps> = observer(({ route, navigation }) => {
  const { orderId } = route.params
  const { orderStore } = useStores()
  const [refreshing, setRefreshing] = useState(false)
  const [animatedValues] = useState(() => ({
    progress: new Animated.Value(0),
    stageOpacity: new Animated.Value(0),
  }))
  
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

  useEffect(() => {
    loadOrderDetails()
  }, [orderId])

  useEffect(() => {
    if (orderStore.currentOrder) {
      // Animate progress bar
      Animated.timing(animatedValues.progress, {
        toValue: orderStore.currentOrder.progress.percentage / 100,
        duration: 1000,
        useNativeDriver: false,
      }).start()

      // Animate stage indicators
      Animated.timing(animatedValues.stageOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start()
    }
  }, [orderStore.currentOrder])

  const loadOrderDetails = async () => {
    try {
      await orderStore.loadNigerianOrder(orderId)
    } catch (error) {
      console.error("Failed to load order details:", error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadOrderDetails()
    } finally {
      setRefreshing(false)
    }
  }

  const order = orderStore.currentOrder
  if (!order) {
    return (
      <Screen backgroundColor={colors.palette.warmIvory} safeAreaEdges={["top"]} preset="fixed">
        <View style={$loadingContainer}>
          <Text style={$loadingText}>Loading order details...</Text>
        </View>
      </Screen>
    )
  }

  const stages: Array<{
    stage: OrderStage
    title: string
    description: string
    icon: string
  }> = [
    {
      stage: "received",
      title: "Order Received",
      description: "Your order has been received and is being reviewed",
      icon: "checkmark",
    },
    {
      stage: "measured",
      title: "Measurements Confirmed",
      description: "Your measurements have been verified",
      icon: "settings",
    },
    {
      stage: "cutting",
      title: "Fabric Cutting",
      description: "Your fabric is being carefully cut to pattern",
      icon: "build",
    },
    {
      stage: "sewing",
      title: "Sewing in Progress",
      description: "Your garment is being skillfully sewn together",
      icon: "construct",
    },
    {
      stage: "finishing",
      title: "Finishing Touches",
      description: "Final details and finishing touches being applied",
      icon: "sparkles",
    },
    {
      stage: "quality_check",
      title: "Quality Inspection",
      description: "Final quality check and approval",
      icon: "star",
    },
    {
      stage: "completed",
      title: "Ready for Delivery",
      description: "Your garment is complete and ready!",
      icon: "gift",
    },
  ]

  const getStageStatus = (stage: OrderStage): "completed" | "current" | "pending" => {
    const currentStageIndex = stages.findIndex(s => s.stage === order.progress.currentStage)
    const stageIndex = stages.findIndex(s => s.stage === stage)
    
    if (stageIndex < currentStageIndex) return "completed"
    if (stageIndex === currentStageIndex) return "current"
    return "pending"
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

  const formatEstimatedDelivery = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-NG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <Screen
      backgroundColor={colors.palette.warmIvory}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle="dark"
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
      }}
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
          <Text style={$headerTitle}>Order Tracking</Text>
          <Text style={$headerSubtitle}>#{order.orderNumber}</Text>
        </View>
        
        <View style={$headerSpacer} />
      </View>

      {/* Order Summary Card */}
      <Card style={$summaryCard} preset="default">
        <View style={$summaryHeader}>
          <View>
            <Text style={$orderNumber}>Order #{order.orderNumber}</Text>
            <Text style={$garmentType}>
              {orderStore.getTranslation("garments", order.garmentType)}
            </Text>
          </View>
          <View style={[$statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
            <Text style={[$statusText, { color: getStatusColor(order.status) }]}>
              {order.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={$progressSection}>
          <Text style={$progressLabel}>Progress: {order.progress.percentage}%</Text>
          <View style={$progressBarContainer}>
            <Animated.View 
              style={[
                $progressBar,
                {
                  width: animatedValues.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]} 
            />
          </View>
        </View>

        {/* Delivery Information */}
        <View style={$deliveryInfo}>
          <Icon icon="calendar" size={16} color={colors.palette.threadBlue} />
          <Text style={$deliveryText}>
            Expected delivery: {formatEstimatedDelivery(order.estimatedDeliveryDate)}
          </Text>
        </View>
      </Card>

      {/* Stage Timeline */}
      <Card style={$timelineCard} preset="default">
        <Text style={$sectionTitle}>Order Progress</Text>
        
        <Animated.View style={{ opacity: animatedValues.stageOpacity }}>
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.stage)
            const stageProgress = order.progress.stageProgress.find(
              sp => sp.stage === stage.stage
            )
            
            return (
              <View key={stage.stage} style={$stageItem}>
                <View style={$stageIndicator}>
                  <View style={[
                    $stageIcon,
                    status === "completed" && $completedStage,
                    status === "current" && $currentStage,
                    status === "pending" && $pendingStage,
                  ]}>
                    <Icon
                      icon={status === "completed" ? "checkmark" : stage.icon as any}
                      size={16}
                      color={
                        status === "completed" ? colors.palette.warmIvory :
                        status === "current" ? colors.palette.tailorGold :
                        colors.palette.neutral400
                      }
                    />
                  </View>
                  {index < stages.length - 1 && (
                    <View style={[
                      $stageLine,
                      status === "completed" && $completedLine,
                    ]} />
                  )}
                </View>
                
                <View style={$stageContent}>
                  <Text style={[
                    $stageTitle,
                    status === "current" && $currentStageTitle,
                  ]}>
                    {stage.title}
                  </Text>
                  <Text style={$stageDescription}>{stage.description}</Text>
                  
                  {stageProgress?.completedAt && (
                    <Text style={$stageTime}>
                      Completed: {new Date(stageProgress.completedAt).toLocaleDateString()}
                    </Text>
                  )}
                  
                  {stageProgress?.notes && (
                    <Text style={$stageNotes}>Notes: {stageProgress.notes}</Text>
                  )}
                </View>
              </View>
            )
          })}
        </Animated.View>
      </Card>

      {/* Order Details */}
      <Card style={$detailsCard} preset="default">
        <Text style={$sectionTitle}>Order Details</Text>
        
        <View style={$detailRow}>
          <Text style={$detailLabel}>Garment Type:</Text>
          <Text style={$detailValue}>
            {orderStore.getTranslation("garments", order.garmentType)}
          </Text>
        </View>
        
        <View style={$detailRow}>
          <Text style={$detailLabel}>Fabric:</Text>
          <Text style={$detailValue}>
            {order.fabricSelection.color} {order.fabricSelection.type}
          </Text>
        </View>
        
        <View style={$detailRow}>
          <Text style={$detailLabel}>City:</Text>
          <Text style={$detailValue}>
            {orderStore.getTranslation("cities", order.city)}
          </Text>
        </View>
        
        <View style={$detailRow}>
          <Text style={$detailLabel}>Total Amount:</Text>
          <Text style={[$detailValue, $priceText]}>
            ₦{order.pricing.totalPrice.toLocaleString()}
          </Text>
        </View>
        
        <View style={$detailRow}>
          <Text style={$detailLabel}>Priority:</Text>
          <Text style={[$detailValue, order.priority === "urgent" && $urgentText]}>
            {order.priority.toUpperCase()}
          </Text>
        </View>
      </Card>

      {/* Action Buttons */}
      <View style={[$actionSection, $bottomContainerInsets]}>
        <Button
          text="Contact Tailor"
          style={$actionButton}
          textStyle={$actionButtonText}
          onPress={() => {
            // Navigate to chat or contact screen
            console.log("Contact tailor for order:", orderId)
          }}
        />
        
        {order.status === "ready" && (
          <Button
            text="Schedule Pickup"
            style={[$actionButton, $primaryActionButton]}
            textStyle={$primaryActionButtonText}
            onPress={() => {
              // Navigate to pickup scheduling
              console.log("Schedule pickup for order:", orderId)
            }}
          />
        )}
      </View>
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
  backgroundColor: colors.palette.warmIvory,
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

const $headerSpacer: ViewStyle = {
  width: 44,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.palette.threadBlue,
}

const $summaryCard: ViewStyle = {
  margin: spacing.lg,
  marginBottom: spacing.md,
}

const $summaryHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.md,
}

const $orderNumber: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
}

const $garmentType: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  marginTop: spacing.xxs,
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
}

const $statusText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
}

const $progressSection: ViewStyle = {
  marginBottom: spacing.md,
}

const $progressLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.xs,
}

const $progressBarContainer: ViewStyle = {
  height: 8,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 4,
  overflow: "hidden",
}

const $progressBar: ViewStyle = {
  height: "100%",
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 4,
}

const $deliveryInfo: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
}

const $deliveryText: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
}

const $timelineCard: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
}

const $sectionTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.md,
}

const $stageItem: ViewStyle = {
  flexDirection: "row",
  marginBottom: spacing.md,
}

const $stageIndicator: ViewStyle = {
  alignItems: "center",
  marginRight: spacing.md,
}

const $stageIcon: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.palette.neutral200,
}

const $completedStage: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
}

const $currentStage: ViewStyle = {
  backgroundColor: colors.palette.tailorGold + "20",
  borderWidth: 2,
  borderColor: colors.palette.tailorGold,
}

const $pendingStage: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
}

const $stageLine: ViewStyle = {
  width: 2,
  height: 40,
  backgroundColor: colors.palette.neutral300,
  marginTop: spacing.xs,
}

const $completedLine: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
}

const $stageContent: ViewStyle = {
  flex: 1,
  paddingTop: spacing.xs,
}

const $stageTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
}

const $currentStageTitle: TextStyle = {
  color: colors.palette.tailorGold,
}

const $stageDescription: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  marginTop: spacing.xxs,
}

const $stageTime: TextStyle = {
  fontSize: 12,
  color: colors.palette.sageGreen,
  marginTop: spacing.xs,
  fontWeight: "500",
}

const $stageNotes: TextStyle = {
  fontSize: 12,
  color: colors.palette.threadBlue,
  marginTop: spacing.xs,
  fontStyle: "italic",
}

const $detailsCard: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
}

const $detailRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $detailLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  fontWeight: "500",
}

const $detailValue: TextStyle = {
  fontSize: 14,
  color: colors.palette.deepCharcoal,
  fontWeight: "600",
}

const $priceText: TextStyle = {
  color: colors.palette.tailorGold,
  fontSize: 16,
}

const $urgentText: TextStyle = {
  color: colors.error,
}

const $actionSection: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.lg,
  gap: spacing.md,
}

const $actionButton: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $primaryActionButton: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
}

const $actionButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  textAlign: "center",
}

const $primaryActionButtonText: TextStyle = {
  color: colors.palette.warmIvory,
}
