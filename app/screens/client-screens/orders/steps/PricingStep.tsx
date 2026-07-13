/**
 * Pricing Step
 * Fifth step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, TouchableOpacity, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import { Text, Button, Icon } from "@/components"
import { colors, spacing } from "@/theme"
import { useStores } from "@/models"
import { PaymentMethod, NigerianCity, NigerianGarmentType, OrderPriority } from "@/types/orders"

interface PricingBreakdown {
  basePrice: number
  fabricCost: number
  complexityMultiplier: number
  urgencyFee: number
  deliveryFee: number
  totalPrice: number
  depositRequired: number
  balanceAmount: number
}

export const PricingStep: FC = observer(() => {
  const { orderStore } = useStores()

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("bank_transfer")
  const [selectedPriority, setSelectedPriority] = useState<OrderPriority>("normal")
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const paymentMethods = [
    {
      method: "bank_transfer" as PaymentMethod,
      name: orderStore.getTranslation("paymentMethods", "bank_transfer"),
      description: "Direct bank transfer - Most common in Nigeria",
      processingFee: 0,
      icon: "money" as const,
      available: true,
    },
    {
      method: "mobile_money" as PaymentMethod,
      name: orderStore.getTranslation("paymentMethods", "mobile_money"),
      description: "OPay, PalmPay, and other mobile wallets",
      processingFee: 50,
      icon: "money" as const,
      available: true,
    },
    {
      method: "cash" as PaymentMethod,
      name: orderStore.getTranslation("paymentMethods", "cash"),
      description: "Cash payment on delivery or at pickup",
      processingFee: 0,
      icon: "money" as const,
      available: true,
    },
    {
      method: "card" as PaymentMethod,
      name: orderStore.getTranslation("paymentMethods", "card"),
      description: "Debit/Credit card payment",
      processingFee: 100,
      icon: "money" as const,
      available: true,
    },
    {
      method: "pos" as PaymentMethod,
      name: "POS Terminal",
      description: "Point of Sale terminal payment",
      processingFee: 50,
      icon: "money" as const,
      available: true,
    },
  ]

  const priorityOptions = [
    {
      priority: "low" as OrderPriority,
      name: "Standard Delivery",
      description: "Normal processing time",
      multiplier: 1.0,
      icon: "appointment" as const,
    },
    {
      priority: "normal" as OrderPriority,
      name: "Priority Delivery",
      description: "Faster processing",
      multiplier: 1.2,
      icon: "caretRight" as const,
    },
    {
      priority: "high" as OrderPriority,
      name: "Express Delivery",
      description: "Quick turnaround",
      multiplier: 1.5,
      icon: "sew" as const,
    },
    {
      priority: "urgent" as OrderPriority,
      name: "Rush Order",
      description: "Emergency delivery",
      multiplier: 2.0,
      icon: "sew" as const,
    },
  ]

  useEffect(() => {
    calculatePricing()
  }, [selectedPriority])

  const calculatePricing = async () => {
    setIsCalculating(true)

    try {
      const { orderCreationData } = orderStore

      if (
        !orderCreationData?.styleConfig ||
        !orderCreationData?.fabricSelection ||
        !orderCreationData?.customerInfo
      ) {
        throw new Error("Missing required order data")
      }

      // Calculate Nigerian pricing using OrderStore method
      const garmentType = orderCreationData.styleConfig.garmentType as NigerianGarmentType
      const city = orderCreationData.customerInfo.city as NigerianCity
      const isRush = selectedPriority === "urgent"

      const calculatedPricing = orderStore.calculateNigerianPricing(garmentType, city, isRush)

      // Add delivery fee based on city
      const cityConfig = orderStore.getCityConfig(city)
      const deliveryFee = cityConfig.deliveryFee

      // Add processing fee for payment method
      const selectedPayment = paymentMethods.find((p) => p.method === selectedPaymentMethod)
      const processingFee = selectedPayment?.processingFee || 0

      // Apply priority multiplier
      const priorityOption = priorityOptions.find((p) => p.priority === selectedPriority)
      const priorityMultiplier = priorityOption?.multiplier || 1.0

      const adjustedTotalPrice = calculatedPricing.totalPrice * priorityMultiplier
      const finalTotal = adjustedTotalPrice + deliveryFee + processingFee

      const pricingBreakdown: PricingBreakdown = {
        basePrice: calculatedPricing.basePrice,
        fabricCost: calculatedPricing.fabricCost,
        complexityMultiplier: calculatedPricing.complexityMultiplier,
        urgencyFee: calculatedPricing.urgencyFee,
        deliveryFee,
        totalPrice: finalTotal,
        depositRequired: finalTotal * 0.5, // 50% deposit
        balanceAmount: finalTotal * 0.5,
      }

      setPricing(pricingBreakdown)
    } catch (error) {
      console.error("Failed to calculate pricing:", error)
      Alert.alert("Error", "Failed to calculate pricing. Please check your order details.")
    } finally {
      setIsCalculating(false)
    }
  }

  const handleConfirmPricing = () => {
    if (pricing && orderStore.orderCreationData) {
      // Update order priority
      orderStore.orderCreationData.priority = selectedPriority

      Alert.alert(
        "Pricing Confirmed",
        `Total: ₦${pricing.totalPrice.toLocaleString()}\nDeposit Required: ₦${pricing.depositRequired.toLocaleString()}`,
        [
          {
            text: "OK",
            onPress: () => {
              // This will allow progression to next step
            },
          },
        ],
      )
    }
  }

  const getEstimatedDelivery = () => {
    if (!orderStore.orderCreationData?.styleConfig) return "N/A"

    const garmentConfig = orderStore.getGarmentConfig(
      orderStore.orderCreationData.styleConfig.garmentType as NigerianGarmentType,
    )
    if (!garmentConfig) return "N/A"

    const baseDays = garmentConfig.estimatedDays
    const priorityOption = priorityOptions.find((p) => p.priority === selectedPriority)
    const adjustedDays = Math.ceil(baseDays / (priorityOption?.multiplier || 1.0))

    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + adjustedDays)

    return deliveryDate.toLocaleDateString("en-NG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-lg">
        <Text className="text-[24px] font-bold mb-xs" style={$textDeepCharcoal}>
          {orderStore.getTranslation("pricing", "en")}
        </Text>
        <Text className="text-[14px] leading-[20px] mb-lg" style={$textThreadBlue}>
          Review pricing and select payment preferences
        </Text>

        {/* Priority Selection */}
        <View className="mb-xl">
          <Text className="text-[18px] font-semibold mb-xs" style={$textDeepCharcoal}>
            Delivery Priority
          </Text>
          <Text className="text-[13px] leading-[18px] mb-md" style={$textThreadBlue}>
            Choose your preferred delivery timeline
          </Text>

          {priorityOptions.map((option) => {
            const selected = selectedPriority === option.priority
            return (
              <TouchableOpacity
                key={option.priority}
                className={`bg-neutral100 rounded-[12px] p-md mb-sm border-2 ${
                  selected ? "border-tailorGold" : "border-neutral200"
                }`}
                style={selected ? $tintTailorGold : undefined}
                onPress={() => setSelectedPriority(option.priority)}
              >
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Icon icon={option.icon} size={24} color={colors.palette.tailorGold} />
                    <View className="flex-1 ml-sm">
                      <Text className="text-[14px] font-semibold" style={$textDeepCharcoal}>
                        {option.name}
                      </Text>
                      <Text className="text-[12px]" style={$textThreadBlue}>
                        {option.description}
                      </Text>
                    </View>
                    <View className="bg-neutral200 rounded-[6px] px-xs py-xxxs">
                      <Text className="text-[10px] font-semibold" style={$textDeepCharcoal}>
                        {option.multiplier === 1.0 ? "Standard" : `${option.multiplier}x`}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Payment Method Selection */}
        <View className="mb-xl">
          <Text className="text-[18px] font-semibold mb-xs" style={$textDeepCharcoal}>
            Payment Method
          </Text>
          <Text className="text-[13px] leading-[18px] mb-md" style={$textThreadBlue}>
            Choose your preferred payment option
          </Text>

          {paymentMethods.map((method) => {
            const selected = selectedPaymentMethod === method.method
            return (
              <TouchableOpacity
                key={method.method}
                className={`bg-neutral100 rounded-[12px] p-md mb-sm border-2 ${
                  selected ? "border-threadBlue" : "border-neutral200"
                } ${!method.available ? "opacity-50" : ""}`}
                style={selected ? $tintThreadBlue : undefined}
                onPress={() => method.available && setSelectedPaymentMethod(method.method)}
                disabled={!method.available}
              >
                <View className="flex-row items-center">
                  <Icon icon={method.icon} size={24} color={colors.palette.threadBlue} />
                  <View className="flex-1 ml-sm">
                    <Text className="text-[14px] font-semibold" style={$textDeepCharcoal}>
                      {method.name}
                    </Text>
                    <Text className="text-[12px]" style={$textThreadBlue}>
                      {method.description}
                    </Text>
                    {method.processingFee > 0 && (
                      <Text className="text-[11px] font-medium" style={$textTailorGold}>
                        Processing fee: ₦{method.processingFee}
                      </Text>
                    )}
                  </View>
                  <View
                    className={`w-[24px] h-[24px] rounded-[12px] border-2 justify-center items-center ${
                      selected ? "border-threadBlue" : "border-neutral300"
                    }`}
                  >
                    {selected && <View className="w-[12px] h-[12px] rounded-[6px] bg-threadBlue" />}
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Pricing Breakdown */}
        {pricing && (
          <View className="mb-xl">
            <Text className="text-[18px] font-semibold mb-xs" style={$textDeepCharcoal}>
              Pricing Breakdown
            </Text>

            <View className="bg-neutral100 rounded-[12px] p-lg border border-neutral200 mb-md">
              <View className="flex-row justify-between items-center mb-sm">
                <Text className="text-[14px]" style={$textThreadBlue}>
                  Base Garment Price
                </Text>
                <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                  ₦{pricing.basePrice.toLocaleString()}
                </Text>
              </View>

              <View className="flex-row justify-between items-center mb-sm">
                <Text className="text-[14px]" style={$textThreadBlue}>
                  Fabric Cost
                </Text>
                <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                  ₦{pricing.fabricCost.toLocaleString()}
                </Text>
              </View>

              <View className="flex-row justify-between items-center mb-sm">
                <Text className="text-[14px]" style={$textThreadBlue}>
                  Complexity Adjustment
                </Text>
                <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                  ×{pricing.complexityMultiplier.toFixed(1)}
                </Text>
              </View>

              {pricing.urgencyFee > 0 && (
                <View className="flex-row justify-between items-center mb-sm">
                  <Text className="text-[14px]" style={$textThreadBlue}>
                    Rush Fee
                  </Text>
                  <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                    ₦{pricing.urgencyFee.toLocaleString()}
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between items-center mb-sm">
                <Text className="text-[14px]" style={$textThreadBlue}>
                  Delivery Fee
                </Text>
                <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                  ₦{pricing.deliveryFee.toLocaleString()}
                </Text>
              </View>

              {paymentMethods.find((p) => p.method === selectedPaymentMethod)?.processingFee! >
                0 && (
                <View className="flex-row justify-between items-center mb-sm">
                  <Text className="text-[14px]" style={$textThreadBlue}>
                    Processing Fee
                  </Text>
                  <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                    ₦
                    {paymentMethods
                      .find((p) => p.method === selectedPaymentMethod)
                      ?.processingFee?.toLocaleString()}
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between items-center border-t border-neutral300 pt-sm mb-0">
                <Text className="text-[16px] font-semibold" style={$textDeepCharcoal}>
                  Total Amount
                </Text>
                <Text className="text-[18px] font-bold" style={$textTailorGold}>
                  ₦{pricing.totalPrice.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Payment Schedule */}
            <View
              className="rounded-[12px] p-lg border-l-4 border-l-sageGreen"
              style={$scheduleTint}
            >
              <Text className="text-[16px] font-semibold mb-md" style={$textDeepCharcoal}>
                Payment Schedule
              </Text>

              <View className="flex-row justify-between items-center mb-sm">
                <View className="flex-1">
                  <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                    Deposit Required (50%)
                  </Text>
                  <Text className="text-[12px]" style={$textThreadBlue}>
                    Due upon order confirmation
                  </Text>
                </View>
                <Text className="text-[16px] font-bold" style={$textSageGreen}>
                  ₦{pricing.depositRequired.toLocaleString()}
                </Text>
              </View>

              <View className="flex-row justify-between items-center mb-sm">
                <View className="flex-1">
                  <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                    Balance Payment (50%)
                  </Text>
                  <Text className="text-[12px]" style={$textThreadBlue}>
                    Due upon completion
                  </Text>
                </View>
                <Text className="text-[16px] font-bold" style={$textSageGreen}>
                  ₦{pricing.balanceAmount.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Delivery Information */}
        <View className="mb-xl">
          <Text className="text-[18px] font-semibold mb-xs" style={$textDeepCharcoal}>
            Delivery Information
          </Text>

          <View className="bg-neutral100 rounded-[12px] p-lg border border-neutral200">
            <View className="flex-row items-center mb-md">
              <Icon icon="appointment" size={20} color={colors.palette.threadBlue} />
              <View className="ml-sm">
                <Text className="text-[12px]" style={$textThreadBlue}>
                  Estimated Delivery
                </Text>
                <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                  {getEstimatedDelivery()}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-md">
              <Icon icon="home" size={20} color={colors.palette.threadBlue} />
              <View className="ml-sm">
                <Text className="text-[12px]" style={$textThreadBlue}>
                  Delivery Location
                </Text>
                <Text className="text-[14px] font-medium" style={$textDeepCharcoal}>
                  {orderStore.orderCreationData?.customerInfo?.city &&
                    orderStore.getTranslation(
                      "cities",
                      orderStore.orderCreationData.customerInfo.city,
                    )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Terms Notice */}
        <View
          className="flex-row rounded-[12px] p-lg border-l-4 border-l-threadBlue mb-lg"
          style={$termsTint}
        >
          <Icon icon="bell" size={20} color={colors.palette.threadBlue} />
          <View className="flex-1 ml-sm">
            <Text className="text-[14px] font-semibold mb-xs" style={$textDeepCharcoal}>
              Payment Terms
            </Text>
            <Text className="text-[12px] leading-[16px]" style={$textThreadBlue}>
              • 50% deposit required to begin work{"\n"}• Balance due upon completion{"\n"}• Prices
              valid for 30 days{"\n"}• Alterations included in first fitting
            </Text>
          </View>
        </View>

        {/* Confirm Button */}
        <Button
          text="Confirm Pricing & Payment"
          style={$confirmButton}
          textStyle={$confirmButtonText}
          onPress={handleConfirmPricing}
          disabled={isCalculating || !pricing}
        />

        <View className="h-xl" />
      </View>
    </ScrollView>
  )
})

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors and
// data-driven opacity tints stay as inline styles (no `dark:` variants). Layout,
// spacing, and container backgrounds/borders are className token utilities.

// Text color overrides (static, light-only).
const $textDeepCharcoal: TextStyle = { color: colors.palette.deepCharcoal }
const $textThreadBlue: TextStyle = { color: colors.palette.threadBlue }
const $textTailorGold: TextStyle = { color: colors.palette.tailorGold }
const $textSageGreen: TextStyle = { color: colors.palette.sageGreen }

// Selected-card background tints use an opacity-suffixed hex, so they stay inline.
const $tintTailorGold: ViewStyle = { backgroundColor: colors.palette.tailorGold + "10" }
const $tintThreadBlue: ViewStyle = { backgroundColor: colors.palette.threadBlue + "10" }
const $scheduleTint: ViewStyle = { backgroundColor: colors.palette.sageGreen + "10" }
const $termsTint: ViewStyle = { backgroundColor: colors.palette.threadBlue + "10" }

// Button style overrides stay inline (Button owns its className; callers never
// pass one in).
const $confirmButton: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
  borderRadius: 12,
  paddingVertical: spacing.md,
}

const $confirmButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}
