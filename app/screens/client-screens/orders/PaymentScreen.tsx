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
import { Button, Screen, Text, TextField, Chip, ChipTone } from "@/components"
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

const STATUS_TONES: Record<string, ChipTone> = {
  pending_confirmation: "warning",
  confirmed: "success",
  rejected: "error",
}

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
}

export const PaymentScreen: FC<PaymentScreenProps> = function PaymentScreen() {
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
      <Text preset="heading" text="Payments" className="px-4 pt-4" />
      {error && (
        <Text className="p-4 text-center text-error dark:text-error-dark" text={error} />
      )}

      {/* outstanding balances */}
      <Text preset="subheading" text="Outstanding" className="mb-2 mt-4 px-4" />
      {outstanding.length === 0 && (
        <Text
          className="px-4 pb-3 text-textDim dark:text-textDim-dark"
          text="Nothing to pay — you're all settled!"
        />
      )}
      {outstanding.map((order) => (
        <View
          key={order.id}
          className="mx-4 mb-3 rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
        >
          <View className="flex-row items-center justify-between">
            <Text
              className="text-[15px] font-bold text-text dark:text-text-dark"
              text={`#${order.orderNumber}`}
            />
            {order.invoice && (
              <Text
                className="text-[12px] text-gray500 dark:text-gray500-dark"
                text={order.invoice.invoiceNumber}
              />
            )}
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <View>
              <Text
                className="text-[12px] text-textDim dark:text-textDim-dark"
                text="Balance due"
              />
              <Text
                className="mt-0.5 text-[22px] font-bold text-error dark:text-error-dark"
                text={formatNaira(order.balance)}
              />
            </View>
            <Button
              text="I've paid"
              onPress={() => openPayForm(order)}
              style={[$payButton, { backgroundColor: theme.colors.accent }]}
              pressedStyle={{ backgroundColor: theme.colors.palette.emerald600 }}
              textStyle={[$payButtonText, { color: theme.colors.palette.neutral100 }]}
            />
          </View>
          <Text
            className="mt-3 text-[12px] text-textDim dark:text-textDim-dark"
            text={`Total ${formatNaira(order.total)}  ·  Paid ${formatNaira(order.depositPaid)}${
              order.invoice?.dueAt
                ? `  ·  Due ${new Date(order.invoice.dueAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                  })}`
                : ""
            }`}
          />
        </View>
      ))}

      {/* payment history */}
      <Text preset="subheading" text="History" className="mb-2 mt-4 px-4" />
      {payments.length === 0 && (
        <Text className="px-4 pb-3 text-textDim dark:text-textDim-dark" text="No payments yet" />
      )}
      {payments.map((payment) => (
        <TouchableOpacity
          key={payment.id}
          className="mx-4 mb-2 flex-row items-center justify-between rounded-2xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
          activeOpacity={0.7}
          onPress={() => setReceipt(payment)}
        >
          <View className="flex-1">
            <Text
              className="text-[15px] font-bold text-text dark:text-text-dark"
              text={formatNaira(payment.amount)}
            />
            <Text
              className="mt-0.5 text-[12px] text-textDim dark:text-textDim-dark"
              text={`${PAYMENT_METHODS.find((m) => m.value === payment.method)?.label ?? payment.method} · ${new Date(
                payment.created,
              ).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`}
            />
          </View>
          <Chip
            text={STATUS_LABELS[payment.status] ?? payment.status}
            tone={STATUS_TONES[payment.status] ?? "neutral"}
          />
        </TouchableOpacity>
      ))}

      {/* "I've paid" form modal */}
      <Modal
        visible={!!payingOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setPayingOrder(null)}
      >
        <View className="flex-1 justify-end" style={$modalOverlay}>
          <View className="rounded-t-[20px] bg-background p-6 pb-8 dark:bg-background-dark">
            <Text preset="subheading" text={`Pay #${payingOrder?.orderNumber ?? ""}`} />
            <Text
              className="mb-3 mt-1 text-textDim dark:text-textDim-dark"
              text={`Outstanding balance: ${formatNaira(payingOrder?.balance)}`}
            />
            <TextField
              label="Amount (₦)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              containerStyle={$field}
            />
            <Text preset="formLabel" text="Method" className="mb-2" />
            <View className="mb-3 flex-row flex-wrap gap-2">
              {PAYMENT_METHODS.map((option) => {
                const active = method === option.value
                return (
                  <TouchableOpacity
                    key={option.value}
                    className="rounded-2xl border border-border px-3 py-2 dark:border-border-dark"
                    style={{ backgroundColor: active ? theme.colors.accent : theme.colors.surface }}
                    onPress={() => setMethod(option.value)}
                  >
                    <Text
                      className="text-[13px] font-semibold"
                      style={{ color: active ? theme.colors.palette.neutral100 : theme.colors.text }}
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
        <View className="flex-1 justify-end" style={$modalOverlay}>
          <View className="rounded-t-[20px] bg-background p-6 pb-8 dark:bg-background-dark">
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
                  <View key={label} className="flex-row justify-between py-2">
                    <Text
                      className="text-[13px] text-textDim dark:text-textDim-dark"
                      text={label}
                    />
                    <Text
                      className="ml-3 shrink text-right text-[13px] font-semibold text-text dark:text-text-dark"
                      text={value}
                    />
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
}

const $root: ViewStyle = {
  flex: 1,
}

// Button style/textStyle overrides — combine with the live-theme accent bg inline.
const $payButton: ViewStyle = {
  borderWidth: 0,
  borderRadius: 12,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.md,
  minHeight: 40,
}

const $payButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
}

// Fixed overlay tint (raw rgba, not a token) — stays inline.
const $modalOverlay: ViewStyle = {
  backgroundColor: "rgba(0, 0, 0, 0.4)",
}

// TextField containerStyle prop — stays an inline style object.
const $field: ViewStyle = {
  marginBottom: spacing.sm,
}

// Button style override — stays inline.
const $modalButton: ViewStyle = {
  marginTop: spacing.sm,
  marginBottom: spacing.xs,
}
