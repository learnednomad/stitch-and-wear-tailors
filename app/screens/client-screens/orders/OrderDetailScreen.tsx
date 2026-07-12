import React, { FC, useCallback, useEffect, useState } from "react"
import { View, ScrollView, TouchableOpacity, ViewStyle, TextStyle, Alert, Modal } from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "@/navigators"
import {
  Button,
  Screen,
  Icon,
  Text,
  TextField,
  StatusUpdateSheet,
  Chip,
  statusTone,
} from "@/components"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "@/theme"
import { useFocusEffect, useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { orderApi } from "@/services/api/order-api"
import { messageApi } from "@/services/api/message-api"

/** Cancellation reason presets (ORD-011) */
const CANCEL_REASONS = [
  "Changed my mind",
  "Found another tailor",
  "Timeline too long",
  "Other",
] as const

/** Domain garment type → NewOrderScreen catalog style id (for reorder) */
const GARMENT_TO_STYLE_ID: Record<string, string> = {
  kaftan: "kaftan-1",
  agbada: "agbada-1",
  modern: "shirt-1",
  ankara_dress: "dress-1",
}

/** Domain fabric type → NewOrderScreen catalog fabric id (for reorder) */
const FABRIC_TYPE_TO_ID: Record<string, string> = {
  ankara: "ankara-1",
  silk: "silk-1",
  lace: "lace-1",
  cotton: "cotton-1",
}

/** Derive the current PocketBase status from the mapped domain order */
const domainToCurrentPBStatus = (order: {
  status: string
  progress: { currentStage: string }
}): string => {
  if (order.status === "in_progress") {
    const stageMap: Record<string, string> = {
      measured: "measuring",
      cutting: "cutting",
      sewing: "sewing",
      finishing: "finishing",
    }
    return stageMap[order.progress.currentStage] ?? "sewing"
  }
  const statusMap: Record<string, string> = {
    pending: "pending",
    confirmed: "accepted",
    ready: "ready",
    delivered: "delivered",
    cancelled: "cancelled",
  }
  return statusMap[order.status] ?? "pending"
}

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
  const { orderStore, authStore } = useStores()

  const [isLoading, setIsLoading] = useState(true)
  const [isStatusSheetVisible, setIsStatusSheetVisible] = useState(false)
  const [isActing, setIsActing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false)
  const [cancelReason, setCancelReason] = useState<string | null>(null)
  const [cancelDetail, setCancelDetail] = useState("")

  // Extract order ID from route params
  const { orderId } = route?.params || { orderId: "" }

  // Refresh the chat unread badge whenever the screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (!orderId) return undefined
      let cancelled = false
      messageApi.unreadCountForOrder(orderId).then((result) => {
        if (!cancelled && result.success) setUnreadCount(result.data)
      })
      return () => {
        cancelled = true
      }
    }, [orderId]),
  )

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

  // Tailor-facing action flags: the assigned tailor (or any tailor viewing an
  // unassigned order) gets accept/reject and status-update controls
  const viewerId = authStore.user?.id
  const isTailorViewer = authStore.user?.role === "tailor"
  const isAssignedTailor = isTailorViewer && !!order?.tailorId && order.tailorId === viewerId
  const canAcceptOrReject =
    isTailorViewer &&
    order?.status === "pending" &&
    (!order.tailorId || order.tailorId === viewerId)
  const canUpdateStatus =
    isAssignedTailor && ["confirmed", "in_progress", "ready"].includes(order?.status ?? "")
  // Chat is available once both parties are on the order
  const canMessage = !!order?.tailorId && !!order?.userId
  // Customers can cancel while the order is pending/confirmed (PB pending/accepted)
  const canCancel = !isTailorViewer && ["pending", "confirmed"].includes(order?.status ?? "")
  // Customers can reorder a finished (delivered/cancelled) order
  const canReorder = !isTailorViewer && ["delivered", "cancelled"].includes(order?.status ?? "")

  const reloadOrder = async () => {
    if (orderId) await orderStore.loadNigerianOrder(orderId)
  }

  const handleAccept = async () => {
    if (!order) return
    setIsActing(true)
    const result = await orderApi.acceptOrder(order.id)
    setIsActing(false)
    if (result.success) {
      await reloadOrder()
    } else {
      Alert.alert("Error", result.message || "Failed to accept order")
    }
  }

  const handleReject = () => {
    if (!order) return
    Alert.alert("Reject Order", "Are you sure you want to reject this order?", [
      { text: "Keep Order", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setIsActing(true)
          const result = await orderApi.rejectOrder(order.id)
          setIsActing(false)
          if (result.success) {
            await reloadOrder()
          } else {
            Alert.alert("Error", result.message || "Failed to reject order")
          }
        },
      },
    ])
  }

  const handleStatusUpdate = async (status: string, note?: string) => {
    if (!order) return
    setIsActing(true)
    const result = await orderApi.updateOrderStatus(order.id, status, note)
    setIsActing(false)
    setIsStatusSheetVisible(false)
    if (result.success) {
      await reloadOrder()
    } else {
      Alert.alert("Error", result.message || "Failed to update status")
    }
  }

  const handleOpenChat = () => {
    if (!order) return
    ;(navigation as any).navigate("OrderChat", { orderId: order.id })
  }

  const closeCancelModal = () => {
    setIsCancelModalVisible(false)
    setCancelReason(null)
    setCancelDetail("")
  }

  const handleConfirmCancel = async () => {
    if (!order || !cancelReason) return
    const detail = cancelDetail.trim()
    if (cancelReason === "Other" && !detail) {
      Alert.alert("Reason Required", "Please tell us why you are cancelling this order.")
      return
    }
    const reason =
      cancelReason === "Other" ? detail : detail ? `${cancelReason} — ${detail}` : cancelReason
    setIsActing(true)
    const result = await orderApi.cancelOrder(order.id, reason)
    setIsActing(false)
    if (result.success) {
      closeCancelModal()
      await reloadOrder()
      Alert.alert("Order Cancelled", "Your order has been cancelled.")
    } else {
      Alert.alert("Error", result.message || "Failed to cancel order")
    }
  }

  const handleReorder = () => {
    if (!order) return
    // Hydrate the creation workflow from this order, then jump into the
    // routed creation path with the matching catalog selections pre-picked
    orderStore.startReorderFrom(order)
    ;(navigation as any).navigate("NewOrder", {
      reorderStyleId: GARMENT_TO_STYLE_ID[order.garmentType],
      reorderFabricId: FABRIC_TYPE_TO_ID[order.fabricSelection.type],
    })
  }

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
        backgroundColor={colors.background}
        safeAreaEdges={["top"]}
        preset="fixed"
        statusBarStyle="dark"
        contentContainerStyle={$screenContent}
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
        return colors.accent
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
      backgroundColor={colors.background}
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
              <Chip text={orderDetail.status} tone={statusTone(order.status)} />
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
              <Icon icon="view" size={20} color={colors.accent} />
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
            {canMessage && (
              <TouchableOpacity
                style={$contactButton}
                onPress={handleOpenChat}
                accessible
                accessibilityLabel={`Message ${isTailorViewer ? "client" : "tailor"}${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                accessibilityRole="button"
              >
                <Icon icon="menu" size={20} color={colors.accent} />
                <Text style={$contactButtonText}>
                  {isTailorViewer ? "Message Client" : "Message Tailor"}
                </Text>
                {unreadCount > 0 && (
                  <View style={$unreadBadge}>
                    <Text style={$unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={$contactButton}>
              <Icon icon="bell" size={20} color={colors.accent} />
              <Text style={$contactButtonText}>Call Shop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[$bottomContainer, $bottomContainerInsets]}>
        {/* Tailor actions: accept/reject a pending order */}
        {canAcceptOrReject && (
          <View style={$actionRow}>
            <Button
              text={isActing ? "Working..." : "Accept Order"}
              style={[$primaryButton, $actionRowButton]}
              textStyle={$primaryButtonText}
              disabled={isActing}
              onPress={handleAccept}
            />
            <Button
              text="Reject"
              style={[$rejectButton, $actionRowButton]}
              textStyle={$rejectButtonText}
              disabled={isActing}
              onPress={handleReject}
            />
          </View>
        )}
        {/* Tailor action: advance the work pipeline */}
        {canUpdateStatus && (
          <Button
            text="Update Status"
            style={$primaryButton}
            textStyle={$primaryButtonText}
            disabled={isActing}
            onPress={() => setIsStatusSheetVisible(true)}
          />
        )}
        {/* Client actions */}
        {!isTailorViewer && (
          <Button
            text="Track Order"
            style={$secondaryButton}
            textStyle={$secondaryButtonText}
            onPress={() => (navigation as any).navigate("OrderTracking", { orderId: order.id })}
          />
        )}
        {!isTailorViewer && orderDetail.paymentStatus === "Pending" && (
          <Button
            text="Pay Now"
            style={$primaryButton}
            textStyle={$primaryButtonText}
            onPress={handlePayNow}
          />
        )}
        {!isTailorViewer && orderDetail.status === "Ready" && (
          <Button
            text="Schedule Pickup"
            style={$secondaryButton}
            textStyle={$secondaryButtonText}
            onPress={() => (navigation as any).navigate("BookFitting")}
          />
        )}
        {/* Client action: cancel a pending/confirmed order (ORD-011) */}
        {canCancel && (
          <Button
            text="Cancel Order"
            style={$cancelButton}
            textStyle={$cancelButtonText}
            disabled={isActing}
            onPress={() => setIsCancelModalVisible(true)}
          />
        )}
        {/* Client action: reorder a delivered/cancelled order (ORD-012) */}
        {canReorder && (
          <Button
            text="Reorder"
            style={$primaryButton}
            textStyle={$primaryButtonText}
            onPress={handleReorder}
          />
        )}
      </View>

      {/* Cancellation modal (client) */}
      <Modal
        visible={isCancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCancelModal}
      >
        <View style={$modalOverlay}>
          <TouchableOpacity style={$modalBackdrop} activeOpacity={1} onPress={closeCancelModal} />
          <View style={$modalSheet}>
            <View style={$modalHeader}>
              <Text style={$modalTitle}>Cancel Order</Text>
              <TouchableOpacity
                onPress={closeCancelModal}
                accessible
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Icon icon="x" size={22} color={colors.palette.neutral700} />
              </TouchableOpacity>
            </View>
            <Text style={$modalSubtitle}>Why are you cancelling this order?</Text>
            <View style={$reasonChips}>
              {CANCEL_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[$reasonChip, cancelReason === reason && $reasonChipSelected]}
                  onPress={() => setCancelReason(reason)}
                  accessible
                  accessibilityLabel={reason}
                  accessibilityRole="button"
                >
                  <Text
                    style={[$reasonChipText, cancelReason === reason && $reasonChipTextSelected]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextField
              value={cancelDetail}
              onChangeText={setCancelDetail}
              placeholder={
                cancelReason === "Other" ? "Tell us more (required)" : "Add details (optional)"
              }
              multiline
              containerStyle={$reasonDetailField}
            />
            <Button
              text={isActing ? "Cancelling..." : "Confirm Cancellation"}
              style={$confirmCancelButton}
              textStyle={$confirmCancelButtonText}
              disabled={!cancelReason || isActing}
              onPress={handleConfirmCancel}
            />
          </View>
        </View>
      </Modal>

      {/* Status update bottom sheet (tailor) */}
      <StatusUpdateSheet
        visible={isStatusSheetVisible}
        currentStatus={domainToCurrentPBStatus(order)}
        onClose={() => setIsStatusSheetVisible(false)}
        onSubmit={handleStatusUpdate}
        isSubmitting={isActing}
      />
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

// Screen's fixed preset gives its inner container no height; without flex the
// scrollable body collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
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
  borderColor: colors.border,
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
  borderColor: colors.border,
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
  backgroundColor: colors.accentSoft,
  borderRadius: 8,
  padding: spacing.md,
  alignItems: "flex-start",
}

const $instructionsText: TextStyle = {
  flex: 1,
  fontSize: 14,
  color: colors.palette.emerald600,
  marginLeft: spacing.sm,
  lineHeight: 20,
}

const $timelineCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
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
  backgroundColor: colors.accentSoft,
  borderRadius: 8,
  padding: spacing.md,
  marginHorizontal: spacing.xs,
}

const $contactButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.emerald600,
  marginLeft: spacing.xs,
}

const $bottomContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.md,
  gap: spacing.sm,
  backgroundColor: colors.palette.neutral100,
  borderTopWidth: 1,
  borderTopColor: colors.border,
}

const $actionRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $actionRowButton: ViewStyle = {
  flex: 1,
}

const $rejectButton: ViewStyle = {
  backgroundColor: colors.palette.error100,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $rejectButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.error500,
}

const $primaryButton: ViewStyle = {
  backgroundColor: colors.accent,
  borderRadius: 12,
  paddingVertical: spacing.md,
  shadowColor: colors.palette.emerald700,
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

const $unreadBadge: ViewStyle = {
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: colors.palette.error500,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.xxs,
  marginLeft: spacing.xs,
}

const $unreadBadgeText: TextStyle = {
  fontSize: 11,
  fontWeight: "700",
  color: colors.palette.neutral100,
}

const $cancelButton: ViewStyle = {
  backgroundColor: colors.palette.error100,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $cancelButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.error500,
}

const $modalOverlay: ViewStyle = {
  flex: 1,
  justifyContent: "flex-end",
}

const $modalBackdrop: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.palette.overlay50,
}

const $modalSheet: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: spacing.lg,
  paddingBottom: spacing.xl,
}

const $modalHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $modalTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.neutral900,
}

const $modalSubtitle: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
  marginBottom: spacing.md,
}

const $reasonChips: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
  marginBottom: spacing.sm,
}

const $reasonChip: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $reasonChipSelected: ViewStyle = {
  borderColor: colors.accent,
  backgroundColor: colors.accentSoft,
}

const $reasonChipText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral800,
}

const $reasonChipTextSelected: TextStyle = {
  fontWeight: "600",
  color: colors.palette.emerald600,
}

const $reasonDetailField: ViewStyle = {
  marginBottom: spacing.md,
}

const $confirmCancelButton: ViewStyle = {
  backgroundColor: colors.palette.error500,
  borderRadius: 12,
}

const $confirmCancelButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}
