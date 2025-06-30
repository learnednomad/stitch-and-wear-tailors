import React, { FC } from "react"
import { View, ScrollView, TouchableOpacity, ViewStyle, TextStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon, Text } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
import { useNavigation } from "@react-navigation/native"

interface PaymentMethod {
  id: string
  name: string
  lastFour: string
  type: "card" | "bank" | "wallet"
  isDefault: boolean
}

interface Transaction {
  id: string
  orderId: string
  amount: number
  date: string
  status: "completed" | "pending" | "failed"
  description: string
}

interface WalletScreenProps extends AppStackScreenProps<"Wallet"> {}

export const WalletScreen: FC<WalletScreenProps> = () => {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const navigation = useNavigation()

  // Mock data
  const balance = 250000
  const paymentMethods: PaymentMethod[] = [
    {
      id: "1",
      name: "Visa •••• 4242",
      lastFour: "4242",
      type: "card",
      isDefault: true,
    },
    {
      id: "2",
      name: "GTBank Account",
      lastFour: "8901",
      type: "bank",
      isDefault: false,
    },
    {
      id: "3",
      name: "Opay Wallet",
      lastFour: "0987",
      type: "wallet",
      isDefault: false,
    },
  ]

  const transactions: Transaction[] = [
    {
      id: "1",
      orderId: "TLR-2025-001",
      amount: 45000,
      date: "June 1, 2025",
      status: "completed",
      description: "Summer Kaftan Payment",
    },
    {
      id: "2",
      orderId: "TLR-2025-002",
      amount: 65000,
      date: "May 28, 2025",
      status: "completed",
      description: "Premium Agbada Payment",
    },
    {
      id: "3",
      orderId: "TLR-2025-003",
      amount: 32000,
      date: "May 25, 2025",
      status: "pending",
      description: "Traditional Dashiki Order",
    },
    {
      id: "4",
      orderId: "TLR-2025-004",
      amount: 18000,
      date: "May 20, 2025",
      status: "failed",
      description: "Casual Shirt Payment",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return colors.palette.success500
      case "pending":
        return colors.palette.warning500
      case "failed":
        return colors.palette.error500
      default:
        return colors.palette.neutral600
    }
  }

  const renderPaymentMethod = (method: PaymentMethod) => (
    <TouchableOpacity key={method.id} style={$paymentMethodCard}>
      <View style={$paymentMethodContent}>
        <View style={$paymentMethodIcon}>
          <Icon
            icon={method.type === "card" ? "check" : method.type === "bank" ? "menu" : "coins"}
            size={24}
            color={colors.palette.primary500}
          />
        </View>
        <View style={$paymentMethodInfo}>
          <Text style={$paymentMethodName}>{method.name}</Text>
          {method.isDefault && <Text style={$defaultBadge}>Default</Text>}
        </View>
        <Icon icon="caretRight" size={20} color={colors.palette.neutral400} />
      </View>
    </TouchableOpacity>
  )

  const renderTransaction = (transaction: Transaction) => (
    <TouchableOpacity key={transaction.id} style={$transactionCard}>
      <View style={$transactionContent}>
        <View style={$transactionLeft}>
          <View
            style={[
              $transactionIcon,
              { backgroundColor: getStatusColor(transaction.status) + "20" },
            ]}
          >
            <Icon
              icon={
                transaction.status === "completed"
                  ? "check"
                  : transaction.status === "pending"
                    ? "more"
                    : "x"
              }
              size={20}
              color={getStatusColor(transaction.status)}
            />
          </View>
          <View style={$transactionInfo}>
            <Text style={$transactionDescription}>{transaction.description}</Text>
            <Text style={$transactionOrderId}>Order #{transaction.orderId}</Text>
            <Text style={$transactionDate}>{transaction.date}</Text>
          </View>
        </View>
        <View style={$transactionRight}>
          <Text
            style={[
              $transactionAmount,
              {
                color:
                  transaction.status === "failed"
                    ? colors.palette.angry500
                    : colors.palette.neutral900,
              },
            ]}
          >
            ₦{transaction.amount.toLocaleString()}
          </Text>
          <View
            style={[$statusBadge, { backgroundColor: getStatusColor(transaction.status) + "20" }]}
          >
            <Text style={[$statusText, { color: getStatusColor(transaction.status) }]}>
              {transaction.status}
            </Text>
          </View>
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
          <Text style={$headerTitle}>Wallet</Text>
          <TouchableOpacity style={$headerAction}>
            <Icon icon="settings" size={24} color={colors.palette.neutral600} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={$balanceCard}>
          <View style={$balanceHeader}>
            <Text style={$balanceLabel}>Available Balance</Text>
            <TouchableOpacity style={$eyeButton}>
              <Icon icon="view" size={20} color={colors.palette.neutral100} />
            </TouchableOpacity>
          </View>
          <Text style={$balanceAmount}>₦{balance.toLocaleString()}</Text>
          <Text style={$balanceSubtext}>Last updated: Today, 2:08 PM</Text>
          <View style={$balanceActions}>
            <TouchableOpacity style={$balanceActionButton}>
              <Icon icon="check" size={20} color={colors.palette.neutral100} />
              <Text style={$balanceActionText}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[$balanceActionButton, $secondaryActionButton]}>
              <Icon icon="caretLeft" size={20} color={colors.palette.primary500} />
              <Text style={[$balanceActionText, $secondaryActionText]}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={$statsContainer}>
          <View style={$statCard}>
            <Text style={$statValue}>₦125,000</Text>
            <Text style={$statLabel}>This Month</Text>
            <Icon icon="caretRight" size={16} color={colors.palette.success500} />
          </View>
          <View style={$statCard}>
            <Text style={$statValue}>₦8,500</Text>
            <Text style={$statLabel}>Pending</Text>
            <Icon icon="more" size={16} color={colors.palette.warning500} />
          </View>
          <View style={$statCard}>
            <Text style={$statValue}>47</Text>
            <Text style={$statLabel}>Transactions</Text>
            <Icon icon="menu" size={16} color={colors.palette.primary500} />
          </View>
        </View>

        {/* Payment Methods */}
        <View style={$section}>
          <View style={$sectionHeader}>
            <Text style={$sectionTitle}>Payment Methods</Text>
            <TouchableOpacity>
              <Text style={$addText}>Add New</Text>
            </TouchableOpacity>
          </View>
          {paymentMethods.map(renderPaymentMethod)}
        </View>

        {/* Recent Transactions */}
        <View style={$section}>
          <View style={$sectionHeader}>
            <Text style={$sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={$viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {transactions.map(renderTransaction)}
        </View>
      </ScrollView>
    </Screen>
  )
}

// Styles
const $container: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
}

