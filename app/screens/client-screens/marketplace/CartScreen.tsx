/**
 * CartScreen
 *
 * Review cart lines, adjust quantities, remove items and proceed to checkout.
 * The cart is client-side (CartContext); checkout turns it into an order.
 */
import { FC } from "react"
import { Image, ImageStyle, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Button, Icon, Screen, Text } from "@/components"
import { useCart } from "@/contexts/CartContext"
import { formatNaira } from "@/utils/formatCurrency"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface CartScreenProps extends AppStackScreenProps<"Cart"> {}

export const CartScreen: FC<CartScreenProps> = function CartScreen({ navigation }) {
  const { theme } = useAppTheme()
  const { lines, subtotal, setQuantity, removeProduct } = useCart()

  return (
    <Screen style={$root} preset="scroll" safeAreaEdges={["top"]}>
      <View style={$headerRow}>
        <TouchableOpacity
          style={$backButton}
          onPress={() => navigation.goBack()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon icon="back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text preset="heading" text="Cart" style={$headingText} />
      </View>

      {lines.length === 0 ? (
        <View style={$empty}>
          <Text style={[$emptyText, { color: theme.colors.textDim }]} text="Your cart is empty." />
          <Button
            text="Browse products"
            preset="default"
            onPress={() => navigation.navigate("Marketplace")}
            style={$browseButton}
          />
        </View>
      ) : (
        <>
          {lines.map((line) => (
            <View
              key={line.productId}
              style={[$card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              {line.image ? (
                <Image source={{ uri: line.image }} style={$thumb} resizeMode="cover" />
              ) : (
                <View style={[$thumb, { backgroundColor: theme.colors.palette.neutral200 }]} />
              )}
              <View style={$cardBody}>
                <Text style={[$name, { color: theme.colors.text }]} text={line.name} numberOfLines={2} />
                <Text style={[$linePrice, { color: theme.colors.accent }]} text={formatNaira(line.price)} />
                <View style={$controls}>
                  <View style={$stepper}>
                    <TouchableOpacity
                      style={[$stepBtn, { borderColor: theme.colors.border }]}
                      onPress={() => setQuantity(line.productId, line.quantity - 1)}
                    >
                      <Text style={$stepBtnText} text="–" />
                    </TouchableOpacity>
                    <Text style={$qtyValue} text={String(line.quantity)} />
                    <TouchableOpacity
                      style={[$stepBtn, { borderColor: theme.colors.border }]}
                      onPress={() =>
                        setQuantity(
                          line.productId,
                          line.stock ? Math.min(line.quantity + 1, line.stock) : line.quantity + 1,
                        )
                      }
                    >
                      <Text style={$stepBtnText} text="+" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeProduct(line.productId)}>
                    <Text style={[$remove, { color: theme.colors.error }]} text="Remove" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <View style={$summary}>
            <View style={$summaryRow}>
              <Text style={[$summaryLabel, { color: theme.colors.textDim }]} text="Subtotal" />
              <Text style={[$summaryValue, { color: theme.colors.text }]} text={formatNaira(subtotal)} />
            </View>
            <Button
              text="Proceed to Checkout"
              onPress={() => navigation.navigate("Checkout")}
              style={$checkoutButton}
            />
          </View>
        </>
      )}
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

const $empty: ViewStyle = {
  padding: spacing.xl,
  alignItems: "center",
}

const $emptyText: TextStyle = {
  marginBottom: spacing.md,
}

const $browseButton: ViewStyle = {
  minWidth: 200,
}

const $card: ViewStyle = {
  flexDirection: "row",
  marginHorizontal: spacing.md,
  marginBottom: spacing.sm,
  borderRadius: 16,
  borderWidth: 1,
  padding: spacing.sm,
}

const $thumb: ImageStyle = {
  width: 72,
  height: 72,
  borderRadius: 12,
}

const $cardBody: ViewStyle = {
  flex: 1,
  marginLeft: spacing.sm,
}

const $name: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
}

const $linePrice: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  marginTop: 2,
}

const $controls: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: spacing.sm,
}

const $stepper: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
}

const $stepBtn: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  borderWidth: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $stepBtnText: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
}

const $qtyValue: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  minWidth: 20,
  textAlign: "center",
}

const $remove: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
}

const $summary: ViewStyle = {
  padding: spacing.md,
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

const $checkoutButton: ViewStyle = {}
