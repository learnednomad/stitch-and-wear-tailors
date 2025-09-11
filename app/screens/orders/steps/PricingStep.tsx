import React, { FC } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, ScrollView } from "react-native"
import { Text, Button } from "../../../components"
import { useStores } from "../../../models"
import { colors, spacing, typography } from "../../../theme"

const CONTAINER: ViewStyle = {
  flex: 1,
}

const SECTION: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.medium,
  marginBottom: spacing.medium,
}

const SECTION_TITLE: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 16,
  color: colors.text,
  marginBottom: spacing.small,
}

const PRICE_ROW: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.tiny,
}

const PRICE_LABEL: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.textDim,
}

const PRICE_VALUE: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: colors.text,
}

const DIVIDER: ViewStyle = {
  height: 1,
  backgroundColor: colors.separator,
  marginVertical: spacing.small,
}

const TOTAL_ROW: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.small,
  marginTop: spacing.tiny,
}

const TOTAL_LABEL: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 16,
  color: colors.text,
}

const TOTAL_VALUE: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 20,
  color: colors.palette.primary500,
}

const PAYMENT_OPTION: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  padding: spacing.medium,
  backgroundColor: colors.background,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.separator,
  marginBottom: spacing.small,
}

const PAYMENT_OPTION_SELECTED: ViewStyle = {
  borderColor: colors.palette.primary500,
  backgroundColor: colors.palette.primary100,
}

const PAYMENT_TEXT: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: colors.text,
  marginLeft: spacing.small,
}

const INFO_BOX: ViewStyle = {
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
  padding: spacing.medium,
  marginBottom: spacing.medium,
}

const INFO_TEXT: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 12,
  color: colors.palette.primary700,
  lineHeight: 18,
}

