/**
 * PaymentScreen (Pay tab)
 *
 * Client payment hub:
 *  - Outstanding: orders with a balance, with invoice info when one exists,
 *    and an "I've paid" form that records a pending_confirmation payment
 *    claim (the server hook notifies the tailor, who confirms).
 *  - History: the client's payment records with status chips.
 *  - Receipt: a simple per-payment detail modal.
 */
import { FC, useCallback, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import {
  Alert,
  Modal,
  RefreshControl,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { TabScreenProps } from "@/navigators/ClientTabsNavigator"
import { Button, Screen, Text, TextField } from "@/components"
import { orderApi } from "@/services/api/order-api"
import {
  clientPaymentApi,
  PBInvoice,
  PBPayment,
} from "@/services/api/client-payment-api"
import { getPocketBaseAdapter } from "@/services/api/pocketbase-api-adapter"
import { formatNaira } from "@/utils/formatCurrency"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface PaymentScreenProps extends TabScreenProps<"Pay"> {}

interface OutstandingOrder {
  id: string
  orderNumber: string
  garmentType: string
  total: number
  balance: number
  depositPaid: number
  invoice?: PBInvoice
}

const PAYMENT_METHODS: Array<{ value: PBPayment["method"]; label: string }> = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "other", label: "Other" },
]

const STATUS_COLORS: Record<string, string> = {
  pending_confirmation: "#E8B04B",
  confirmed: "#6B8E6B",
  rejected: "#C85450",
}

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
}

