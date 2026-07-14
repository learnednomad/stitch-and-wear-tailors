/**
 * CheckoutScreen
 *
 * Collects shipping/contact details and the (offline) payment method, then
 * turns the cart into marketplace orders — one per seller. Mirroring the rest
 * of the app there is no payment gateway: orders are created as
 * `pending_payment` with the buyer's payment reference for the seller to
 * confirm. On success the cart is cleared and the buyer lands on My Purchases.
 */
import { useRouter } from "expo-router"
import { FC, useMemo, useState } from "react"
import { Alert, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { Button, Icon, Screen, Text, TextField } from "@/components"
import { usePlaceOrder } from "@/api/marketplace"
import { MarketplacePaymentMethod } from "@/services/api/marketplace-api"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { formatNaira } from "@/utils/formatCurrency"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"


const PAYMENT_METHODS: Array<{ value: MarketplacePaymentMethod; label: string }> = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash on Delivery" },
  { value: "pos", label: "POS" },
  { value: "other", label: "Other" },
]

export const CheckoutScreen: FC = function CheckoutScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const { user } = useAuth()
  const { lines, subtotal, clear } = useCart()
  const placeOrder = usePlaceOrder()

  const [contactName, setContactName] = useState<string>(user?.name ?? "")
  const [contactPhone, setContactPhone] = useState<string>((user as any)?.phone ?? "")
  const [shippingAddress, setShippingAddress] = useState("")
  const [method, setMethod] = useState<MarketplacePaymentMethod>("bank_transfer")
  const [reference, setReference] = useState("")

  // group cart lines by seller — one order per seller
  const sellerGroups = useMemo(() => {
    const groups = new Map<string, typeof lines>()
    for (const line of lines) {
      const list = groups.get(line.sellerId) ?? []
      list.push(line)
      groups.set(line.sellerId, list)
    }
    return groups
  }, [lines])

  const handlePlaceOrder = async () => {
    if (!contactName.trim() || !contactPhone.trim() || !shippingAddress.trim()) {
      Alert.alert("Missing details", "Please fill in your name, phone and delivery address.")
      return
    }
    if (lines.length === 0) return

    try {
      for (const [sellerId, sellerLines] of sellerGroups) {
        await placeOrder.mutateAsync({
          sellerId,
          items: sellerLines.map((l) => ({
            productId: l.productId,
            name: l.name,
            price: l.price,
            quantity: l.quantity,
            image: l.image,
          })),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          shippingAddress: shippingAddress.trim(),
          paymentMethod: method,
          paymentReference: reference.trim() || undefined,
          currency: sellerLines[0]?.currency ?? "NGN",
        })
      }
      clear()
      Alert.alert(
        "Order placed",
        "Your order has been placed. The seller will confirm your payment shortly.",
        [{ text: "OK", onPress: () =>router.push("/purchases") }],
      )
    } catch (e: any) {
      Alert.alert("Checkout failed", e?.message ?? "Could not place your order. Please try again.")
    }
  }

  return (
    <Screen style={$root} preset="scroll" safeAreaEdges={["top"]}>
      <View style={$headerRow}>
        <TouchableOpacity
          style={$backButton}
          onPress={() =>router.back()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon icon="back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text preset="heading" text="Checkout" style={$headingText} />
      </View>

      <View style={$section}>
        <Text preset="subheading" text="Delivery details" style={$sectionTitle} />
        <TextField
          label="Full name"
          value={contactName}
          onChangeText={setContactName}
          autoCorrect={false}
          autoComplete="name"
          containerStyle={$field}
        />
        <TextField
          label="Phone"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          containerStyle={$field}
        />
        <TextField
          label="Delivery address"
          value={shippingAddress}
          onChangeText={setShippingAddress}
          multiline
          containerStyle={$field}
        />
      </View>

      <View style={$section}>
        <Text preset="subheading" text="Payment method" style={$sectionTitle} />
        <View style={$methodChips}>
          {PAYMENT_METHODS.map((option) => {
            const active = method === option.value
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  $chip,
                  {
                    backgroundColor: active ? theme.colors.accent : theme.colors.surface,
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
          label="Payment reference (optional)"
          placeholder="Transfer reference or note"
          value={reference}
          onChangeText={setReference}
          containerStyle={$field}
        />
      </View>

      <View style={$section}>
        <View style={$summaryRow}>
          <Text style={[$summaryLabel, { color: theme.colors.textDim }]} text="Total" />
          <Text style={[$summaryValue, { color: theme.colors.text }]} text={formatNaira(subtotal)} />
        </View>
        <Button
          text={placeOrder.isPending ? "Placing order..." : "Place Order"}
          onPress={handlePlaceOrder}
          disabled={placeOrder.isPending || lines.length === 0}
        />
      </View>
    </Screen>
  )
}

const $root: ViewStyle = { flex: 1 }

const $headerRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
}

const $backButton: ViewStyle = {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.xs,
}

const $headingText: TextStyle = { flex: 1 }

const $section: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
}

const $sectionTitle: TextStyle = {
  marginBottom: spacing.sm,
}

const $field: ViewStyle = {
  marginBottom: spacing.sm,
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

const $summaryRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
}

const $summaryLabel: TextStyle = {
  fontSize: 15,
}

const $summaryValue: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
}
