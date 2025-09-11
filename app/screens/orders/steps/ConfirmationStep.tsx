import React, { FC } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, ScrollView } from "react-native"
import { Text, Icon } from "../../../components"
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

const SECTION_HEADER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.small,
}

const SECTION_TITLE: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 16,
  color: colors.text,
  marginLeft: spacing.small,
}

const DETAIL_ROW: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.tiny,
}

const DETAIL_LABEL: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.textDim,
}

const DETAIL_VALUE: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: colors.text,
  textAlign: "right",
  maxWidth: "60%",
}

const DIVIDER: ViewStyle = {
  height: 1,
  backgroundColor: colors.separator,
  marginVertical: spacing.small,
}

const SUCCESS_BOX: ViewStyle = {
  backgroundColor: colors.palette.success100,
  borderRadius: 12,
  padding: spacing.medium,
  marginBottom: spacing.medium,
  alignItems: "center",
}

const SUCCESS_ICON: ViewStyle = {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: colors.palette.success500,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.small,
}

const SUCCESS_TEXT: TextStyle = {
  fontFamily: typography.primary.bold,
  fontSize: 18,
  color: colors.palette.success700,
  marginBottom: spacing.tiny,
}

const SUCCESS_SUBTEXT: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.palette.success600,
  textAlign: "center",
}

const HIGHLIGHT_BOX: ViewStyle = {
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
  padding: spacing.small,
  marginTop: spacing.small,
}

const HIGHLIGHT_TEXT: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 12,
  color: colors.palette.primary700,
}

