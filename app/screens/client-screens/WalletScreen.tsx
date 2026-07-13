import React, { FC } from "react"
import { View, ScrollView, TouchableOpacity, ViewStyle } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackParamList } from "@/navigators"
import { Button, Screen, Icon, Text } from "@/components"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { colors } from "@/theme"
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

interface WalletScreenProps extends NativeStackScreenProps<AppStackParamList> {}

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
    <TouchableOpacity
      key={method.id}
      className="mb-3 rounded-xl border border-neutral200 bg-neutral100 p-4"
    >
      <View className="flex-row items-center">
        <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-primary100">
          <Icon
            icon={method.type === "card" ? "check" : method.type === "bank" ? "menu" : "coins"}
            size={24}
            color={colors.palette.primary500}
          />
        </View>
        <View className="flex-1">
          <Text
            className="mb-0.5 text-[16px] font-medium"
            style={{ color: colors.palette.neutral900 }}
          >
            {method.name}
          </Text>
          {method.isDefault && (
            <Text className="text-[12px] font-medium" style={{ color: colors.palette.success500 }}>
              Default
            </Text>
          )}
        </View>
        <Icon icon="caretRight" size={20} color={colors.palette.neutral400} />
      </View>
    </TouchableOpacity>
  )

  const renderTransaction = (transaction: Transaction) => (
    <TouchableOpacity
      key={transaction.id}
      className="mb-3 rounded-2xl border border-neutral200 bg-neutral100 p-4"
      style={$transactionCardShadow}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <View
            className="mr-4 h-11 w-11 items-center justify-center rounded-[22px]"
            style={{ backgroundColor: getStatusColor(transaction.status) + "20" }}
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
          <View className="flex-1">
            <Text
              className="mb-0.5 text-[16px] font-medium"
              style={{ color: colors.palette.neutral900 }}
            >
              {transaction.description}
            </Text>
            <Text className="mb-0.5 text-[13px]" style={{ color: colors.palette.neutral600 }}>
              Order #{transaction.orderId}
            </Text>
            <Text className="text-[12px]" style={{ color: colors.palette.neutral500 }}>
              {transaction.date}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text
            className="mb-2 text-[16px] font-semibold"
            style={{
              color:
                transaction.status === "failed"
                  ? colors.palette.angry500
                  : colors.palette.neutral900,
            }}
          >
            ₦{transaction.amount.toLocaleString()}
          </Text>
          <View
            className="rounded px-2 py-0.5"
            style={{ backgroundColor: getStatusColor(transaction.status) + "20" }}
          >
            <Text
              className="text-[11px] font-semibold capitalize"
              style={{ color: getStatusColor(transaction.status) }}
            >
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
        <View className="flex-row items-center justify-between px-6 py-6">
          <Text className="text-[25px] font-medium" style={{ color: colors.palette.neutral900 }}>
            Wallet
          </Text>
          <TouchableOpacity className="p-2">
            <Icon icon="settings" size={24} color={colors.palette.neutral600} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View className="mx-6 mb-6 rounded-[20px] bg-primary500 p-6" style={$balanceCardShadow}>
          <View className="mb-2 flex-row items-center justify-between">
            <Text
              className="text-[14px]"
              style={{ color: colors.palette.neutral100, opacity: 0.9 }}
            >
              Available Balance
            </Text>
            <TouchableOpacity className="p-2">
              <Icon icon="view" size={20} color={colors.palette.neutral100} />
            </TouchableOpacity>
          </View>
          <Text
            className="my-2 text-[24px] font-extrabold tracking-[0.5px]"
            style={{ color: colors.palette.neutral100 }}
          >
            ₦{balance.toLocaleString()}
          </Text>
          <Text
            className="mb-6 text-[12px]"
            style={{ color: colors.palette.neutral100, opacity: 0.8 }}
          >
            Last updated: Today, 2:08 PM
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-2 rounded-lg py-3"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
            >
              <Icon icon="check" size={20} color={colors.palette.neutral100} />
              <Text
                className="text-[14px] font-semibold"
                style={{ color: colors.palette.neutral100 }}
              >
                Add Money
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-neutral100 py-3">
              <Icon icon="caretLeft" size={20} color={colors.palette.primary500} />
              <Text
                className="text-[14px] font-semibold"
                style={{ color: colors.palette.primary500 }}
              >
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="mb-6 flex-row gap-3 px-6">
          <View
            className="flex-1 items-center rounded-xl border border-neutral200 bg-neutral100 p-4"
            style={$statCardShadow}
          >
            <Text
              className="mb-0.5 text-[16px] font-bold"
              style={{ color: colors.palette.neutral900 }}
            >
              ₦125,000
            </Text>
            <Text className="mb-2 text-[12px]" style={{ color: colors.palette.neutral600 }}>
              This Month
            </Text>
            <Icon icon="caretRight" size={16} color={colors.palette.success500} />
          </View>
          <View
            className="flex-1 items-center rounded-xl border border-neutral200 bg-neutral100 p-4"
            style={$statCardShadow}
          >
            <Text
              className="mb-0.5 text-[16px] font-bold"
              style={{ color: colors.palette.neutral900 }}
            >
              ₦8,500
            </Text>
            <Text className="mb-2 text-[12px]" style={{ color: colors.palette.neutral600 }}>
              Pending
            </Text>
            <Icon icon="more" size={16} color={colors.palette.warning500} />
          </View>
          <View
            className="flex-1 items-center rounded-xl border border-neutral200 bg-neutral100 p-4"
            style={$statCardShadow}
          >
            <Text
              className="mb-0.5 text-[16px] font-bold"
              style={{ color: colors.palette.neutral900 }}
            >
              47
            </Text>
            <Text className="mb-2 text-[12px]" style={{ color: colors.palette.neutral600 }}>
              Transactions
            </Text>
            <Icon icon="menu" size={16} color={colors.palette.primary500} />
          </View>
        </View>

        {/* Payment Methods */}
        <View className="mb-6 px-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[18px] font-semibold" style={{ color: colors.palette.neutral900 }}>
              Payment Methods
            </Text>
            <TouchableOpacity>
              <Text
                className="text-[14px] font-medium"
                style={{ color: colors.palette.primary500 }}
              >
                Add New
              </Text>
            </TouchableOpacity>
          </View>
          {paymentMethods.map(renderPaymentMethod)}
        </View>

        {/* Recent Transactions */}
        <View className="mb-6 px-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[18px] font-semibold" style={{ color: colors.palette.neutral900 }}>
              Recent Transactions
            </Text>
            <TouchableOpacity>
              <Text
                className="text-[14px] font-medium"
                style={{ color: colors.palette.primary500 }}
              >
                View All
              </Text>
            </TouchableOpacity>
          </View>
          {transactions.map(renderTransaction)}
        </View>
      </ScrollView>
    </Screen>
  )
}

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// inline (light in both schemes) — no `dark:` variants. Layout, spacing, and
// solid-token container backgrounds/borders are className token utilities. RN
// shadows and data-driven status tints stay inline.
const $container: ViewStyle = {
  flex: 1,
}

// RN shadow objects — kept inline (no className equivalent for iOS shadows).
const $balanceCardShadow: ViewStyle = {
  shadowColor: colors.palette.primary900,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.2,
  shadowRadius: 16,
  elevation: 10,
}

const $statCardShadow: ViewStyle = {
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
}

const $transactionCardShadow: ViewStyle = {
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
}
