import React, { FC, useEffect, useState } from "react"
import {
  Modal,
  View,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInput,
  Alert,
  ScrollView,
} from "react-native"
import { Button } from "./Button"
import { Text } from "./Text"
import { colors, spacing } from "@/theme"
import { paymentApi, PaymentMethod, PaymentType } from "@/services/api/payment-api"
import { formatMoney } from "@/services/api/invoice-api"

export interface RecordPaymentOrder {
  id: string
  orderNumber?: string
  balanceAmount?: number
  depositAmount?: number
  currency?: string
}

export interface RecordPaymentModalProps {
  visible: boolean
  /** the order the payment applies to (needs at least the id) */
  order: RecordPaymentOrder | null
  onClose: () => void
  /** called after a payment is successfully recorded */
  onDone?: () => void
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Transfer" },
  { value: "pos", label: "POS" },
  { value: "other", label: "Other" },
]

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: "deposit", label: "Deposit" },
  { value: "final_payment", label: "Final Payment" },
  { value: "full_payment", label: "Full Payment" },
]

/**
 * Modal for a tailor to record an offline payment (cash/transfer/POS)
 * against an order. The payment is created confirmed; server hooks update
 * the order's money fields and the invoice status.
 */
export const RecordPaymentModal: FC<RecordPaymentModalProps> = ({
  visible,
  order,
  onClose,
  onDone,
}) => {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [paymentType, setPaymentType] = useState<PaymentType>("full_payment")
  const [typeTouched, setTypeTouched] = useState(false)
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const balance = order?.balanceAmount ?? 0
  const currency = order?.currency ?? "NGN"

  // Reset the form each time the modal opens, defaulting to the balance
  useEffect(() => {
    if (visible) {
      setAmount(balance > 0 ? String(balance) : "")
      setMethod("cash")
      setTypeTouched(false)
      setPaymentType(
        balance > 0 && (order?.depositAmount ?? 0) > 0 ? "final_payment" : "full_payment",
      )
      setReference("")
      setNotes("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Auto-suggest the payment type from the amount until the user picks one
  const handleAmountChange = (value: string) => {
    setAmount(value)
    if (typeTouched) return
    const num = parseFloat(value)
    if (isNaN(num) || balance <= 0) return
    if (num < balance) {
      setPaymentType((order?.depositAmount ?? 0) > 0 ? "final_payment" : "deposit")
    } else {
      setPaymentType((order?.depositAmount ?? 0) > 0 ? "final_payment" : "full_payment")
    }
  }

  const handleSubmit = async () => {
    if (!order) return
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount.")
      return
    }

    setIsSubmitting(true)
    const result = await paymentApi.recordPayment({
      orderId: order.id,
      amount: num,
      method,
      paymentType,
      currency,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setIsSubmitting(false)

    if (result.success) {
      onClose()
      Alert.alert("Payment Recorded", `${formatMoney(num, currency)} recorded successfully.`)
      onDone?.()
    } else {
      Alert.alert("Payment Failed", result.message ?? "Could not record the payment.")
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={$backdrop}>
        <View className="max-h-[85%] rounded-t-[20px] bg-neutral100 px-6 pb-8 pt-4">
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View className="mb-2 flex-row items-center justify-between">
              <Text
                className="text-[18px]"
                weight="bold"
                style={{ color: colors.palette.neutral900 }}
              >
                Record Payment
              </Text>
              <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
                <Text className="p-2 text-[18px]" style={{ color: colors.palette.neutral600 }}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {order?.orderNumber && (
              <Text className="mb-3 text-[13px]" style={{ color: colors.palette.neutral600 }}>
                Order {order.orderNumber}
                {balance > 0 ? ` · balance ${formatMoney(balance, currency)}` : ""}
              </Text>
            )}

            {/* Amount */}
            <Text className={$fieldLabelClass} weight="medium" style={$fieldLabelColor}>
              Amount ({currency})
            </Text>
            <View className="rounded-lg border border-neutral300 bg-neutral100">
              <TextInput
                style={$textInput}
                placeholder="0"
                placeholderTextColor={colors.palette.neutral400}
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
              />
            </View>

            {/* Method */}
            <Text className={$fieldLabelClass} weight="medium" style={$fieldLabelColor}>
              Method
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  className="rounded-2xl border border-neutral300 px-4 py-2"
                  style={
                    method === m.value
                      ? { backgroundColor: colors.palette.primary500, borderColor: colors.palette.primary500 }
                      : undefined
                  }
                  onPress={() => setMethod(m.value)}
                >
                  <Text
                    className="text-[14px]"
                    weight="medium"
                    style={{
                      color: method === m.value ? colors.palette.neutral100 : colors.palette.neutral700,
                    }}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment type */}
            <Text className={$fieldLabelClass} weight="medium" style={$fieldLabelColor}>
              Payment Type
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {PAYMENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  className="rounded-2xl border border-neutral300 px-4 py-2"
                  style={
                    paymentType === t.value
                      ? { backgroundColor: colors.palette.primary500, borderColor: colors.palette.primary500 }
                      : undefined
                  }
                  onPress={() => {
                    setTypeTouched(true)
                    setPaymentType(t.value)
                  }}
                >
                  <Text
                    className="text-[14px]"
                    weight="medium"
                    style={{
                      color:
                        paymentType === t.value ? colors.palette.neutral100 : colors.palette.neutral700,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reference */}
            <Text className={$fieldLabelClass} weight="medium" style={$fieldLabelColor}>
              Reference (optional)
            </Text>
            <View className="rounded-lg border border-neutral300 bg-neutral100">
              <TextInput
                style={$textInput}
                placeholder="e.g. TRF/2026/07/12345"
                placeholderTextColor={colors.palette.neutral400}
                value={reference}
                onChangeText={setReference}
                autoCapitalize="characters"
              />
            </View>

            {/* Notes */}
            <Text className={$fieldLabelClass} weight="medium" style={$fieldLabelColor}>
              Notes (optional)
            </Text>
            <View className="rounded-lg border border-neutral300 bg-neutral100">
              <TextInput
                style={[$textInput, $notesInput]}
                placeholder="Any details about this payment"
                placeholderTextColor={colors.palette.neutral400}
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
              />
            </View>

            <Button
              text={isSubmitting ? "Recording..." : "Record Payment"}
              style={$submitButton}
              textStyle={$submitButtonText}
              onPress={handleSubmit}
              disabled={isSubmitting || !order}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// Styles
// Field-label layout is a className; its static color stays inline (static
// `colors` import, so no `dark:` twins).
const $fieldLabelClass = "mb-2 mt-4 text-[14px]"
const $fieldLabelColor: TextStyle = { color: colors.palette.neutral900 }

// Modal backdrop overlay + raw TextInput styles + Button style/textStyle
// overrides stay inline per the recipe.
const $backdrop: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.45)",
  justifyContent: "flex-end",
}

const $textInput: TextStyle = {
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.palette.neutral900,
}

const $notesInput: TextStyle = {
  minHeight: 70,
}

const $submitButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  marginTop: spacing.lg,
}

const $submitButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}