export const ConfirmationStep: FC = observer(function ConfirmationStep() {
  const { orderStore } = useStores()

  const orderData = orderStore.orderCreationData
  const customerInfo = orderData?.customerInfo
  const measurements = orderData?.measurements
  const fabricSelection = orderData?.fabricSelection
  const styleConfig = orderData?.styleConfig
  const pricing = orderData?.pricing

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getDeliveryDate = () => {
    const days = styleConfig?.estimatedDays || 7
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + days)
    return deliveryDate.toLocaleDateString("en-NG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <ScrollView style={CONTAINER} showsVerticalScrollIndicator={false}>
      <View style={SUCCESS_BOX}>
        <View style={SUCCESS_ICON}>
          <Icon icon="check" size={32} color={colors.palette.neutral100} />
        </View>
        <Text style={SUCCESS_TEXT}>Order Ready!</Text>
        <Text style={SUCCESS_SUBTEXT}>
          Review your order details below and click Submit to confirm
        </Text>
      </View>

      {/* Customer Information */}
      <View style={SECTION}>
        <View style={SECTION_HEADER}>
          <Icon icon="user" size={20} color={colors.palette.primary500} />
          <Text style={SECTION_TITLE}>Customer Information</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Name</Text>
          <Text style={DETAIL_VALUE}>
            {customerInfo?.firstName} {customerInfo?.lastName}
          </Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Phone</Text>
          <Text style={DETAIL_VALUE}>{customerInfo?.phone}</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Email</Text>
          <Text style={DETAIL_VALUE}>{customerInfo?.email}</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Address</Text>
          <Text style={DETAIL_VALUE}>
            {customerInfo?.address}, {customerInfo?.city}
          </Text>
        </View>
      </View>

      {/* Garment Details */}
      <View style={SECTION}>
        <View style={SECTION_HEADER}>
          <Icon icon="shirt" size={20} color={colors.palette.primary500} />
          <Text style={SECTION_TITLE}>Garment Details</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Type</Text>
          <Text style={DETAIL_VALUE}>
            {styleConfig?.garmentType?.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Fabric</Text>
          <Text style={DETAIL_VALUE}>
            {fabricSelection?.type?.replace(/_/g, " ").toUpperCase()} - {fabricSelection?.color}
          </Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Quantity</Text>
          <Text style={DETAIL_VALUE}>{fabricSelection?.quantity} meters</Text>
        </View>

        {styleConfig?.embroideryStyle && (
          <View style={DETAIL_ROW}>
            <Text style={DETAIL_LABEL}>Embroidery</Text>
            <Text style={DETAIL_VALUE}>{styleConfig.embroideryStyle}</Text>
          </View>
        )}

        {styleConfig?.neckStyle && (
          <View style={DETAIL_ROW}>
            <Text style={DETAIL_LABEL}>Neck Style</Text>
            <Text style={DETAIL_VALUE}>{styleConfig.neckStyle}</Text>
          </View>
        )}

        {styleConfig?.matching && styleConfig.matching.length > 0 && (
          <View style={DETAIL_ROW}>
            <Text style={DETAIL_LABEL}>Matching</Text>
            <Text style={DETAIL_VALUE}>{styleConfig.matching.join(", ")}</Text>
          </View>
        )}

        {styleConfig?.specialInstructions && (
          <View style={HIGHLIGHT_BOX}>
            <Text style={HIGHLIGHT_TEXT}>
              Special Instructions: {styleConfig.specialInstructions}
            </Text>
          </View>
        )}
      </View>

      {/* Pricing Summary */}
      <View style={SECTION}>
        <View style={SECTION_HEADER}>
          <Icon icon="dollarSign" size={20} color={colors.palette.primary500} />
          <Text style={SECTION_TITLE}>Payment Summary</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Subtotal</Text>
          <Text style={DETAIL_VALUE}>{formatCurrency(pricing?.subtotal || 0)}</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>VAT (7.5%)</Text>
          <Text style={DETAIL_VALUE}>{formatCurrency(pricing?.tax || 0)}</Text>
        </View>

        <View style={DIVIDER} />

        <View style={DETAIL_ROW}>
          <Text style={[DETAIL_LABEL, { fontFamily: typography.primary.bold, fontSize: 16 }]}>
            Total Amount
          </Text>
          <Text
            style={[
              DETAIL_VALUE,
              {
                fontFamily: typography.primary.bold,
                fontSize: 18,
                color: colors.palette.primary500,
              },
            ]}
          >
            {formatCurrency(pricing?.totalAmount || 0)}
          </Text>
        </View>

        <View style={DIVIDER} />

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Deposit Required</Text>
          <Text style={DETAIL_VALUE}>{formatCurrency(pricing?.deposit || 0)}</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Balance on Delivery</Text>
          <Text style={DETAIL_VALUE}>{formatCurrency(pricing?.balance || 0)}</Text>
        </View>
      </View>

      {/* Delivery Information */}
      <View style={SECTION}>
        <View style={SECTION_HEADER}>
          <Icon icon="calendar" size={20} color={colors.palette.primary500} />
          <Text style={SECTION_TITLE}>Delivery Information</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Priority</Text>
          <Text style={DETAIL_VALUE}>{styleConfig?.priority?.toUpperCase()}</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Estimated Days</Text>
          <Text style={DETAIL_VALUE}>{styleConfig?.estimatedDays} working days</Text>
        </View>

        <View style={DETAIL_ROW}>
          <Text style={DETAIL_LABEL}>Expected Delivery</Text>
          <Text style={DETAIL_VALUE}>{getDeliveryDate()}</Text>
        </View>

        <View style={HIGHLIGHT_BOX}>
          <Text style={HIGHLIGHT_TEXT}>
            📍 Pickup Location: Victoria Island Branch{"\n"}
            📞 We'll call you for fitting appointments
          </Text>
        </View>
      </View>

      {/* Important Notes */}
      <View style={SECTION}>
        <View style={SECTION_HEADER}>
          <Icon icon="info" size={20} color={colors.palette.warning500} />
          <Text style={SECTION_TITLE}>Important Notes</Text>
        </View>

        <Text style={DETAIL_LABEL}>
          • Your order will be confirmed after deposit payment{"\n"}• Measurements will be taken at
          first fitting{"\n"}• You'll receive SMS updates on order progress{"\n"}• Alterations are
          free within 7 days of delivery{"\n"}• Please bring your receipt when collecting
        </Text>
      </View>
    </ScrollView>
  )
})
