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
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon, Button } from "@/components"
import { colors, spacing } from "@/theme"
import { errorMessage } from "@/api/common"
import { useCreateInvoice, useUninvoicedOrders } from "@/api/invoices"
import { formatMoney, InvoiceLineItem } from "@/services/api/invoice-api"
import { formatDate } from "./invoicing-shared"

// Inputs hold strings; the zod schema enforces description min 1 and
// positive numeric quantity/amount at submit time (RHF + zodResolver).
const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Quantity must be positive"),
  amount: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Amount must be positive"),
})

const lineItemsFormSchema = z.object({
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
})

type LineItemsFormValues = z.infer<typeof lineItemsFormSchema>

const EMPTY_LINE_ITEM = { description: "", quantity: "1", amount: "" }

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
    const [depositRequired, setDepositRequired] = useState("")
    const [depositTouched, setDepositTouched] = useState(false)
    const [dueInDays, setDueInDays] = useState<number | null>(14)
    const [dueAtText, setDueAtText] = useState("")
    const [notes, setNotes] = useState("")
    const [sendNow, setSendNow] = useState(true)

    // Line items live in react-hook-form (useFieldArray); everything else on
    // this screen is simple single-value state.
    const { control, handleSubmit, getValues } = useForm<LineItemsFormValues>({
      resolver: zodResolver(lineItemsFormSchema),
      defaultValues: { lineItems: [{ ...EMPTY_LINE_ITEM }] },
    })
    const { fields, append, remove, replace } = useFieldArray({ control, name: "lineItems" })
    const watchedLineItems = useWatch({ control, name: "lineItems" }) ?? []

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

    const subtotal = watchedLineItems.reduce((sum, item) => {
      const quantity = parseFloat(item?.quantity ?? "") || 0
      const amount = parseFloat(item?.amount ?? "") || 0
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
      const current = getValues("lineItems")
      if (current.length === 1 && !current[0].description && !current[0].amount) {
        replace([
          {
            description: order.specialInstructions || `Order ${order.orderNumber}`,
            quantity: "1",
            amount: String(order.totalAmount ?? ""),
          },
        ])
      }
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

    const handleCreate = handleSubmit(onValidLineItems, onInvalidLineItems)

    function onInvalidLineItems() {
      if (!selectedOrder) {
        Alert.alert("Select an Order", "Please choose the order this invoice is for.")
        return
      }
      Alert.alert("Invalid Line Items", "Every line item needs a description, quantity and amount.")
    }

    function onValidLineItems(values: LineItemsFormValues) {
      if (!selectedOrder) {
        Alert.alert("Select an Order", "Please choose the order this invoice is for.")
        return
      }
      const items: InvoiceLineItem[] = values.lineItems.map((draft) => ({
        description: draft.description.trim(),
        quantity: parseFloat(draft.quantity),
        amount: parseFloat(draft.amount),
      }))
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
            New Invoice
          </Text>
          <View className="w-10" />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView style={$container} showsVerticalScrollIndicator={false}>
            {/* Order picker */}
            <View className="px-6 pt-6">
              <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
                Order
              </Text>
              {orders.length === 0 ? (
                <Text className="text-[13px] leading-[18px]" style={$emptyTextColor}>
                  All your active orders already have an invoice.
                </Text>
              ) : (
                orders.map((order) => (
                  <TouchableOpacity
                    key={order.id}
                    className="flex-row items-center p-4 rounded-xl border border-neutral300 mb-3"
                    style={selectedOrderId === order.id ? $selectedOrderRow : undefined}
                    onPress={() => handleSelectOrder(order)}
                  >
                    <View className="flex-1">
                      <Text className="text-[15px]" weight="semiBold" style={$orderNumberColor}>
                        {order.orderNumber}
                      </Text>
                      <Text className="text-[13px] mt-0.5 capitalize" style={$orderMetaColor}>
                        {order.status} · {formatMoney(order.totalAmount ?? 0, order.currency)}
                      </Text>
                    </View>
                    <View
                      className="w-5 h-5 rounded-full border-2 border-neutral300"
                      style={selectedOrderId === order.id ? $radioSelected : undefined}
                    />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Line items */}
            <View className="px-6 pt-6">
              <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
                Line Items
              </Text>
              {fields.map((field, index) => (
                <View key={field.id} className="mb-3 gap-2">
                  <View className="rounded-lg border border-neutral300 bg-neutral100">
                    <Controller
                      control={control}
                      name={`lineItems.${index}.description`}
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextInput
                          style={$textInput}
                          placeholder="Description"
                          placeholderTextColor={colors.palette.neutral400}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                        />
                      )}
                    />
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="rounded-lg border border-neutral300 bg-neutral100" style={$qtyInput}>
                      <Controller
                        control={control}
                        name={`lineItems.${index}.quantity`}
                        render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput
                            style={$textInput}
                            placeholder="Qty"
                            placeholderTextColor={colors.palette.neutral400}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="numeric"
                          />
                        )}
                      />
                    </View>
                    <View className="rounded-lg border border-neutral300 bg-neutral100" style={$amountInput}>
                      <Controller
                        control={control}
                        name={`lineItems.${index}.amount`}
                        render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput
                            style={$textInput}
                            placeholder="Unit amount"
                            placeholderTextColor={colors.palette.neutral400}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="numeric"
                          />
                        )}
                      />
                    </View>
                    {fields.length > 1 && (
                      <TouchableOpacity
                        className="w-9 h-9 items-center justify-center"
                        onPress={() => remove(index)}
                        accessibilityLabel="Remove line item"
                      >
                        <Icon icon="x" size={16} color={colors.palette.error500} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              <TouchableOpacity className="py-3" onPress={() => append({ ...EMPTY_LINE_ITEM })}>
                <Text className="text-[14px]" weight="semiBold" style={$addItemTextColor}>
                  + Add line item
                </Text>
              </TouchableOpacity>

              <View className="flex-row justify-between py-3 border-t border-neutral200">
                <Text className="text-[15px]" weight="semiBold" style={$subtotalLabelColor}>
                  Subtotal
                </Text>
                <Text className="text-[16px]" weight="bold" style={$subtotalValueColor}>
                  {formatMoney(subtotal, selectedOrder?.currency || "NGN")}
                </Text>
              </View>
            </View>

            {/* Deposit */}
            <View className="px-6 pt-6">
              <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
                Deposit Required
              </Text>
              <Text className="text-[13px] mb-3" style={$sectionDescriptionColor}>
                Defaults to 50% of the subtotal.
              </Text>
              <View className="rounded-lg border border-neutral300 bg-neutral100">
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
            <View className="px-6 pt-6">
              <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
                Due Date
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {DUE_DATE_OPTIONS.map((days) => (
                  <TouchableOpacity
                    key={days}
                    className="py-2 px-4 rounded-2xl border border-neutral300"
                    style={dueInDays === days ? $selectedChip : undefined}
                    onPress={() => setDueInDays(days)}
                  >
                    <Text
                      className="text-[14px]"
                      weight="medium"
                      style={dueInDays === days ? $selectedChipTextColor : $chipTextColor}
                    >
                      In {days} days
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  className="py-2 px-4 rounded-2xl border border-neutral300"
                  style={dueInDays === null ? $selectedChip : undefined}
                  onPress={() => setDueInDays(null)}
                >
                  <Text
                    className="text-[14px]"
                    weight="medium"
                    style={dueInDays === null ? $selectedChipTextColor : $chipTextColor}
                  >
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>
              {dueInDays === null ? (
                <View className="rounded-lg border border-neutral300 bg-neutral100 mt-3">
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
                <Text className="text-[13px] mt-3" style={$dueAtPreviewColor}>
                  Due {formatDate(new Date(Date.now() + dueInDays * 86400000).toISOString())}
                </Text>
              )}
            </View>

            {/* Notes */}
            <View className="px-6 pt-6">
              <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
                Notes
              </Text>
              <View className="rounded-lg border border-neutral300 bg-neutral100">
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
            <View className="px-6 pt-6">
              <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
                Status
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <TouchableOpacity
                  className="py-2 px-4 rounded-2xl border border-neutral300"
                  style={!sendNow ? $selectedChip : undefined}
                  onPress={() => setSendNow(false)}
                >
                  <Text
                    className="text-[14px]"
                    weight="medium"
                    style={!sendNow ? $selectedChipTextColor : $chipTextColor}
                  >
                    Save as Draft
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="py-2 px-4 rounded-2xl border border-neutral300"
                  style={sendNow ? $selectedChip : undefined}
                  onPress={() => setSendNow(true)}
                >
                  <Text
                    className="text-[14px]"
                    weight="medium"
                    style={sendNow ? $selectedChipTextColor : $chipTextColor}
                  >
                    Send Now
                  </Text>
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
            <View className="h-12" />
          </ScrollView>
        )}
      </Screen>
    )
  },
)

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities. Raw TextInput
// styles, the flex-ratio qty/amount inputs, selection-state order/radio/chip
// backgrounds, the flex ScrollView style, the Screen contentContainerStyle, and
// Button style overrides stay inline.
const $container: ViewStyle = {
  flex: 1,
}

// Screen's fixed preset gives its inner container no height; without flex the
// scrollable body collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

// Selection-state backgrounds/borders stay inline (conditional style).
const $selectedOrderRow: ViewStyle = {
  borderColor: colors.palette.primary500,
  backgroundColor: colors.palette.primary100,
}

const $radioSelected: ViewStyle = {
  borderColor: colors.palette.primary500,
  backgroundColor: colors.accent,
}

const $selectedChip: ViewStyle = {
  backgroundColor: colors.accent,
  borderColor: colors.palette.primary500,
}

// Flex-ratio number inputs stay inline (RN `flex: n` semantics).
const $qtyInput: ViewStyle = {
  flex: 1,
}

const $amountInput: ViewStyle = {
  flex: 2,
}

// Raw TextInput styles stay inline.
const $textInput: TextStyle = {
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  color: colors.palette.neutral900,
}

const $notesInput: TextStyle = {
  minHeight: 80,
}

// Button style overrides stay inline (Button owns its className).
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

// Text color overrides (static, light-only).
const $headerTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $sectionTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $sectionDescriptionColor: TextStyle = { color: colors.textDim }
const $orderNumberColor: TextStyle = { color: colors.palette.neutral900 }
const $orderMetaColor: TextStyle = { color: colors.textDim }
const $addItemTextColor: TextStyle = { color: colors.accent }
const $subtotalLabelColor: TextStyle = { color: colors.palette.neutral900 }
const $subtotalValueColor: TextStyle = { color: colors.accent }
const $chipTextColor: TextStyle = { color: colors.palette.neutral700 }
const $selectedChipTextColor: TextStyle = { color: colors.palette.neutral100 }
const $dueAtPreviewColor: TextStyle = { color: colors.textDim }
const $emptyTextColor: TextStyle = { color: colors.textDim }