export const PaymentScreen: FC<PaymentScreenProps> = observer(function PaymentScreen() {
  const { theme } = useAppTheme()
  const [outstanding, setOutstanding] = useState<OutstandingOrder[]>([])
  const [payments, setPayments] = useState<PBPayment[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // "I've paid" form state
  const [payingOrder, setPayingOrder] = useState<OutstandingOrder | null>(null)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PBPayment["method"]>("bank_transfer")
  const [reference, setReference] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // receipt modal state
  const [receipt, setReceipt] = useState<PBPayment | null>(null)

  const load = useCallback(async () => {
    const adapter = getPocketBaseAdapter()
    const [ordersResult, paymentsResult] = await Promise.all([
      orderApi.fetchOrders({ customerId: adapter.currentUserId, perPage: 100 }),
      clientPaymentApi.fetchMyPayments(),
    ])

    if (ordersResult.success) {
      const withBalance = ordersResult.data.orders.filter(
        (o) => (o.pricing?.balanceAmount ?? 0) > 0 && o.status !== "cancelled",
      )
      const invoicesResult = await clientPaymentApi.fetchInvoicesByOrders(
        withBalance.map((o) => o.id),
      )
      const invoices = invoicesResult.success ? invoicesResult.data : {}
      setOutstanding(
        withBalance.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          garmentType: o.garmentType,
          total: o.pricing?.totalPrice ?? 0,
          balance: o.pricing?.balanceAmount ?? 0,
          depositPaid: (o.pricing?.totalPrice ?? 0) - (o.pricing?.balanceAmount ?? 0),
          invoice: invoices[o.id],
        })),
      )
      setError(null)
    } else {
      setError(ordersResult.message ?? "Failed to load orders")
    }

    if (paymentsResult.success) setPayments(paymentsResult.data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await load()
    setIsRefreshing(false)
  }, [load])

  const openPayForm = (order: OutstandingOrder) => {
    setPayingOrder(order)
    setAmount(String(order.balance))
    setMethod("bank_transfer")
    setReference("")
  }

  const handleSubmitClaim = async () => {
    if (!payingOrder) return
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Enter a valid payment amount.")
      return
    }

    // deposit when partial; full/final settlement otherwise
    const paymentType: PBPayment["paymentType"] =
      parsed >= payingOrder.balance
        ? payingOrder.balance >= payingOrder.total
          ? "full_payment"
          : "final_payment"
        : "deposit"

    setIsSubmitting(true)
    const result = await clientPaymentApi.createPaymentClaim({
      orderId: payingOrder.id,
      amount: parsed,
      method,
      paymentType,
      reference: reference.trim(),
    })
    setIsSubmitting(false)

    if (result.success) {
      setPayingOrder(null)
      Alert.alert(
        "Payment recorded",
        "Your payment claim has been sent to the tailor for confirmation.",
      )
      await load()
    } else {
      Alert.alert("Error", result.message ?? "Failed to record the payment")
    }
  }

  return (
    <Screen
      style={$root}
      preset="scroll"
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />,
      }}
    >
      <Text preset="heading" text="Payments" style={$heading} />
      {error && <Text style={[$error, { color: theme.colors.error }]} text={error} />}

      {/* outstanding balances */}
      <Text preset="subheading" text="Outstanding" style={$sectionTitle} />
      {outstanding.length === 0 && (
        <Text style={[$emptyText, { color: theme.colors.textDim }]} text="Nothing to pay — you're all settled!" />
      )}
      {outstanding.map((order) => (
        <View
          key={order.id}
          style={[$card, { backgroundColor: theme.colors.palette.neutral100 }]}
        >
          <View style={$cardHeader}>
            <Text style={[$cardTitle, { color: theme.colors.text }]} text={`#${order.orderNumber}`} />
            {order.invoice && (
              <Text
                style={[$invoiceNumber, { color: theme.colors.textDim }]}
                text={order.invoice.invoiceNumber}
              />
            )}
          </View>
          <View style={$amountRow}>
            <View style={$amountItem}>
              <Text style={[$amountLabel, { color: theme.colors.textDim }]} text="Total" />
              <Text style={[$amountValue, { color: theme.colors.text }]} text={formatNaira(order.total)} />
            </View>
            <View style={$amountItem}>
              <Text style={[$amountLabel, { color: theme.colors.textDim }]} text="Paid" />
              <Text
                style={[$amountValue, { color: (theme.colors.palette as any).success500 ?? "#6B8E6B" }]}
                text={formatNaira(order.depositPaid)}
              />
            </View>
            <View style={$amountItem}>
              <Text style={[$amountLabel, { color: theme.colors.textDim }]} text="Balance" />
              <Text
                style={[$amountValue, { color: theme.colors.error }]}
                text={formatNaira(order.balance)}
              />
            </View>
          </View>
          {order.invoice?.dueAt ? (
            <Text
              style={[$dueText, { color: theme.colors.textDim }]}
              text={`Due ${new Date(order.invoice.dueAt).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}`}
            />
          ) : null}
          <Button text="I've paid" onPress={() => openPayForm(order)} style={$payButton} />
        </View>
      ))}

      {/* payment history */}
      <Text preset="subheading" text="History" style={$sectionTitle} />
      {payments.length === 0 && (
        <Text style={[$emptyText, { color: theme.colors.textDim }]} text="No payments yet" />
      )}
      {payments.map((payment) => (
        <TouchableOpacity
          key={payment.id}
          style={[$historyRow, { backgroundColor: theme.colors.palette.neutral100 }]}
          onPress={() => setReceipt(payment)}
        >
          <View style={$historyLeft}>
            <Text
              style={[$historyAmount, { color: theme.colors.text }]}
              text={formatNaira(payment.amount)}
            />
            <Text
              style={[$historyMeta, { color: theme.colors.textDim }]}
              text={`${PAYMENT_METHODS.find((m) => m.value === payment.method)?.label ?? payment.method} · ${new Date(
                payment.created,
              ).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`}
            />
          </View>
          <View
            style={[
              $statusChip,
              { backgroundColor: (STATUS_COLORS[payment.status] ?? "#8B9D83") + "33" },
            ]}
          >
            <Text
              style={[$statusChipText, { color: STATUS_COLORS[payment.status] ?? "#8B9D83" }]}
              text={STATUS_LABELS[payment.status] ?? payment.status}
            />
          </View>
        </TouchableOpacity>
      ))}

      {/* "I've paid" form modal */}
      <Modal
        visible={!!payingOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setPayingOrder(null)}
      >
        <View style={$modalOverlay}>
          <View style={[$modalCard, { backgroundColor: theme.colors.background }]}>
            <Text preset="subheading" text={`Pay #${payingOrder?.orderNumber ?? ""}`} />
            <Text
              style={[$modalMeta, { color: theme.colors.textDim }]}
              text={`Outstanding balance: ${formatNaira(payingOrder?.balance)}`}
            />
            <TextField
              label="Amount (₦)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              containerStyle={$field}
            />
            <Text preset="formLabel" text="Method" style={$methodLabel} />
            <View style={$methodChips}>
              {PAYMENT_METHODS.map((option) => {
                const active = method === option.value
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      $chip,
                      {
                        backgroundColor: active
                          ? theme.colors.tint
                          : theme.colors.palette.neutral100,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setMethod(option.value)}
                  >
                    <Text
                      style={[
                        $chipText,
                        { color: active ? theme.colors.palette.neutral100 : theme.colors.text },
                      ]}
                      text={option.label}
                    />
                  </TouchableOpacity>
                )
              })}
            </View>
            <TextField
              label="Reference (optional)"
              placeholder="Transfer reference or note"
              value={reference}
              onChangeText={setReference}
              containerStyle={$field}
            />
            <Button
              text={isSubmitting ? "Submitting..." : "Submit payment claim"}
              onPress={handleSubmitClaim}
              disabled={isSubmitting}
              style={$modalButton}
            />
            <Button text="Cancel" onPress={() => setPayingOrder(null)} />
          </View>
        </View>
      </Modal>

      {/* receipt detail modal */}
      <Modal
        visible={!!receipt}
        animationType="slide"
        transparent
        onRequestClose={() => setReceipt(null)}
      >
        <View style={$modalOverlay}>
          <View style={[$modalCard, { backgroundColor: theme.colors.background }]}>
            {receipt && (
              <>
                <Text preset="subheading" text="Payment Receipt" />
                {[
                  ["Amount", formatNaira(receipt.amount)],
                  [
                    "Method",
                    PAYMENT_METHODS.find((m) => m.value === receipt.method)?.label ??
                      receipt.method,
                  ],
                  ["Type", receipt.paymentType.replace(/_/g, " ")],
                  ["Status", STATUS_LABELS[receipt.status] ?? receipt.status],
                  ["Reference", receipt.reference || "—"],
                  [
                    "Date",
                    new Date(receipt.created).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                  ],
                  [
                    "Confirmed",
                    receipt.confirmedAt
                      ? new Date(receipt.confirmedAt).toLocaleDateString("en-NG")
                      : "Awaiting confirmation",
                  ],
                ].map(([label, value]) => (
                  <View key={label} style={$receiptRow}>
                    <Text style={[$receiptLabel, { color: theme.colors.textDim }]} text={label} />
                    <Text style={[$receiptValue, { color: theme.colors.text }]} text={value} />
                  </View>
                ))}
                <Button text="Close" onPress={() => setReceipt(null)} style={$modalButton} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $heading: TextStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
}

const $sectionTitle: TextStyle = {
  paddingHorizontal: spacing.md,
  marginTop: spacing.md,
  marginBottom: spacing.xs,
}

const $error: TextStyle = {
  padding: spacing.md,
  textAlign: "center",
}

const $emptyText: TextStyle = {
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
}

const $card: ViewStyle = {
  marginHorizontal: spacing.md,
  marginBottom: spacing.sm,
  borderRadius: 12,
  padding: spacing.md,
}

const $cardHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $cardTitle: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
}

