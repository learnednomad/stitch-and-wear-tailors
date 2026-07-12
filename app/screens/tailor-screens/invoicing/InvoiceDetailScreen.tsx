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
          <Text style={$headerTitle}>{invoice?.invoiceNumber ?? "Invoice"}</Text>
          <View style={$headerSpacer} />
        </View>

        {isLoading || !invoice ? (
          <View style={$loadingContainer}>
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
            <View style={$section}>
              <View style={$summaryCard}>
                <View style={$summaryTopRow}>
                  <View>
                    <Text style={$invoiceNumber}>{invoice.invoiceNumber}</Text>
                    <Text style={$summaryMeta}>Issued {formatDate(invoice.issuedAt)}</Text>
                    <Text style={$summaryMeta}>Due {formatDate(invoice.dueAt)}</Text>
                  </View>
                  <View style={[$statusChip, { backgroundColor: statusPalette.bg }]}>
                    <Text style={[$statusChipText, { color: statusPalette.text }]}>
                      {STATUS_LABELS[invoice.status] ?? invoice.status}
                    </Text>
                  </View>
                </View>

                <View style={$divider} />

                {/* Parties */}
                <View style={$partyRow}>
                  <View style={$party}>
                    <Text style={$partyLabel}>Billed To</Text>
                    <Text style={$partyName}>{customerDisplayName(invoice, nameMap)}</Text>
                  </View>
                  <View style={$party}>
                    <Text style={$partyLabel}>Order</Text>
                    <Text style={$partyName}>
                      {invoice.expand?.order?.orderNumber ?? order?.orderNumber ?? invoice.order}
                    </Text>
                  </View>
                </View>

                <View style={$divider} />

                {/* Line items table */}
                <View style={$lineItemHeaderRow}>
                  <Text style={[$lineItemHeaderText, $descCol]}>Description</Text>
                  <Text style={[$lineItemHeaderText, $qtyCol]}>Qty</Text>
                  <Text style={[$lineItemHeaderText, $amountCol]}>Amount</Text>
                </View>
                {lineItems.map((item, index) => (
                  <View key={index} style={$lineItemRow}>
                    <Text style={[$lineItemText, $descCol]}>{item.description}</Text>
                    <Text style={[$lineItemText, $qtyCol]}>{item.quantity}</Text>
                    <Text style={[$lineItemText, $amountCol]}>
                      {formatMoney(item.quantity * item.amount, invoice.currency)}
                    </Text>
                  </View>
                ))}

                <View style={$divider} />

                {/* Totals */}
                <View style={$totalRow}>
                  <Text style={$totalLabel}>Subtotal</Text>
                  <Text style={$totalValue}>{formatMoney(invoice.subtotal, invoice.currency)}</Text>
                </View>
                <View style={$totalRow}>
                  <Text style={$totalLabel}>Deposit required</Text>
                  <Text style={$totalValue}>
                    {formatMoney(invoice.depositRequired, invoice.currency)}
                  </Text>
                </View>
                {order && (
                  <>
                    <View style={$totalRow}>
                      <Text style={$totalLabel}>Paid so far</Text>
                      <Text style={$totalValue}>{formatMoney(paidAmount, invoice.currency)}</Text>
                    </View>
                    <View style={$totalRow}>
                      <Text style={$balanceLabel}>Balance due</Text>
                      <Text style={$balanceValue}>
                        {formatMoney(order.balanceAmount ?? 0, invoice.currency)}
                      </Text>
                    </View>
                  </>
                )}

                {!!invoice.notes && (
                  <>
                    <View style={$divider} />
                    <Text style={$partyLabel}>Notes</Text>
                    <Text style={$notesText}>{invoice.notes}</Text>
                  </>
                )}
              </View>
            </View>

            {/* Payment history */}
            <View style={$section}>
              <Text style={$sectionTitle}>Payments</Text>
              {payments.length === 0 ? (
                <Text style={$emptyText}>No payments recorded for this order yet.</Text>
              ) : (
                payments.map((payment) => (
                  <View key={payment.id} style={$paymentRow}>
                    <View style={$paymentInfo}>
                      <Text style={$paymentAmount}>
                        {formatMoney(payment.amount, payment.currency)}
                      </Text>
                      <Text style={$paymentMeta}>
                        {payment.paymentType.replace("_", " ")} · {payment.method.replace("_", " ")}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </Text>
                    </View>
                    <Text
                      style={[
                        $paymentStatus,
                        payment.status === "confirmed"
                          ? $paymentConfirmed
                          : payment.status === "rejected"
                            ? $paymentRejected
                            : $paymentPending,
                      ]}
                    >
                      {payment.status.replace("_", " ")}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Actions */}
            <View style={$section}>
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
                <TouchableOpacity style={$voidButton} onPress={handleVoid}>
                  <Text style={$voidButtonText}>Void Invoice</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={$scrollFooterSpace} />
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
const $container: ViewStyle = {
  flex: 1,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
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
  paddingTop: spacing.lg,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.sm,
}

const $summaryCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  padding: spacing.md,
}

const $summaryTopRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
}

const $invoiceNumber: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  color: colors.palette.neutral900,
}

const $summaryMeta: TextStyle = {
  fontSize: 13,
  color: colors.textDim,
  marginTop: 2,
}

const $statusChip: ViewStyle = {
  paddingVertical: 4,
  paddingHorizontal: spacing.sm,
  borderRadius: 12,
}

const $statusChipText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
}

const $divider: ViewStyle = {
  height: 1,
  backgroundColor: colors.palette.neutral200,
  marginVertical: spacing.md,
}

const $partyRow: ViewStyle = {
  flexDirection: "row",
}

const $party: ViewStyle = {
  flex: 1,
}

const $partyLabel: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.textDim,
  textTransform: "uppercase",
  marginBottom: 2,
}

const $partyName: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $lineItemHeaderRow: ViewStyle = {
  flexDirection: "row",
  marginBottom: spacing.xs,
}

const $lineItemHeaderText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: colors.textDim,
  textTransform: "uppercase",
}

const $lineItemRow: ViewStyle = {
  flexDirection: "row",
  paddingVertical: spacing.xs,
}

const $lineItemText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral900,
}

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

const $totalRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 3,
}

const $totalLabel: TextStyle = {
  fontSize: 14,
  color: colors.textDim,
}

const $totalValue: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $balanceLabel: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  color: colors.palette.neutral900,
}

const $balanceValue: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.accent,
}

const $notesText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral900,
  lineHeight: 20,
}

const $paymentRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  padding: spacing.md,
  marginBottom: spacing.sm,
}

const $paymentInfo: ViewStyle = {
  flex: 1,
}

const $paymentAmount: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $paymentMeta: TextStyle = {
  fontSize: 13,
  color: colors.textDim,
  marginTop: 2,
  textTransform: "capitalize",
}

const $paymentStatus: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  textTransform: "capitalize",
}

const $paymentConfirmed: TextStyle = {
  color: colors.palette.success500,
}

const $paymentRejected: TextStyle = {
  color: colors.palette.error500,
}

const $paymentPending: TextStyle = {
  color: colors.palette.warning600,
}

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

const $voidButton: ViewStyle = {
  alignItems: "center",
  paddingVertical: spacing.sm,
}

const $voidButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.error500,
}

const $emptyText: TextStyle = {
  fontSize: 13,
  color: colors.textDim,
  lineHeight: 18,
}

const $scrollFooterSpace: ViewStyle = {
  height: spacing.xxl,
}
