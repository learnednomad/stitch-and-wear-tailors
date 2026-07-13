import React, { FC, useCallback, useState } from "react"
import { View, ScrollView, TouchableOpacity, ViewStyle, TextStyle, Alert, Modal } from "react-native"
import { useQueryClient } from "@tanstack/react-query"
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
import { useOrder, orderKeys } from "@/api/orders"
import { useOrderDraftStore } from "@/state/orderDraftStore"
import { useAuthStore } from "@/state/authStore"
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

export const OrderDetailScreen: FC<OrderDetailScreenProps> = ({ route }) => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()
  const authStore = useAuthStore()
  const queryClient = useQueryClient()

  const [isStatusSheetVisible, setIsStatusSheetVisible] = useState(false)
  const [isActing, setIsActing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false)
  const [cancelReason, setCancelReason] = useState<string | null>(null)
  const [cancelDetail, setCancelDetail] = useState("")

  // Extract order ID from route params
  const { orderId } = route?.params || { orderId: "" }

  // Order detail (items + stages) via React Query
  const { data: order, isLoading } = useOrder(orderId)

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
    // Invalidate the order cache so the detail (and any list) refetch
    await queryClient.invalidateQueries({ queryKey: orderKeys.all })
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
    useOrderDraftStore.getState().startReorderFrom(order)
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
        <View className="flex-row items-center px-lg py-md border-b border-b-border">
          <TouchableOpacity
            className="w-[40px] h-[40px] justify-center items-center"
            onPress={() => navigation.goBack()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={colors.palette.neutral900} />
          </TouchableOpacity>
          <Text className="flex-1 text-[18px] font-semibold text-center" style={$headerTitleColor}>
            Order Details
          </Text>
          <View className="w-[40px]" />
        </View>
        <View className="flex-1 justify-center items-center p-xl">
          <Text className="text-[16px]" style={$loadingTextColor}>
            {isLoading ? "Loading order..." : "Order not found"}
          </Text>
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
    <View key={step.id} className="relative">
      <View className="flex-row items-center mb-md">
        <View
          className="w-[40px] h-[40px] rounded-[20px] justify-center items-center mr-md"
          style={{ backgroundColor: getStepColor(step.status) + "20" }}
        >
          <Icon icon={getStepIcon(step.status)} size={20} color={getStepColor(step.status)} />
        </View>
        <View className="flex-1">
          <Text className="text-[14px] font-semibold mb-xxs" style={$progressTitleColor}>
            {step.title}
          </Text>
          <Text className="text-[12px] mb-xxs" style={$progressDescColor}>
            {step.description}
          </Text>
          {step.date && (
            <Text className="text-[11px] italic" style={$progressDateColor}>
              {step.date}
            </Text>
          )}
        </View>
      </View>
      {index < progressSteps.length - 1 && (
        <View
          className="absolute left-[19px] top-[40px] w-[2px] h-[20px] z-[-1]"
          style={{
            backgroundColor:
              step.status === "completed" ? colors.palette.success500 : colors.palette.neutral300,
          }}
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
        <View className="flex-row items-center px-lg py-md border-b border-b-border">
          <TouchableOpacity
            className="w-[40px] h-[40px] justify-center items-center"
            onPress={() => navigation.goBack()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={colors.palette.neutral900} />
          </TouchableOpacity>
          <Text className="flex-1 text-[18px] font-semibold text-center" style={$headerTitleColor}>
            Order Details
          </Text>
          <View className="w-[40px]" />
        </View>

        {/* Order Summary Card */}
        <View className="px-lg py-lg">
          <View
            className="bg-neutral100 rounded-[12px] p-lg border border-border"
            style={$cardShadow}
          >
            <View className="flex-row justify-between items-center mb-sm">
              <Text className="text-[14px] font-semibold" style={$orderIdColor}>
                #{orderDetail.id}
              </Text>
              <Chip text={orderDetail.status} tone={statusTone(order.status)} />
            </View>
            <Text className="text-[20px] font-bold mb-md" style={$orderTitleColor}>
              {orderDetail.measurementName}
            </Text>
            <View className="flex-row flex-wrap mx-[-8px]">
              <View className="w-1/2 px-xs mb-sm">
                <Text className="text-[12px] mb-xxs" style={$detailLabelColor}>
                  Style
                </Text>
                <Text className="text-[14px] font-semibold" style={$detailValueColor}>
                  {orderDetail.style}
                </Text>
              </View>
              <View className="w-1/2 px-xs mb-sm">
                <Text className="text-[12px] mb-xxs" style={$detailLabelColor}>
                  Fabric
                </Text>
                <Text className="text-[14px] font-semibold" style={$detailValueColor}>
                  {orderDetail.fabric}
                </Text>
              </View>
              <View className="w-1/2 px-xs mb-sm">
                <Text className="text-[12px] mb-xxs" style={$detailLabelColor}>
                  Due Date
                </Text>
                <Text className="text-[14px] font-semibold" style={$detailValueColor}>
                  {orderDetail.dueDate}
                </Text>
              </View>
              <View className="w-1/2 px-xs mb-sm">
                <Text className="text-[12px] mb-xxs" style={$detailLabelColor}>
                  Amount
                </Text>
                <Text className="text-[14px] font-semibold" style={$detailValueColor}>
                  ₦{orderDetail.amount.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress Tracking */}
        <View className="px-lg py-lg">
          <Text className="text-[16px] font-semibold mb-md" style={$sectionTitleColor}>
            Order Progress
          </Text>
          <View className="bg-neutral100 rounded-[12px] p-lg border border-border">
            {progressSteps.map((step, index) => renderProgressStep(step, index))}
          </View>
        </View>

        {/* Special Instructions */}
        {orderDetail.specialInstructions && (
          <View className="px-lg py-lg">
            <Text className="text-[16px] font-semibold mb-md" style={$sectionTitleColor}>
              Special Instructions
            </Text>
            <View className="flex-row bg-accentSoft rounded-[8px] p-md items-start">
              <Icon icon="view" size={20} color={colors.accent} />
              <Text className="flex-1 text-[14px] ml-sm leading-[20px]" style={$instructionsTextColor}>
                {orderDetail.specialInstructions}
              </Text>
            </View>
          </View>
        )}

        {/* Order Timeline */}
        <View className="px-lg py-lg">
          <Text className="text-[16px] font-semibold mb-md" style={$sectionTitleColor}>
            Timeline
          </Text>
          <View className="bg-neutral100 rounded-[12px] p-lg border border-border">
            <View className="flex-row justify-between mb-sm">
              <Text className="text-[14px]" style={$timelineLabelColor}>
                Order Created
              </Text>
              <Text className="text-[14px] font-medium" style={$timelineValueColor}>
                {orderDetail.createdAt}
              </Text>
            </View>
            <View className="flex-row justify-between mb-sm">
              <Text className="text-[14px]" style={$timelineLabelColor}>
                Estimated Delivery
              </Text>
              <Text className="text-[14px] font-medium" style={$timelineValueColor}>
                {orderDetail.dueDate}
              </Text>
            </View>
            {order.actualDeliveryDate && (
              <View className="flex-row justify-between mb-sm">
                <Text className="text-[14px]" style={$timelineLabelColor}>
                  Delivered
                </Text>
                <Text className="text-[14px] font-medium" style={$timelineValueColor}>
                  {formatDate(order.actualDeliveryDate)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Section */}
        <View className="px-lg py-lg">
          <Text className="text-[16px] font-semibold mb-md" style={$sectionTitleColor}>
            Need Help?
          </Text>
          <View className="flex-row justify-between">
            {canMessage && (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-accentSoft rounded-[8px] p-md mx-xs"
                onPress={handleOpenChat}
                accessible
                accessibilityLabel={`Message ${isTailorViewer ? "client" : "tailor"}${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                accessibilityRole="button"
              >
                <Icon icon="menu" size={20} color={colors.accent} />
                <Text className="text-[14px] font-medium ml-xs" style={$contactButtonTextColor}>
                  {isTailorViewer ? "Message Client" : "Message Tailor"}
                </Text>
                {unreadCount > 0 && (
                  <View className="min-w-[20px] h-[20px] rounded-[10px] bg-error500 justify-center items-center px-xxs ml-xs">
                    <Text className="text-[11px] font-bold" style={$unreadBadgeTextColor}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-accentSoft rounded-[8px] p-md mx-xs">
              <Icon icon="bell" size={20} color={colors.accent} />
              <Text className="text-[14px] font-medium ml-xs" style={$contactButtonTextColor}>
                Call Shop
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View
        className="px-lg pt-md pb-md gap-sm bg-neutral100 border-t border-t-border"
        style={$bottomContainerInsets}
      >
        {/* Tailor actions: accept/reject a pending order */}
        {canAcceptOrReject && (
          <View className="flex-row gap-sm">
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
        <View className="flex-1 justify-end">
          <TouchableOpacity
            className="absolute top-0 left-0 right-0 bottom-0 bg-overlay50"
            activeOpacity={1}
            onPress={closeCancelModal}
          />
          <View className="bg-neutral100 rounded-t-[20px] p-lg pb-xl">
            <View className="flex-row justify-between items-center mb-sm">
              <Text className="text-[18px] font-bold" style={$modalTitleColor}>
                Cancel Order
              </Text>
              <TouchableOpacity
                onPress={closeCancelModal}
                accessible
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Icon icon="x" size={22} color={colors.palette.neutral700} />
              </TouchableOpacity>
            </View>
            <Text className="text-[14px] mb-md" style={$modalSubtitleColor}>
              Why are you cancelling this order?
            </Text>
            <View className="flex-row flex-wrap gap-xs mb-sm">
              {CANCEL_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  className={`px-md py-xs rounded-[20px] border ${
                    cancelReason === reason ? "border-accent bg-accentSoft" : "border-neutral300"
                  }`}
                  onPress={() => setCancelReason(reason)}
                  accessible
                  accessibilityLabel={reason}
                  accessibilityRole="button"
                >
                  <Text
                    className={`text-[14px] ${cancelReason === reason ? "font-semibold" : ""}`}
                    style={cancelReason === reason ? $reasonChipTextSelectedColor : $reasonChipTextColor}
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
        currentStatus={domainToCurrentPBStatus(order as any)}
        onClose={() => setIsStatusSheetVisible(false)}
        onSubmit={handleStatusUpdate}
        isSubmitting={isActing}
      />
    </Screen>
  )
}

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities.

// Screen's fixed preset gives its inner container no height; without flex the
// scrollable body collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  flex: 1,
}

// Card shadow (RN shadows stay inline).
const $cardShadow: ViewStyle = {
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 3,
}

// Text color overrides (static, light-only).
const $headerTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $loadingTextColor: TextStyle = { color: colors.palette.neutral600 }
const $orderIdColor: TextStyle = { color: colors.palette.neutral600 }
const $orderTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $detailLabelColor: TextStyle = { color: colors.palette.neutral600 }
const $detailValueColor: TextStyle = { color: colors.palette.neutral900 }
const $sectionTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $progressTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $progressDescColor: TextStyle = { color: colors.palette.neutral600 }
const $progressDateColor: TextStyle = { color: colors.palette.neutral500 }
const $instructionsTextColor: TextStyle = { color: colors.palette.emerald600 }
const $timelineLabelColor: TextStyle = { color: colors.palette.neutral600 }
const $timelineValueColor: TextStyle = { color: colors.palette.neutral900 }
const $contactButtonTextColor: TextStyle = { color: colors.palette.emerald600 }
const $unreadBadgeTextColor: TextStyle = { color: colors.palette.neutral100 }
const $modalTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $modalSubtitleColor: TextStyle = { color: colors.palette.neutral600 }
const $reasonChipTextColor: TextStyle = { color: colors.palette.neutral800 }
const $reasonChipTextSelectedColor: TextStyle = { color: colors.palette.emerald600 }

// Button style overrides stay inline (Button owns its className; callers never
// pass one in). RN shadows stay inline too.
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
