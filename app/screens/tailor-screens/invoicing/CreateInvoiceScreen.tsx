import { FC, useEffect, useMemo, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  // eslint-disable-next-line no-restricted-imports -- legacy custom-styled raw inputs; wrapper swap planned with the RHF conversion
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native"
import { observer } from "mobx-react-lite"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon, Button } from "@/components"
import { colors, spacing } from "@/theme"
import { errorMessage } from "@/api/common"
import { useCreateInvoice, useUninvoicedOrders } from "@/api/invoices"
import { formatMoney, InvoiceLineItem } from "@/services/api/invoice-api"
import { formatDate } from "./invoicing-shared"

interface LineItemDraft {
  description: string
  quantity: string
  amount: string
}

interface CreateInvoiceScreenProps extends AppStackScreenProps<"CreateInvoice"> {}

const DUE_DATE_OPTIONS = [7, 14, 30]

/**
 * Create an invoice for one of the tailor's orders that doesn't already
 * carry a non-void invoice.
 */
export const CreateInvoiceScreen: FC<CreateInvoiceScreenProps> = observer(
  function CreateInvoiceScreen() {
    const navigation = useNavigation<any>()

    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [lineItems, setLineItems] = useState<LineItemDraft[]>([
      { description: "", quantity: "1", amount: "" },
    ])
    const [depositRequired, setDepositRequired] = useState("")
    const [depositTouched, setDepositTouched] = useState(false)
    const [dueInDays, setDueInDays] = useState<number | null>(14)
    const [dueAtText, setDueAtText] = useState("")
    const [notes, setNotes] = useState("")
    const [sendNow, setSendNow] = useState(true)

    const ordersQuery = useUninvoicedOrders()
    const createInvoice = useCreateInvoice()
    const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data])
    const isLoading = ordersQuery.isLoading
    const isSubmitting = createInvoice.isPending

    // The original screen alerted when the order list failed to load
    useEffect(() => {
      if (ordersQuery.error) {
        Alert.alert("Error", errorMessage(ordersQuery.error) || "Failed to load orders")
      }
    }, [ordersQuery.error])

    const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null

    const subtotal = lineItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0
      const amount = parseFloat(item.amount) || 0
      return sum + quantity * amount
    }, 0)

    // Keep the 50% deposit default in sync until the tailor edits it
    useEffect(() => {
      if (!depositTouched) {
        setDepositRequired(subtotal > 0 ? String(Math.round(subtotal / 2)) : "")
      }
    }, [subtotal, depositTouched])

    // Prefill the first line item from the order when one is picked
    const handleSelectOrder = (order: any) => {
      setSelectedOrderId(order.id)
      const first = lineItems[0]
      if (lineItems.length === 1 && !first.description && !first.amount) {
        setLineItems([
          {
            description: order.specialInstructions || `Order ${order.orderNumber}`,
            quantity: "1",
            amount: String(order.totalAmount ?? ""),
          },
        ])
      }
    }

    const setLineItemField = (index: number, field: keyof LineItemDraft, value: string) => {
      setLineItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
      )
    }

    const addLineItem = () => {
      setLineItems((prev) => [...prev, { description: "", quantity: "1", amount: "" }])
    }

    const removeLineItem = (index: number) => {
      setLineItems((prev) => prev.filter((_, i) => i !== index))
    }

    const resolveDueAt = (): string | undefined => {
      if (dueInDays !== null) {
        return new Date(Date.now() + dueInDays * 86400000).toISOString()
      }
      if (dueAtText.trim()) {
        const parsed = new Date(dueAtText.trim())
        if (!isNaN(parsed.getTime())) return parsed.toISOString()
      }
      return undefined
    }

    const handleCreate = () => {
      if (!selectedOrder) {
        Alert.alert("Select an Order", "Please choose the order this invoice is for.")
        return
      }
      const items: InvoiceLineItem[] = []
      for (const draft of lineItems) {
        const quantity = parseFloat(draft.quantity)
        const amount = parseFloat(draft.amount)
        if (
          !draft.description.trim() ||
          isNaN(quantity) ||
          quantity <= 0 ||
          isNaN(amount) ||
          amount <= 0
        ) {
          Alert.alert(
            "Invalid Line Items",
            "Every line item needs a description, quantity and amount.",
          )
          return
        }
        items.push({ description: draft.description.trim(), quantity, amount })
      }
      if (items.length === 0) {
        Alert.alert("Line Items Required", "Add at least one line item.")
        return
      }
      const deposit = parseFloat(depositRequired) || 0
      if (deposit < 0 || deposit > subtotal) {
        Alert.alert("Invalid Deposit", "Deposit must be between 0 and the subtotal.")
        return
      }
      if (dueInDays === null && dueAtText.trim() && !resolveDueAt()) {
        Alert.alert("Invalid Due Date", "Use an ISO date like 2026-08-01.")
        return
      }

      createInvoice.mutate(
        {
          orderId: selectedOrder.id,
          customerId: selectedOrder.customer,
          lineItems: items,
          depositRequired: deposit,
          currency: selectedOrder.currency || "NGN",
          status: sendNow ? "sent" : "draft",
          dueAt: resolveDueAt(),
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: (created) => {
            Alert.alert(
              "Invoice Created",
              `${created.invoiceNumber} has been ${sendNow ? "sent" : "saved as a draft"}.`,
              [{ text: "OK", onPress: () => navigation.goBack() }],
            )
          },
          onError: (error) => {
            Alert.alert("Create Failed", errorMessage(error) || "Could not create the invoice.")
          },
        },
      )
    }

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
          <Text style={$headerTitle}>New Invoice</Text>
          <View style={$headerSpacer} />
        </View>

        {isLoading ? (
          <View style={$loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView style={$container} showsVerticalScrollIndicator={false}>
            {/* Order picker */}
            <View style={$section}>
              <Text style={$sectionTitle}>Order</Text>
              {orders.length === 0 ? (
                <Text style={$emptyText}>All your active orders already have an invoice.</Text>
              ) : (
                orders.map((order) => (
                  <TouchableOpacity
                    key={order.id}
                    style={[$orderRow, selectedOrderId === order.id && $selectedOrderRow]}
                    onPress={() => handleSelectOrder(order)}
                  >
                    <View style={$orderInfo}>
                      <Text style={$orderNumber}>{order.orderNumber}</Text>
                      <Text style={$orderMeta}>
                        {order.status} · {formatMoney(order.totalAmount ?? 0, order.currency)}
                      </Text>
                    </View>
                    <View style={[$radio, selectedOrderId === order.id && $radioSelected]} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Line items */}
            <View style={$section}>
              <Text style={$sectionTitle}>Line Items</Text>
              {lineItems.map((item, index) => (
                <View key={index} style={$lineItemCard}>
                  <View style={$inputContainer}>
                    <TextInput
                      style={$textInput}
                      placeholder="Description"
                      placeholderTextColor={colors.palette.neutral400}
                      value={item.description}
                      onChangeText={(v) => setLineItemField(index, "description", v)}
                    />
                  </View>
                  <View style={$lineItemNumbersRow}>
                    <View style={[$inputContainer, $qtyInput]}>
                      <TextInput
                        style={$textInput}
                        placeholder="Qty"
                        placeholderTextColor={colors.palette.neutral400}
                        value={item.quantity}
                        onChangeText={(v) => setLineItemField(index, "quantity", v)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[$inputContainer, $amountInput]}>
                      <TextInput
                        style={$textInput}
                        placeholder="Unit amount"
                        placeholderTextColor={colors.palette.neutral400}
                        value={item.amount}
                        onChangeText={(v) => setLineItemField(index, "amount", v)}
                        keyboardType="numeric"
                      />
                    </View>
                    {lineItems.length > 1 && (
                      <TouchableOpacity
                        style={$removeItemButton}
                        onPress={() => removeLineItem(index)}
                        accessibilityLabel="Remove line item"
                      >
                        <Icon icon="x" size={16} color={colors.palette.error500} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              <TouchableOpacity style={$addItemButton} onPress={addLineItem}>
                <Text style={$addItemText}>+ Add line item</Text>
              </TouchableOpacity>

              <View style={$subtotalRow}>
                <Text style={$subtotalLabel}>Subtotal</Text>
                <Text style={$subtotalValue}>
                  {formatMoney(subtotal, selectedOrder?.currency || "NGN")}
                </Text>
              </View>
            </View>

            {/* Deposit */}
            <View style={$section}>
              <Text style={$sectionTitle}>Deposit Required</Text>
              <Text style={$sectionDescription}>Defaults to 50% of the subtotal.</Text>
              <View style={$inputContainer}>
                <TextInput
                  style={$textInput}
                  placeholder="0"
                  placeholderTextColor={colors.palette.neutral400}
                  value={depositRequired}
                  onChangeText={(v) => {
                    setDepositTouched(true)
                    setDepositRequired(v)
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Due date */}
            <View style={$section}>
              <Text style={$sectionTitle}>Due Date</Text>
              <View style={$chipRow}>
                {DUE_DATE_OPTIONS.map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[$chip, dueInDays === days && $selectedChip]}
                    onPress={() => setDueInDays(days)}
                  >
                    <Text style={[$chipText, dueInDays === days && $selectedChipText]}>
                      In {days} days
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[$chip, dueInDays === null && $selectedChip]}
                  onPress={() => setDueInDays(null)}
                >
                  <Text style={[$chipText, dueInDays === null && $selectedChipText]}>Custom</Text>
                </TouchableOpacity>
              </View>
              {dueInDays === null ? (
                <View style={[$inputContainer, $dueAtInput]}>
                  <TextInput
                    style={$textInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.palette.neutral400}
                    value={dueAtText}
                    onChangeText={setDueAtText}
                    autoCapitalize="none"
                  />
                </View>
              ) : (
                <Text style={$dueAtPreview}>
                  Due {formatDate(new Date(Date.now() + dueInDays * 86400000).toISOString())}
                </Text>
              )}
            </View>

            {/* Notes */}
            <View style={$section}>
              <Text style={$sectionTitle}>Notes</Text>
              <View style={$inputContainer}>
                <TextInput
                  style={[$textInput, $notesInput]}
                  placeholder="Payment instructions, terms..."
                  placeholderTextColor={colors.palette.neutral400}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Draft / send toggle */}
            <View style={$section}>
              <Text style={$sectionTitle}>Status</Text>
              <View style={$chipRow}>
                <TouchableOpacity
                  style={[$chip, !sendNow && $selectedChip]}
                  onPress={() => setSendNow(false)}
                >
                  <Text style={[$chipText, !sendNow && $selectedChipText]}>Save as Draft</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[$chip, sendNow && $selectedChip]}
                  onPress={() => setSendNow(true)}
                >
                  <Text style={[$chipText, sendNow && $selectedChipText]}>Send Now</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              text={
                isSubmitting
                  ? "Creating..."
                  : sendNow
                    ? "Create & Send Invoice"
                    : "Save Draft Invoice"
              }
              style={$submitButton}
              textStyle={$submitButtonText}
              onPress={handleCreate}
              disabled={isSubmitting || orders.length === 0}
            />
            <View style={$scrollFooterSpace} />
          </ScrollView>
        )}
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

// Screen's fixed preset gives its inner container no height; without flex the
// scrollable body collapses to zero height.
const $screenContent: ViewStyle = {
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
  paddingTop: spacing.lg,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.sm,
}

const $sectionDescription: TextStyle = {
  fontSize: 13,
  color: colors.textDim,
  marginBottom: spacing.sm,
}

const $orderRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  padding: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  marginBottom: spacing.sm,
}

const $selectedOrderRow: ViewStyle = {
  borderColor: colors.palette.primary500,
  backgroundColor: colors.palette.primary100,
}

const $orderInfo: ViewStyle = {
  flex: 1,
}

const $orderNumber: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $orderMeta: TextStyle = {
  fontSize: 13,
  color: colors.textDim,
  marginTop: 2,
  textTransform: "capitalize",
}

const $radio: ViewStyle = {
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: colors.palette.neutral300,
}

const $radioSelected: ViewStyle = {
  borderColor: colors.palette.primary500,
  backgroundColor: colors.accent,
}

const $lineItemCard: ViewStyle = {
  marginBottom: spacing.sm,
  gap: spacing.xs,
}

const $lineItemNumbersRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
}

const $qtyInput: ViewStyle = {
  flex: 1,
}

const $amountInput: ViewStyle = {
  flex: 2,
}

const $removeItemButton: ViewStyle = {
  width: 36,
  height: 36,
  justifyContent: "center",
  alignItems: "center",
}

const $addItemButton: ViewStyle = {
  paddingVertical: spacing.sm,
}

const $addItemText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.accent,
}

const $subtotalRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
}

const $subtotalLabel: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $subtotalValue: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.accent,
}

const $inputContainer: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $textInput: TextStyle = {
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  color: colors.palette.neutral900,
}

const $notesInput: TextStyle = {
  minHeight: 80,
}

const $chipRow: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
}

const $chip: ViewStyle = {
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.md,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $selectedChip: ViewStyle = {
  backgroundColor: colors.accent,
  borderColor: colors.palette.primary500,
}

const $chipText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.neutral700,
}

const $selectedChipText: TextStyle = {
  color: colors.palette.neutral100,
}

const $dueAtInput: ViewStyle = {
  marginTop: spacing.sm,
}

const $dueAtPreview: TextStyle = {
  fontSize: 13,
  color: colors.textDim,
  marginTop: spacing.sm,
}

const $submitButton: ViewStyle = {
  backgroundColor: colors.accent,
  borderRadius: 12,
  marginHorizontal: spacing.lg,
  marginTop: spacing.xl,
}

const $submitButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

const $emptyText: TextStyle = {
  fontSize: 13,
  color: colors.textDim,
  lineHeight: 18,
}

const $scrollFooterSpace: ViewStyle = {
  height: spacing.xxl,
}