const $headerTitle: TextStyle = {
  fontSize: 25,
  fontWeight: "500",
  color: colors.palette.neutral900,
}

const $headerAction: ViewStyle = {
  padding: spacing.xs,
}

const $balanceCard: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  marginHorizontal: spacing.lg,
  marginBottom: spacing.lg,
  padding: spacing.lg,
  borderRadius: 20,
  shadowColor: colors.palette.primary900,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.2,
  shadowRadius: 16,
  elevation: 10,
}

const $balanceHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
}

const $balanceLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral100,
  opacity: 0.9,
}

const $eyeButton: ViewStyle = {
  padding: spacing.xs,
}

const $balanceAmount: TextStyle = {
  fontSize: 24,
  fontWeight: "800",
  color: colors.palette.neutral100,
  marginVertical: spacing.xs,
  letterSpacing: 0.5,
}

const $balanceSubtext: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral100,
  opacity: 0.8,
  marginBottom: spacing.lg,
}

const $balanceActions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $balanceActionButton: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  paddingVertical: spacing.sm,
  borderRadius: 8,
  gap: spacing.xs,
}

const $secondaryActionButton: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
}

const $balanceActionText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

const $secondaryActionText: TextStyle = {
  color: colors.palette.primary500,
}

const $statsContainer: ViewStyle = {
  flexDirection: "row",
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.lg,
  gap: spacing.sm,
}

const $statCard: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.neutral100,
  padding: spacing.md,
  borderRadius: 12,
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
}

const $statValue: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.neutral900,
  marginBottom: spacing.xxs,
}

const $statLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.xs,
}

const $section: ViewStyle = {
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.lg,
}

const $sectionHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $sectionTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $addText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.primary500,
}

const $viewAllText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
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

const $paymentMethodContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $paymentMethodIcon: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.palette.primary100,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.md,
}

const $paymentMethodInfo: ViewStyle = {
  flex: 1,
}

const $paymentMethodName: TextStyle = {
  fontSize: 16,
  fontWeight: "500",
  color: colors.palette.neutral900,
  marginBottom: spacing.xxs,
}

const $defaultBadge: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  color: colors.palette.success500,
}

const $transactionCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
}

const $transactionContent: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $transactionLeft: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
}

const $transactionIcon: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.md,
}

const $transactionInfo: ViewStyle = {
  flex: 1,
}

const $transactionDescription: TextStyle = {
  fontSize: 16,
  fontWeight: "500",
  color: colors.palette.neutral900,
  marginBottom: spacing.xxs,
}

const $transactionOrderId: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  marginBottom: spacing.xxs,
}

const $transactionDate: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
}

const $transactionRight: ViewStyle = {
  alignItems: "flex-end",
}

const $transactionAmount: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 4,
}

const $statusText: TextStyle = {
  fontSize: 11,
  fontWeight: "600",
  textTransform: "capitalize",
}
