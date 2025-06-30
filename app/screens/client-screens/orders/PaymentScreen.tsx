import React, { FC, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Alert,
} from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon, Text } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
import { useNavigation } from "@react-navigation/native"

interface PaymentMethod {
  id: string
  name: string
  icon: string
  description: string
}

interface PaymentScreenProps extends AppStackScreenProps<"Payment"> {}

export const PaymentScreen: FC<PaymentScreenProps> = ({ route }) => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")

  // Extract order details from route params
  const { orderId, amount, orderDetails } = route?.params || {
    orderId: "TLR-2025-001",
    amount: 45000,
    orderDetails: {
      measurementName: "Summer Kaftan",
      status: "Ready for Payment",
      dueDate: "June 10, 2025",
    },
  }

  const paymentMethods: PaymentMethod[] = [
    {
      id: "card",
      name: "Credit/Debit Card",
      icon: "credit-card",
      description: "Pay securely with your card",
    },
    {
      id: "bank",
      name: "Bank Transfer",
      icon: "building-2",
      description: "Direct bank transfer",
    },
    {
      id: "cash",
      name: "Cash on Delivery",
      icon: "banknote",
      description: "Pay when you receive your order",
    },
    {
      id: "wallet",
      name: "Mobile Wallet",
      icon: "smartphone",
      description: "Pay with mobile money",
    },
  ]

  const handlePayment = () => {
    if (!selectedPaymentMethod) {
      Alert.alert("Please Select Payment Method", "Choose a payment method to continue")
      return
    }

    // Simulate payment processing
    Alert.alert(
      "Payment Confirmation",
      `Process payment of ₦${amount.toLocaleString()} for Order #${orderId}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            // Navigate to success screen or back to orders
            Alert.alert("Payment Successful", "Your payment has been processed successfully", [
              { text: "OK", onPress: () => navigation.navigate("Orders" as never) },
            ])
          },
        },
      ],
    )
  }

  const renderPaymentMethod = (method: PaymentMethod) => (
    <TouchableOpacity
      key={method.id}
      style={[
        $paymentMethodCard,
        selectedPaymentMethod === method.id && $selectedPaymentMethod,
      ]}
      onPress={() => setSelectedPaymentMethod(method.id)}
      accessible
      accessibilityLabel={`Select ${method.name}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: selectedPaymentMethod === method.id }}
    >
      <View style={$paymentMethodContent}>
        <View
          style={[
            $iconContainer,
            selectedPaymentMethod === method.id && $selectedIconContainer,
          ]}
        >
          <Icon
            icon={method.icon}
            size={24}
            color={
              selectedPaymentMethod === method.id
                ? colors.palette.primary500
                : colors.palette.neutral600
            }
          />
        </View>
        <View style={$paymentMethodInfo}>
          <Text style={$paymentMethodName}>{method.name}</Text>
          <Text style={$paymentMethodDescription}>{method.description}</Text>
        </View>
        <View
          style={[
            $radioButton,
            selectedPaymentMethod === method.id && $radioButtonSelected,
          ]}
        >
          {selectedPaymentMethod === method.id && (
            <View style={$radioButtonInner} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  )

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
            <Icon icon="arrow-left" size={24} color={colors.palette.neutral900} />
          </TouchableOpacity>
          <Text style={$headerTitle}>Payment</Text>
          <View style={$headerSpacer} />
        </View>

        {/* Order Summary */}
        <View style={$section}>
          <Text style={$sectionTitle}>Order Summary</Text>
          <View style={$orderSummaryCard}>
            <View style={$orderRow}>
              <Text style={$orderLabel}>Order ID</Text>
              <Text style={$orderValue}>#{orderId}</Text>
            </View>
            <View style={$orderRow}>
              <Text style={$orderLabel}>Item</Text>
              <Text style={$orderValue}>{orderDetails.measurementName}</Text>
            </View>
            <View style={$orderRow}>
              <Text style={$orderLabel}>Due Date</Text>
              <Text style={$orderValue}>{orderDetails.dueDate}</Text>
            </View>
            <View style={$divider} />
            <View style={$orderRow}>
              <Text style={$totalLabel}>Total Amount</Text>
              <Text style={$totalValue}>₦{amount.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={$section}>
          <Text style={$sectionTitle}>Select Payment Method</Text>
          {paymentMethods.map(renderPaymentMethod)}
        </View>

        {/* Payment Note */}
        <View style={$noteContainer}>
          <Icon icon="info" size={20} color={colors.palette.primary500} />
          <Text style={$noteText}>
            Your payment information is secure and encrypted. We never store your card details.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[$bottomContainer, $bottomContainerInsets]}>
        <View style={$totalContainer}>
          <Text style={$totalText}>Total to Pay</Text>
          <Text style={$totalAmount}>₦{amount.toLocaleString()}</Text>
        </View>
        <Button
          text="Proceed to Pay"
          style={$payButton}
          textStyle={$payButtonText}
          onPress={handlePayment}
          disabled={!selectedPaymentMethod}
        />
      </View>
    </Screen>
  )
}

// Styles
const $container: ViewStyle = {
  flex: 1,
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
}

const $orderRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: spacing.sm,
}

const $orderLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
}

const $orderValue: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral900,
}

const $divider: ViewStyle = {
  height: 1,
  backgroundColor: colors.palette.neutral200,
  marginVertical: spacing.md,
}

const $totalLabel: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $totalValue: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.primary500,
}

const $paymentMethodCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
}

const $selectedPaymentMethod: ViewStyle = {
  borderColor: colors.palette.primary500,
  borderWidth: 2,
}

const $paymentMethodContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $iconContainer: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.md,
}

const $selectedIconContainer: ViewStyle = {
  backgroundColor: colors.palette.primary100,
}

const $paymentMethodInfo: ViewStyle = {
  flex: 1,
}

const $paymentMethodName: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xxs,
}

const $paymentMethodDescription: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
}

const $radioButton: ViewStyle = {
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.palette.neutral300,
  justifyContent: "center",
  alignItems: "center",
}

const $radioButtonSelected: ViewStyle = {
  borderColor: colors.palette.primary500,
}

const $radioButtonInner: ViewStyle = {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: colors.palette.primary500,
}

const $noteContainer: ViewStyle = {
  flexDirection: "row",
  marginHorizontal: spacing.lg,
  marginBottom: spacing.lg,
  padding: spacing.md,
  backgroundColor: colors.palette.primary100,
  borderRadius: 8,
  alignItems: "flex-start",
}

const $noteText: TextStyle = {
  flex: 1,
  fontSize: 13,
  color: colors.palette.primary700,
  marginLeft: spacing.sm,
  lineHeight: 18,
}

const $bottomContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.md,
  backgroundColor: colors.palette.neutral100,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
}

const $totalContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $totalText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
}

const $totalAmount: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: colors.palette.neutral900,
}

const $payButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  paddingVertical: spacing.md,
  shadowColor: colors.palette.primary900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
}

const $payButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}