export const PricingStep: FC = observer(function PricingStep() {
  const { orderStore } = useStores()

  // Calculate pricing based on selections
  const calculatePricing = () => {
    const styleConfig = orderStore.orderCreationData?.styleConfig
    const fabricSelection = orderStore.orderCreationData?.fabricSelection

    if (!styleConfig || !fabricSelection) {
      return {
        basePrice: 0,
        fabricCost: 0,
        embellishmentCharge: 0,
        priorityCharge: 0,
        accessoriesCharge: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
      }
    }

    const basePrice = styleConfig.basePrice || 15000
    const fabricCost = fabricSelection.totalPrice || 0

    // Calculate embellishment charges
    let embellishmentCharge = 0
    if (styleConfig.embroideryStyle === "Elaborate") {
      embellishmentCharge += 5000
    } else if (styleConfig.embroideryStyle === "Royal") {
      embellishmentCharge += 8000
    } else if (styleConfig.embroideryStyle === "Custom") {
      embellishmentCharge += 10000
    }

    // Calculate priority charges
    let priorityCharge = 0
    if (styleConfig.priority === "express") {
      priorityCharge = basePrice * 0.25
    } else if (styleConfig.priority === "urgent") {
      priorityCharge = basePrice * 0.5
    }

    // Calculate accessories charges
    let accessoriesCharge = 0
    if (styleConfig.matching?.includes("Cap")) {
      accessoriesCharge += 3000
    }
    if (styleConfig.matching?.includes("Shoe")) {
      accessoriesCharge += 8000
    }
    if (styleConfig.matching?.includes("Walking Stick")) {
      accessoriesCharge += 5000
    }

    const subtotal =
      basePrice + fabricCost + embellishmentCharge + priorityCharge + accessoriesCharge
    const tax = subtotal * 0.075 // 7.5% VAT
    const total = subtotal + tax

    return {
      basePrice,
      fabricCost,
      embellishmentCharge,
      priorityCharge,
      accessoriesCharge,
      subtotal,
      tax,
      total,
    }
  }

  const pricing = calculatePricing()

  const handleSavePricing = () => {
    orderStore.setOrderPricing({
      basePrice: pricing.basePrice,
      fabricCost: pricing.fabricCost,
      embellishmentCharge: pricing.embellishmentCharge,
      priorityCharge: pricing.priorityCharge,
      accessoriesCharge: pricing.accessoriesCharge,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      totalAmount: pricing.total,
      deposit: pricing.total * 0.5, // 50% deposit
      balance: pricing.total * 0.5,
      paymentMethod: "cash",
      paymentStatus: "pending",
    })
  }

  // Auto-save pricing
  React.useEffect(() => {
    handleSavePricing()
  }, [])

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <ScrollView style={CONTAINER} showsVerticalScrollIndicator={false}>
      <View style={INFO_BOX}>
        <Text style={INFO_TEXT}>
          📍 This order will be processed at our Victoria Island location.
          {"\n"}⏱️ Estimated completion:{" "}
          {orderStore.orderCreationData?.styleConfig?.estimatedDays || 5} working days
          {"\n"}📞 We'll contact you for fitting appointments
        </Text>
      </View>

      <View style={SECTION}>
        <Text style={SECTION_TITLE}>Price Breakdown</Text>

        <View style={PRICE_ROW}>
          <Text style={PRICE_LABEL}>
            Base Price ({orderStore.orderCreationData?.styleConfig?.garmentType})
          </Text>
          <Text style={PRICE_VALUE}>{formatCurrency(pricing.basePrice)}</Text>
        </View>

        <View style={PRICE_ROW}>
          <Text style={PRICE_LABEL}>
            Fabric ({orderStore.orderCreationData?.fabricSelection?.quantity || 0} meters)
          </Text>
          <Text style={PRICE_VALUE}>{formatCurrency(pricing.fabricCost)}</Text>
        </View>

        {pricing.embellishmentCharge > 0 && (
          <View style={PRICE_ROW}>
            <Text style={PRICE_LABEL}>
              Embellishment ({orderStore.orderCreationData?.styleConfig?.embroideryStyle})
            </Text>
            <Text style={PRICE_VALUE}>{formatCurrency(pricing.embellishmentCharge)}</Text>
          </View>
        )}

        {pricing.priorityCharge > 0 && (
          <View style={PRICE_ROW}>
            <Text style={PRICE_LABEL}>
              Priority Charge ({orderStore.orderCreationData?.styleConfig?.priority})
            </Text>
            <Text style={PRICE_VALUE}>{formatCurrency(pricing.priorityCharge)}</Text>
          </View>
        )}

        {pricing.accessoriesCharge > 0 && (
          <View style={PRICE_ROW}>
            <Text style={PRICE_LABEL}>Matching Accessories</Text>
            <Text style={PRICE_VALUE}>{formatCurrency(pricing.accessoriesCharge)}</Text>
          </View>
        )}

        <View style={DIVIDER} />

        <View style={PRICE_ROW}>
          <Text style={PRICE_LABEL}>Subtotal</Text>
          <Text style={PRICE_VALUE}>{formatCurrency(pricing.subtotal)}</Text>
        </View>

        <View style={PRICE_ROW}>
          <Text style={PRICE_LABEL}>VAT (7.5%)</Text>
          <Text style={PRICE_VALUE}>{formatCurrency(pricing.tax)}</Text>
        </View>

        <View style={DIVIDER} />

        <View style={TOTAL_ROW}>
          <Text style={TOTAL_LABEL}>Total Amount</Text>
          <Text style={TOTAL_VALUE}>{formatCurrency(pricing.total)}</Text>
        </View>
      </View>

      <View style={SECTION}>
        <Text style={SECTION_TITLE}>Payment Information</Text>

        <View style={PRICE_ROW}>
          <Text style={PRICE_LABEL}>Deposit (50%)</Text>
          <Text style={PRICE_VALUE}>{formatCurrency(pricing.total * 0.5)}</Text>
        </View>

        <View style={PRICE_ROW}>
          <Text style={PRICE_LABEL}>Balance (Due on delivery)</Text>
          <Text style={PRICE_VALUE}>{formatCurrency(pricing.total * 0.5)}</Text>
        </View>

        <View style={DIVIDER} />

        <Text style={PRICE_LABEL}>Payment Methods Accepted:</Text>
        <View style={{ marginTop: spacing.small }}>
          <Text style={INFO_TEXT}>• Cash</Text>
          <Text style={INFO_TEXT}>• Bank Transfer</Text>
          <Text style={INFO_TEXT}>• POS (Card Payment)</Text>
          <Text style={INFO_TEXT}>• Mobile Money (Coming Soon)</Text>
        </View>
      </View>

      <View style={SECTION}>
        <Text style={SECTION_TITLE}>Terms & Conditions</Text>
        <Text style={INFO_TEXT}>
          • 50% deposit required to start work{"\n"}• Balance due before delivery{"\n"}• Alterations
          included within 7 days{"\n"}• Custom orders are non-refundable{"\n"}• Delivery charges may
          apply outside Lagos
        </Text>
      </View>
    </ScrollView>
  )
})
