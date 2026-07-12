import React, { FC, useEffect, useState } from "react"
import { View, ScrollView, TouchableOpacity, ViewStyle, TextStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon, Text } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"

interface ProgressStep {
  id: string
  title: string
  description: string
  status: "completed" | "current" | "pending"
  date?: string
}

/** Ordered domain stages with their display copy */
const STAGE_STEPS: { id: string; title: string; description: string }[] = [
  { id: "received", title: "Received", description: "Order received and confirmed" },
  { id: "measured", title: "Measurement", description: "Body measurements collected" },
  { id: "cutting", title: "Cutting", description: "Fabric cut to pattern" },
  { id: "sewing", title: "Sewing", description: "Garment construction" },
  { id: "finishing", title: "Finishing", description: "Final details and quality check" },
  { id: "quality_check", title: "Quality Check", description: "Final inspection" },
  { id: "completed", title: "Completed", description: "Ready for pickup/delivery" },
]

interface OrderDetailScreenProps extends AppStackScreenProps<"OrderDetail"> {}

export const OrderDetailScreen: FC<OrderDetailScreenProps> = observer(({ route }) => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()
  const { orderStore } = useStores()

  const [isLoading, setIsLoading] = useState(true)

  // Extract order ID from route params
  const { orderId } = route?.params || { orderId: "" }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!orderId) {
        setIsLoading(false)
        return
      }
      try {
        setIsLoading(true)
        await orderStore.loadNigerianOrder(orderId)
      } catch (error) {
        console.error("Failed to load order:", error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [orderId, orderStore])

  const order = orderStore.currentOrder

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return "N/A"
    return date.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
  }

  const titleCase = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

  // Display fields derived from the loaded order
  const orderDetail = {
    id: order?.orderNumber || orderId,
    measurementName: order ? titleCase(order.garmentType) : "",
    status: order ? titleCase(order.status) : "",
    dueDate: formatDate(order?.estimatedDeliveryDate),
    paymentStatus: (order?.pricing.balanceAmount ?? 0) > 0 ? "Pending" : "Paid",
    amount: order?.pricing.totalPrice ?? 0,
    style: order?.styleConfig.designNotes || (order ? titleCase(order.garmentType) : ""),
    fabric: order
      ? `${titleCase(order.fabricSelection.type)}${order.fabricSelection.color ? ` • ${order.fabricSelection.color}` : ""}`
      : "",
    specialInstructions: order?.notes || undefined,
    createdAt: formatDate(order?.createdAt),
  }

  // Build progress steps from the order's stage history
  const currentStageIndex = STAGE_STEPS.findIndex(
    (step) => step.id === order?.progress.currentStage,
  )
  const progressSteps: ProgressStep[] = STAGE_STEPS.map((step, index) => {
    const stageRecord = order?.progress.stageProgress.find((s: any) => s.stage === step.id)
    let status: ProgressStep["status"] = "pending"
    if (index < currentStageIndex || order?.progress.currentStage === "completed") {
      status = "completed"
    } else if (index === currentStageIndex) {
      status = "current"
    }
    return {
      id: step.id,
      title: step.title,
      description: step.description,
      status,
      date: stageRecord?.completedAt ? formatDate(stageRecord.completedAt) : undefined,
    }
  })

  if (isLoading || !order) {
    return (
      <Screen
        backgroundColor={colors.palette.neutral100}
        safeAreaEdges={["top"]}
        preset="fixed"
        statusBarStyle="dark"
      >
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
          <Text style={$headerTitle}>Order Details</Text>
          <View style={$headerSpacer} />
        </View>
        <View style={$loadingContainer}>
          <Text style={$loadingText}>{isLoading ? "Loading order..." : "Order not found"}</Text>
        </View>
      </Screen>
    )
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "check"
      case "current":
        return "settings"
      default:
        return "more"
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return colors.palette.success500
      case "current":
        return colors.palette.primary500
      default:
        return colors.palette.neutral400
    }
  }

  const renderProgressStep = (step: ProgressStep, index: number) => (
    <View key={step.id} style={$progressStepContainer}>
      <View style={$progressStepContent}>
        <View style={[$progressIcon, { backgroundColor: getStepColor(step.status) + "20" }]}>
          <Icon icon={getStepIcon(step.status)} size={20} color={getStepColor(step.status)} />
        </View>
        <View style={$progressStepInfo}>
          <Text style={$progressStepTitle}>{step.title}</Text>
          <Text style={$progressStepDescription}>{step.description}</Text>
          {step.date && <Text style={$progressStepDate}>{step.date}</Text>}
        </View>
      </View>
      {index < progressSteps.length - 1 && (
        <View
          style={[
            $progressLine,
            {
              backgroundColor:
                step.status === "completed" ? colors.palette.success500 : colors.palette.neutral300,
            },
          ]}
        />
      )}
    </View>
  )

  const handlePayNow = () => {
    ;(navigation as any).navigate("Payment", {
      orderId: orderDetail.id,
      amount: orderDetail.amount,
      orderDetails: {
        measurementName: orderDetail.measurementName,
        status: orderDetail.status,
        dueDate: orderDetail.dueDate,
      },
    })
  }

  return (
    <Screen
      backgroundColor={colors.palette.neutral100}
      safeAreaEdges={["top"]}
      preset="scroll"
      statusBarStyle="dark"
    >
      <ScrollView style={$container} showsVerticalScrollIndicator={false}>
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
          <Text style={$headerTitle}>Order Details</Text>
          <View style={$headerSpacer} />
        </View>

        {/* Order Summary Card */}
        <View style={$section}>
          <View style={$orderSummaryCard}>
            <View style={$orderHeader}>
              <Text style={$orderIdText}>#{orderDetail.id}</Text>
              <View style={[$statusBadge, { backgroundColor: colors.palette.primary500 + "20" }]}>
                <Text style={[$statusText, { color: colors.palette.primary500 }]}>
                  {orderDetail.status}
                </Text>
              </View>
            </View>
            <Text style={$orderTitle}>{orderDetail.measurementName}</Text>
            <View style={$orderDetailsGrid}>
              <View style={$orderDetailItem}>
                <Text style={$orderDetailLabel}>Style</Text>
                <Text style={$orderDetailValue}>{orderDetail.style}</Text>
              </View>
              <View style={$orderDetailItem}>
                <Text style={$orderDetailLabel}>Fabric</Text>
                <Text style={$orderDetailValue}>{orderDetail.fabric}</Text>
              </View>
              <View style={$orderDetailItem}>
                <Text style={$orderDetailLabel}>Due Date</Text>
                <Text style={$orderDetailValue}>{orderDetail.dueDate}</Text>
              </View>
              <View style={$orderDetailItem}>
                <Text style={$orderDetailLabel}>Amount</Text>
                <Text style={$orderDetailValue}>₦{orderDetail.amount.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress Tracking */}
        <View style={$section}>
          <Text style={$sectionTitle}>Order Progress</Text>
          <View style={$progressContainer}>
            {progressSteps.map((step, index) => renderProgressStep(step, index))}
          </View>
        </View>

        {/* Special Instructions */}
        {orderDetail.specialInstructions && (
          <View style={$section}>
            <Text style={$sectionTitle}>Special Instructions</Text>
            <View style={$instructionsCard}>
              <Icon icon="view" size={20} color={colors.palette.primary500} />
              <Text style={$instructionsText}>{orderDetail.specialInstructions}</Text>
            </View>
          </View>
        )}

        {/* Order Timeline */}
        <View style={$section}>
          <Text style={$sectionTitle}>Timeline</Text>
          <View style={$timelineCard}>
            <View style={$timelineItem}>
              <Text style={$timelineLabel}>Order Created</Text>
              <Text style={$timelineValue}>{orderDetail.createdAt}</Text>
            </View>
            <View style={$timelineItem}>
              <Text style={$timelineLabel}>Estimated Delivery</Text>
              <Text style={$timelineValue}>{orderDetail.dueDate}</Text>
            </View>
            {order.actualDeliveryDate && (
              <View style={$timelineItem}>
                <Text style={$timelineLabel}>Delivered</Text>
                <Text style={$timelineValue}>{formatDate(order.actualDeliveryDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Section */}
        <View style={$section}>
          <Text style={$sectionTitle}>Need Help?</Text>
          <View style={$contactActions}>
            <TouchableOpacity style={$contactButton}>
              <Icon icon="menu" size={20} color={colors.palette.primary500} />
              <Text style={$contactButtonText}>Message Tailor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={$contactButton}>
              <Icon icon="bell" size={20} color={colors.palette.primary500} />
              <Text style={$contactButtonText}>Call Shop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[$bottomContainer, $bottomContainerInsets]}>
        {orderDetail.paymentStatus === "Pending" && (
          <Button
            text="Pay Now"
            style={$primaryButton}
            textStyle={$primaryButtonText}
            onPress={handlePayNow}
          />
        )}
        {orderDetail.status === "Ready" && (
          <Button
            text="Schedule Pickup"
            style={$secondaryButton}
            textStyle={$secondaryButtonText}
            onPress={() => console.log("Schedule pickup")}
          />
        )}
      </View>
    </Screen>
  )
})

