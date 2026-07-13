import { FC, useEffect, useMemo, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native"
import { observer } from "mobx-react-lite"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon, Button, RecordPaymentModal } from "@/components"
import { colors, spacing } from "@/theme"
import { errorMessage } from "@/api/common"
import {
  useInvoice,
  useInvoiceOrder,
  useOrderItemsForOrders,
  usePaymentsByOrder,
  useUpdateInvoiceStatus,
} from "@/api/invoices"
import { formatMoney } from "@/services/api/invoice-api"
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  customerDisplayName,
  nameMapFromOrderItems,
} from "./invoicing-shared"

// Screen's fixed preset gives its inner container no height; without flex the
// scrollable invoice body collapses to zero height.
const $screenContent = { flex: 1 } as const

interface InvoiceDetailScreenProps extends AppStackScreenProps<"InvoiceDetail"> {}

/**
 * Full invoice view with payment history and tailor actions (record a
 * payment, mark a draft as sent, void). Money-state transitions
 * (partially_paid/paid) happen server-side from payments.
 */
export const InvoiceDetailScreen: FC<InvoiceDetailScreenProps> = observer(
  function InvoiceDetailScreen({ route }) {
    const navigation = useNavigation<any>()
    const { invoiceId } = route.params

    const [showPaymentModal, setShowPaymentModal] = useState(false)

    const invoiceQuery = useInvoice(invoiceId)
    const invoice = invoiceQuery.data ?? null

    // Fresh order money fields + payment history — dependent on the invoice
    const orderQuery = useInvoiceOrder(invoice?.order)
    const paymentsQuery = usePaymentsByOrder(invoice?.order)
    const order = orderQuery.data ?? null
    const payments = paymentsQuery.data ?? []

    // Customer user records are usually not readable by tailors, so fall
    // back to the name in the order's order_items specifications JSON —
    // a dependent query enabled only when the expanded customer is unnamed.
    const needsNameFallback =
      !!invoice && !invoice.expand?.customer?.name && !invoice.expand?.customer?.firstName
    const orderItemsQuery = useOrderItemsForOrders(
      needsNameFallback && invoice ? [invoice.order] : [],
    )
    const nameMap = useMemo(() => {
      if (!invoice || !orderItemsQuery.data) return {}
      return nameMapFromOrderItems(orderItemsQuery.data, { [invoice.order]: invoice.customer })
    }, [invoice, orderItemsQuery.data])

    const updateStatus = useUpdateInvoiceStatus()

    // The original screen alerted when the invoice failed to load
    useEffect(() => {
      if (invoiceQuery.error) {
        Alert.alert("Error", errorMessage(invoiceQuery.error) || "Failed to load invoice")
      }
    }, [invoiceQuery.error])

    const isLoading = invoiceQuery.isLoading
    const isRefreshing =
      invoiceQuery.isRefetching || orderQuery.isRefetching || paymentsQuery.isRefetching

    const refetchAll = () => {
      invoiceQuery.refetch()
      orderQuery.refetch()
      paymentsQuery.refetch()
    }

    const handleMarkSent = () => {
      updateStatus.mutate(
        { invoiceId, status: "sent" },
        {
          onError: (error) =>
            Alert.alert("Update Failed", errorMessage(error) || "Could not update the invoice."),
        },
      )
    }

    const handleVoid = () => {
      Alert.alert("Void Invoice", "Void this invoice? This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Void",
          style: "destructive",
          onPress: () =>
            updateStatus.mutate(
              { invoiceId, status: "void" },
              {
                onError: (error) =>
                  Alert.alert("Void Failed", errorMessage(error) || "Could not void the invoice."),
              },
            ),
        },
      ])
    }

    const statusPalette = STATUS_COLORS[invoice?.status ?? "draft"] ?? STATUS_COLORS.draft
    const lineItems = invoice?.lineItems ?? []
    const canRecordPayment =
      invoice && !["paid", "void"].includes(invoice.status) && (order?.balanceAmount ?? 0) >= 0
    const paidAmount = (order?.totalAmount ?? 0) - (order?.balanceAmount ?? 0)

    return (
      <Screen
        backgroundColor={colors.palette.neutral100}
        safeAreaEdges={["top"]}
        preset="fixed"
        statusBarStyle="dark"
        contentContainerStyle={$screenContent}
      >
        {/* Header */}
        <View className="flex-row items-center px-6 py-4 border-b border-neutral200">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center"
            onPress={() => navigation.goBack()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={colors.palette.neutral900} />
          </TouchableOpacity>
          <Text className="flex-1 text-[18px] text-center" weight="semiBold" style={$headerTitleColor}>
            {invoice?.invoiceNumber ?? "Invoice"}
          </Text>
          <View className="w-10" />
        </View>

        {isLoading || !invoice ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            style={$container}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refetchAll}
                tintColor={colors.accent}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Receipt-style summary card */}
            <View className="px-6 pt-6">
              <View className="rounded-xl border border-neutral200 bg-neutral100 p-4">
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="text-[18px]" weight="bold" style={$invoiceNumberColor}>
                      {invoice.invoiceNumber}
                    </Text>
                    <Text className="text-[13px] mt-0.5" style={$summaryMetaColor}>
                      Issued {formatDate(invoice.issuedAt)}
                    </Text>
                    <Text className="text-[13px] mt-0.5" style={$summaryMetaColor}>
                      Due {formatDate(invoice.dueAt)}
                    </Text>
                  </View>
                  <View className="py-1 px-3 rounded-xl" style={{ backgroundColor: statusPalette.bg }}>
                    <Text className="text-[12px]" weight="semiBold" style={{ color: statusPalette.text }}>
                      {STATUS_LABELS[invoice.status] ?? invoice.status}
                    </Text>
                  </View>
                </View>

                <View className="h-px bg-neutral200 my-4" />

                {/* Parties */}
                <View className="flex-row">
                  <View className="flex-1">
                    <Text className="text-[12px] uppercase mb-0.5" weight="semiBold" style={$partyLabelColor}>
                      Billed To
                    </Text>
                    <Text className="text-[15px]" weight="semiBold" style={$partyNameColor}>
                      {customerDisplayName(invoice, nameMap)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[12px] uppercase mb-0.5" weight="semiBold" style={$partyLabelColor}>
                      Order
                    </Text>
                    <Text className="text-[15px]" weight="semiBold" style={$partyNameColor}>
                      {invoice.expand?.order?.orderNumber ?? order?.orderNumber ?? invoice.order}
                    </Text>
                  </View>
                </View>

                <View className="h-px bg-neutral200 my-4" />

                {/* Line items table */}
                <View className="flex-row mb-2">
                  <Text className="text-[12px] uppercase" weight="semiBold" style={[$lineItemHeaderColor, $descCol]}>
                    Description
                  </Text>
                  <Text className="text-[12px] uppercase" weight="semiBold" style={[$lineItemHeaderColor, $qtyCol]}>
                    Qty
                  </Text>
                  <Text className="text-[12px] uppercase" weight="semiBold" style={[$lineItemHeaderColor, $amountCol]}>
                    Amount
                  </Text>
                </View>
                {lineItems.map((item, index) => (
                  <View key={index} className="flex-row py-2">
                    <Text className="text-[14px]" style={[$lineItemTextColor, $descCol]}>
                      {item.description}
                    </Text>
                    <Text className="text-[14px]" style={[$lineItemTextColor, $qtyCol]}>
                      {item.quantity}
                    </Text>
                    <Text className="text-[14px]" style={[$lineItemTextColor, $amountCol]}>
                      {formatMoney(item.quantity * item.amount, invoice.currency)}
                    </Text>
                  </View>
                ))}

                <View className="h-px bg-neutral200 my-4" />

                {/* Totals */}
                <View className="flex-row justify-between py-[3px]">
                  <Text className="text-[14px]" style={$totalLabelColor}>
                    Subtotal
                  </Text>
                  <Text className="text-[14px]" weight="semiBold" style={$totalValueColor}>
                    {formatMoney(invoice.subtotal, invoice.currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-[3px]">
                  <Text className="text-[14px]" style={$totalLabelColor}>
                    Deposit required
                  </Text>
                  <Text className="text-[14px]" weight="semiBold" style={$totalValueColor}>
                    {formatMoney(invoice.depositRequired, invoice.currency)}
                  </Text>
                </View>
                {order && (
                  <>
                    <View className="flex-row justify-between py-[3px]">
                      <Text className="text-[14px]" style={$totalLabelColor}>
                        Paid so far
                      </Text>
                      <Text className="text-[14px]" weight="semiBold" style={$totalValueColor}>
                        {formatMoney(paidAmount, invoice.currency)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-[3px]">
                      <Text className="text-[15px]" weight="bold" style={$balanceLabelColor}>
                        Balance due
                      </Text>
                      <Text className="text-[16px]" weight="bold" style={$balanceValueColor}>
                        {formatMoney(order.balanceAmount ?? 0, invoice.currency)}
                      </Text>
                    </View>
                  </>
                )}

                {!!invoice.notes && (
                  <>
                    <View className="h-px bg-neutral200 my-4" />
                    <Text className="text-[12px] uppercase mb-0.5" weight="semiBold" style={$partyLabelColor}>
                      Notes
                    </Text>
                    <Text className="text-[14px] leading-5" style={$notesTextColor}>
                      {invoice.notes}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Payment history */}
            <View className="px-6 pt-6">
              <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
                Payments
              </Text>
              {payments.length === 0 ? (
                <Text className="text-[13px] leading-[18px]" style={$emptyTextColor}>
                  No payments recorded for this order yet.
                </Text>
              ) : (
                payments.map((payment) => (
                  <View key={payment.id} className="flex-row items-center rounded-xl border border-neutral200 bg-neutral100 p-4 mb-3">
                    <View className="flex-1">
                      <Text className="text-[15px]" weight="semiBold" style={$paymentAmountColor}>
                        {formatMoney(payment.amount, payment.currency)}
                      </Text>
                      <Text className="text-[13px] mt-0.5 capitalize" style={$paymentMetaColor}>
                        {payment.paymentType.replace("_", " ")} · {payment.method.replace("_", " ")}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </Text>
                    </View>
                    <Text
                      className="text-[12px] capitalize"
                      weight="semiBold"
                      style={
                        payment.status === "confirmed"
                          ? $paymentConfirmed
                          : payment.status === "rejected"
                            ? $paymentRejected
                            : $paymentPending
                      }
                    >
                      {payment.status.replace("_", " ")}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Actions */}
            <View className="px-6 pt-6">
              {canRecordPayment && (
                <Button
                  text="Record Payment"
                  style={$primaryButton}
                  textStyle={$primaryButtonText}
                  onPress={() => setShowPaymentModal(true)}
                />
              )}
              {invoice.status === "draft" && (
                <Button
                  text="Mark as Sent"
                  style={$secondaryButton}
                  textStyle={$secondaryButtonText}
                  onPress={handleMarkSent}
                />
              )}
              {!["void", "paid"].includes(invoice.status) && (
                <TouchableOpacity className="items-center py-3" onPress={handleVoid}>
                  <Text className="text-[14px]" weight="semiBold" style={$voidButtonTextColor}>
                    Void Invoice
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View className="h-12" />
          </ScrollView>
        )}

        {/* Record payment sheet */}
        <RecordPaymentModal
          visible={showPaymentModal}
          order={
            order
              ? {
                  id: order.id,
                  orderNumber: order.orderNumber,
                  balanceAmount: order.balanceAmount,
                  depositAmount: order.depositAmount,
                  currency: order.currency,
                }
              : null
          }
          onClose={() => setShowPaymentModal(false)}
          onDone={refetchAll}
        />
      </Screen>
    )
  },
)

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities. Data-driven
// status-chip and payment-status colors, the flex-ratio line-item columns, the
// flex ScrollView style, and Button style overrides stay inline.
const $container: ViewStyle = {
  flex: 1,
}

// Flex-ratio line-item columns stay inline (RN `flex: n` semantics).
const $descCol: TextStyle = {
  flex: 3,
}

const $qtyCol: TextStyle = {
  flex: 1,
  textAlign: "center",
}

const $amountCol: TextStyle = {
  flex: 2,
  textAlign: "right",
}

// Data-driven payment-status colors stay inline (conditional style).
const $paymentConfirmed: TextStyle = {
  color: colors.palette.success500,
}

const $paymentRejected: TextStyle = {
  color: colors.palette.error500,
}

const $paymentPending: TextStyle = {
  color: colors.palette.warning600,
}

// Button style overrides stay inline (Button owns its className).
const $primaryButton: ViewStyle = {
  backgroundColor: colors.accent,
  borderRadius: 12,
  marginBottom: spacing.sm,
}

const $primaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

const $secondaryButton: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.palette.primary500,
  marginBottom: spacing.sm,
}

const $secondaryButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.accent,
}

// Text color overrides (static, light-only).
const $headerTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $sectionTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $invoiceNumberColor: TextStyle = { color: colors.palette.neutral900 }
const $summaryMetaColor: TextStyle = { color: colors.textDim }
const $partyLabelColor: TextStyle = { color: colors.textDim }
const $partyNameColor: TextStyle = { color: colors.palette.neutral900 }
const $lineItemHeaderColor: TextStyle = { color: colors.textDim }
const $lineItemTextColor: TextStyle = { color: colors.palette.neutral900 }
const $totalLabelColor: TextStyle = { color: colors.textDim }
const $totalValueColor: TextStyle = { color: colors.palette.neutral900 }
const $balanceLabelColor: TextStyle = { color: colors.palette.neutral900 }
const $balanceValueColor: TextStyle = { color: colors.accent }
const $notesTextColor: TextStyle = { color: colors.palette.neutral900 }
const $paymentAmountColor: TextStyle = { color: colors.palette.neutral900 }
const $paymentMetaColor: TextStyle = { color: colors.textDim }
const $voidButtonTextColor: TextStyle = { color: colors.palette.error500 }
const $emptyTextColor: TextStyle = { color: colors.textDim }