const $invoiceNumber: TextStyle = {
  fontSize: 12,
}

const $amountRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: spacing.sm,
}

const $amountItem: ViewStyle = {
  alignItems: "center",
  flex: 1,
}

const $amountLabel: TextStyle = {
  fontSize: 12,
}

const $amountValue: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  marginTop: 2,
}

const $dueText: TextStyle = {
  fontSize: 12,
  marginTop: spacing.xs,
  textAlign: "center",
}

const $payButton: ViewStyle = {
  marginTop: spacing.sm,
}

const $historyRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginHorizontal: spacing.md,
  marginBottom: spacing.xs,
  borderRadius: 12,
  padding: spacing.md,
}

const $historyLeft: ViewStyle = {
  flex: 1,
}

const $historyAmount: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
}

const $historyMeta: TextStyle = {
  fontSize: 12,
  marginTop: 2,
}

const $statusChip: ViewStyle = {
  paddingHorizontal: spacing.xs,
  paddingVertical: 3,
  borderRadius: 10,
}

const $statusChipText: TextStyle = {
  fontSize: 11,
  fontWeight: "700",
}

const $modalOverlay: ViewStyle = {
  flex: 1,
  justifyContent: "flex-end",
  backgroundColor: "rgba(0, 0, 0, 0.4)",
}

const $modalCard: ViewStyle = {
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: spacing.lg,
  paddingBottom: spacing.xl,
}

const $modalMeta: TextStyle = {
  marginTop: spacing.xxs,
  marginBottom: spacing.sm,
}

const $field: ViewStyle = {
  marginBottom: spacing.sm,
}

const $methodLabel: TextStyle = {
  marginBottom: spacing.xs,
}

const $methodChips: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
  marginBottom: spacing.sm,
}

const $chip: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
}

const $chipText: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
}

const $modalButton: ViewStyle = {
  marginTop: spacing.sm,
  marginBottom: spacing.xs,
}

const $receiptRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: spacing.xs,
}

const $receiptLabel: TextStyle = {
  fontSize: 13,
}

const $receiptValue: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
  flexShrink: 1,
  textAlign: "right",
  marginLeft: spacing.sm,
}