// Styles
const $container: ViewStyle = {
  flex: 1,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral600,
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

const $section: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.md,
}

const $orderSummaryCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 3,
}

const $orderHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $orderIdText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral600,
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 6,
}

const $statusText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
}

const $orderTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  color: colors.palette.neutral900,
  marginBottom: spacing.md,
}

const $orderDetailsGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  marginHorizontal: -spacing.xs,
}

const $orderDetailItem: ViewStyle = {
  width: "50%",
  paddingHorizontal: spacing.xs,
  marginBottom: spacing.sm,
}

const $orderDetailLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.xxs,
}

const $orderDetailValue: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $progressContainer: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $progressStepContainer: ViewStyle = {
  position: "relative",
}

const $progressStepContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $progressIcon: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.md,
}

const $progressStepInfo: ViewStyle = {
  flex: 1,
}

const $progressStepTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xxs,
}

const $progressStepDescription: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.xxs,
}

const $progressStepDate: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral500,
  fontStyle: "italic",
}

const $progressLine: ViewStyle = {
  position: "absolute",
  left: 19,
  top: 40,
  width: 2,
  height: 20,
  zIndex: -1,
}

const $instructionsCard: ViewStyle = {
  flexDirection: "row",
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
  padding: spacing.md,
  alignItems: "flex-start",
}

const $instructionsText: TextStyle = {
  flex: 1,
  fontSize: 14,
  color: colors.palette.primary700,
  marginLeft: spacing.sm,
  lineHeight: 20,
}

const $timelineCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $timelineItem: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: spacing.sm,
}

const $timelineLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
}

const $timelineValue: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral900,
}

const $contactActions: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
}

const $contactButton: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
  padding: spacing.md,
  marginHorizontal: spacing.xs,
}

const $contactButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.primary700,
  marginLeft: spacing.xs,
}

const $bottomContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.md,
  backgroundColor: colors.palette.neutral100,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
}

const $primaryButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  paddingVertical: spacing.md,
  shadowColor: colors.palette.primary900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
}

const $primaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

const $secondaryButton: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $secondaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
}
