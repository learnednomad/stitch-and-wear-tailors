/**
 * Confirmation Step
 * Final step in Nigerian order creation workflow
 */

import { useRouter } from "expo-router"
import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, Alert } from "react-native"
import { Text, Button, Icon } from "@/components"
import { colors, spacing } from "@/theme"
import {
  useOrderDraftStore,
  getCityConfig,
  getGarmentConfig,
  selectIsOrderCreationComplete,
} from "@/state/orderDraftStore"
import { useCreateOrder } from "@/api/orders"
import { useAuthStore } from "@/state/authStore"

export const ConfirmationStep: FC = () => {
  const orderStore = useOrderDraftStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const createOrder = useCreateOrder()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const orderData = orderStore.orderCreationData

  useEffect(() => {
    // Validate that all required data is present
    if (!orderData?.customerInfo || !orderData?.fabricSelection || !orderData?.styleConfig) {
      Alert.alert(
        "Incomplete Order",
        "Some order information is missing. Please go back and complete all steps.",
        [{ text: "OK", onPress: () => orderStore.setOrderCreationStep(0) }],
      )
    }
  }, [])

  const handleSubmitOrder = async () => {
    if (!termsAccepted) {
      Alert.alert("Terms Required", "Please accept the terms and conditions to proceed.")
      return
    }

    if (!selectIsOrderCreationComplete(orderStore)) {
      Alert.alert("Incomplete Order", "Please complete all required steps before submitting.")
      return
    }

    setIsSubmitting(true)

    try {
      // Build the draft order in the Zustand wizard store, then submit via
      // the React Query create mutation (server-data path).
      orderStore.createNigerianDraftOrder()
      const draft = useOrderDraftStore.getState().draftOrder

      const createdOrder = await createOrder.mutateAsync(draft as Record<string, any>)
      orderStore.clearDraftOrder()

      Alert.alert(
        "Order Submitted Successfully!",
        `Your order #${createdOrder?.orderNumber} has been created. You will receive a confirmation email shortly.`,
        [
          {
            text: "View Order",
            onPress: () => {
              ;router.push(`/orders/${createdOrder?.id}`)
            },
          },
          {
            text: "Create Another",
            onPress: () => {
              orderStore.clearDraftOrder()
              orderStore.startOrderCreation()
            },
          },
        ],
      )
    } catch (error) {
      console.error("Failed to submit order:", error)
      Alert.alert(
        "Submission Failed",
        "There was an error submitting your order. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEstimatedDelivery = () => {
    if (!orderData?.styleConfig) return "N/A"

    const garmentConfig = getGarmentConfig(orderData.styleConfig.garmentType as any)
    if (!garmentConfig) return "N/A"

    const baseDays = garmentConfig.estimatedDays
    const priorityMultiplier =
      orderData.priority === "urgent"
        ? 0.5
        : orderData.priority === "high"
          ? 0.7
          : orderData.priority === "normal"
            ? 0.85
            : 1.0

    const adjustedDays = Math.ceil(baseDays * priorityMultiplier)

    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + adjustedDays)

    return deliveryDate.toLocaleDateString("en-NG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const calculateTotalPrice = () => {
    if (!orderData?.styleConfig || !orderData?.fabricSelection || !orderData?.customerInfo) {
      return 0
    }

    try {
      const pricing = orderStore.calculateNigerianPricing(
        orderData.styleConfig.garmentType as any,
        orderData.customerInfo.city as any,
        orderData.priority === "urgent",
      )

      const cityConfig = getCityConfig(orderData.customerInfo.city as any)
      const deliveryFee = cityConfig.deliveryFee

      return pricing.totalPrice + deliveryFee
    } catch {
      return 0
    }
  }

  if (!orderData) {
    return (
      <View className="flex-1">
        <View className="flex-1 justify-center items-center p-xl">
          <Icon icon="x" size={48} color={colors.palette.alertRed} />
          <Text className="text-[18px] font-semibold mt-md mb-xs" style={$textAlertRed}>
            Order Data Missing
          </Text>
          <Text className="text-[14px] text-center" style={$textThreadBlue}>
            Please go back and complete all order steps.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-lg">
        <Text className="text-[24px] font-bold mb-xs" style={$textCharcoal}>
          {orderStore.getTranslation("confirmation", "en")}
        </Text>
        <Text className="text-[14px] mb-lg leading-[20px]" style={$textThreadBlue}>
          Review your order details before final submission
        </Text>

        {/* Order Summary */}
        <View className="mb-lg">
          <Text className="text-[18px] font-semibold mb-md" style={$textCharcoal}>
            Order Summary
          </Text>

          <View
            className="rounded-[12px] p-lg border-l-4 border-l-tailorGold"
            style={$summaryCardBg}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-[16px] font-semibold" style={$textCharcoal}>
                {orderData.orderType.charAt(0).toUpperCase() + orderData.orderType.slice(1)} Order
              </Text>
              <View className="bg-tailorGold rounded-[6px] px-sm py-xs">
                <Text className="text-[12px] font-semibold" style={$textWarmIvory}>
                  {orderData.priority.charAt(0).toUpperCase() + orderData.priority.slice(1)}{" "}
                  Priority
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View className="mb-lg">
          <Text className="text-[18px] font-semibold mb-md" style={$textCharcoal}>
            Customer Information
          </Text>

          <View className="bg-neutral100 rounded-[12px] p-lg border border-neutral200">
            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Name:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.customerInfo?.firstName} {orderData.customerInfo?.lastName}
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Email:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.customerInfo?.email}
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Phone:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.customerInfo?.phone}
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                City:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.customerInfo?.city &&
                  orderStore.getTranslation("cities", orderData.customerInfo.city)}
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Language:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.customerInfo?.preferredLanguage === "en" && "English"}
                {orderData.customerInfo?.preferredLanguage === "yo" && "Yorùbá"}
                {orderData.customerInfo?.preferredLanguage === "ha" && "Hausa"}
                {orderData.customerInfo?.preferredLanguage === "ig" && "Igbo"}
              </Text>
            </View>
          </View>
        </View>

        {/* Garment Details */}
        <View className="mb-lg">
          <Text className="text-[18px] font-semibold mb-md" style={$textCharcoal}>
            Garment Details
          </Text>

          <View className="bg-neutral100 rounded-[12px] p-lg border border-neutral200">
            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Style:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.styleConfig?.garmentType &&
                  orderStore.getTranslation("garments", orderData.styleConfig.garmentType)}
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Fit:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {(orderData.styleConfig?.fitPreference || "regular").replace(/^\w/, (letter) =>
                  letter.toUpperCase(),
                )}{" "}
                Fit
              </Text>
            </View>

            {orderData.styleConfig?.designNotes && (
              <View className="flex-row justify-between items-start mb-sm">
                <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                  Design Notes:
                </Text>
                <Text
                  className="text-[14px] font-normal flex-[2] text-right"
                  style={$textCharcoal}
                >
                  {orderData.styleConfig.designNotes}
                </Text>
              </View>
            )}

            {orderData.styleConfig?.culturalSpecifications && (
              <View className="flex-row justify-between items-start mb-sm">
                <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                  Cultural Details:
                </Text>
                <Text
                  className="text-[14px] font-normal flex-[2] text-right"
                  style={$textCharcoal}
                >
                  {orderData.styleConfig.culturalSpecifications}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Fabric Details */}
        <View className="mb-lg">
          <Text className="text-[18px] font-semibold mb-md" style={$textCharcoal}>
            Fabric Selection
          </Text>

          <View className="bg-neutral100 rounded-[12px] p-lg border border-neutral200">
            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Type:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.fabricSelection?.type
                  ?.replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Color:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.fabricSelection?.color}
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Quantity:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.fabricSelection?.quantity} meters
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Cost:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                ₦{orderData.fabricSelection?.totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Measurements */}
        <View className="mb-lg">
          <Text className="text-[18px] font-semibold mb-md" style={$textCharcoal}>
            Measurements
          </Text>

          <View className="bg-neutral100 rounded-[12px] p-lg border border-neutral200">
            {orderData.measurementId ? (
              <View className="flex-row items-center">
                <Icon icon="check" size={24} color={colors.palette.sageGreen} />
                <Text className="text-[14px] ml-sm flex-1" style={$textCharcoal}>
                  Measurements saved (ID: {orderData.measurementId.slice(-8)})
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Icon icon="more" size={24} color={colors.palette.threadBlue} />
                <Text className="text-[14px] ml-sm flex-1" style={$textCharcoal}>
                  Measurements will be taken during fitting appointment
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Delivery Information */}
        <View className="mb-lg">
          <Text className="text-[18px] font-semibold mb-md" style={$textCharcoal}>
            Delivery Information
          </Text>

          <View className="bg-neutral100 rounded-[12px] p-lg border border-neutral200">
            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Estimated Delivery:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {getEstimatedDelivery()}
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-sm">
              <Text className="text-[14px] font-medium flex-1" style={$textThreadBlue}>
                Address:
              </Text>
              <Text className="text-[14px] font-normal flex-[2] text-right" style={$textCharcoal}>
                {orderData.customerInfo?.address}
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Summary */}
        <View className="mb-lg">
          <Text className="text-[18px] font-semibold mb-md" style={$textCharcoal}>
            Total Cost
          </Text>

          <View
            className="rounded-[12px] p-lg border-l-4 border-l-sageGreen"
            style={$pricingCardBg}
          >
            <View className="flex-row justify-between items-center mb-md pb-sm border-b border-b-neutral300">
              <Text className="text-[18px] font-semibold" style={$textCharcoal}>
                Total Amount
              </Text>
              <Text className="text-[20px] font-bold" style={$textSageGreen}>
                ₦{calculateTotalPrice().toLocaleString()}
              </Text>
            </View>

            <View className="mt-sm">
              <Text className="text-[14px] font-semibold mb-sm" style={$textCharcoal}>
                Payment Schedule
              </Text>
              <View className="flex-row justify-between items-center mb-xs">
                <Text className="text-[12px]" style={$textThreadBlue}>
                  Deposit (50%)
                </Text>
                <Text className="text-[14px] font-semibold" style={$textSageGreen}>
                  ₦{(calculateTotalPrice() * 0.5).toLocaleString()}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mb-xs">
                <Text className="text-[12px]" style={$textThreadBlue}>
                  Balance (50%)
                </Text>
                <Text className="text-[14px] font-semibold" style={$textSageGreen}>
                  ₦{(calculateTotalPrice() * 0.5).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View className="mb-lg">
          <View className="flex-row items-start">
            <Button text="" style={$checkbox} onPress={() => setTermsAccepted(!termsAccepted)}>
              <View
                className={`w-[24px] h-[24px] rounded-[4px] border-2 justify-center items-center ${
                  termsAccepted ? "bg-sageGreen border-sageGreen" : "bg-neutral100 border-neutral400"
                }`}
              >
                {termsAccepted && (
                  <Icon icon="check" size={16} color={colors.palette.warmIvory} />
                )}
              </View>
            </Button>

            <View className="flex-1">
              <Text className="text-[14px] font-semibold mb-xs" style={$textCharcoal}>
                Terms and Conditions
              </Text>
              <Text className="text-[12px] leading-[16px]" style={$textThreadBlue}>
                I agree to the terms and conditions, payment schedule, and understand that a 50%
                deposit is required to begin work. I acknowledge the estimated delivery date and
                fitting requirements.
              </Text>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <Button
          text={isSubmitting ? "Submitting Order..." : "Submit Order"}
          style={[$submitButton, (!termsAccepted || isSubmitting) && $disabledButton]}
          textStyle={$submitButtonText}
          onPress={handleSubmitOrder}
          disabled={!termsAccepted || isSubmitting}
        />

        <View className="h-xl" />
      </View>
    </ScrollView>
  )
}

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors and
// opacity-tinted card backgrounds stay as inline styles (no `dark:` variants).
// Layout, spacing, borders, and solid token backgrounds are className utilities.
const $textCharcoal: TextStyle = { color: colors.palette.deepCharcoal }
const $textThreadBlue: TextStyle = { color: colors.palette.threadBlue }
const $textAlertRed: TextStyle = { color: colors.palette.alertRed }
const $textWarmIvory: TextStyle = { color: colors.palette.warmIvory }
const $textSageGreen: TextStyle = { color: colors.palette.sageGreen }

// Opacity-tinted card backgrounds (dynamic hex, cannot be a token class).
const $summaryCardBg: ViewStyle = { backgroundColor: colors.palette.tailorGold + "10" }
const $pricingCardBg: ViewStyle = { backgroundColor: colors.palette.sageGreen + "10" }

// Button style/textStyle overrides stay inline (Button owns its className).
const $checkbox: ViewStyle = {
  width: 24,
  height: 24,
  marginRight: spacing.sm,
  padding: 0,
  marginTop: 2,
}

const $submitButton: ViewStyle = {
  backgroundColor: colors.palette.tailorGold,
  borderRadius: 12,
  paddingVertical: spacing.md,
  marginTop: spacing.lg,
  shadowColor: colors.palette.deepCharcoal,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
}

const $disabledButton: ViewStyle = {
  backgroundColor: colors.palette.neutral400,
  opacity: 0.6,
}

const $submitButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}
