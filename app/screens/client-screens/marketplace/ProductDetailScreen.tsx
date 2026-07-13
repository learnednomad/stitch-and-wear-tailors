/**
 * ProductDetailScreen
 *
 * Full product view: image gallery, description, seller, price and stock.
 * Buyers pick a quantity and add it to the cart, then jump to the cart.
 */
import { FC, useState } from "react"
import { Image, ImageStyle, ScrollView, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Button, Chip, Icon, Screen, Text } from "@/components"
import { useProduct } from "@/api/marketplace"
import { errorMessage } from "@/api/common"
import { useCart } from "@/contexts/CartContext"
import { fileUrl } from "@/services/api/pocketbase-api-adapter"
import { formatNaira } from "@/utils/formatCurrency"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface ProductDetailScreenProps extends AppStackScreenProps<"ProductDetail"> {}

function labelize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export const ProductDetailScreen: FC<ProductDetailScreenProps> = 
  function ProductDetailScreen({ route, navigation }) {
    const { productId } = route.params
    const { theme } = useAppTheme()
    const { addProduct } = useCart()
    const [quantity, setQuantity] = useState(1)

    const productQuery = useProduct(productId)
    const product = productQuery.data
    const error = productQuery.error ? errorMessage(productQuery.error) : null

    const inStock = (product?.stock ?? 0) > 0
    const maxQty = product?.stock ?? 1

    const handleAddToCart = () => {
      if (!product) return
      addProduct(product, quantity)
      navigation.navigate("Cart")
    }

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
          <Text preset="subheading" text="Product" style={$headerTitle} />
        </View>

        {error && <Text style={[$error, { color: theme.colors.error }]} text={error} />}
        {productQuery.isLoading && !product && (
          <Text style={[$loading, { color: theme.colors.textDim }]} text="Loading..." />
        )}

        {product && (
          <>
            {product.images?.length ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={$gallery}
              >
                {product.images.map((img) => (
                  <Image
                    key={img}
                    source={{ uri: fileUrl(product, img, "600x600") }}
                    style={$galleryImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={[$galleryPlaceholder, { backgroundColor: theme.colors.palette.neutral200 }]}>
                <Text style={{ color: theme.colors.textDim }} text="No image" />
              </View>
            )}

            <View style={$body}>
              <Text preset="heading" text={product.name} />
              <View style={$metaRow}>
                <Chip text={labelize(product.category)} tone="neutral" />
                <Chip
                  text={inStock ? `${product.stock} in stock` : "Out of stock"}
                  tone={inStock ? "success" : "error"}
                />
              </View>
              {!!product.expand?.seller?.name && (
                <Text
                  style={[$seller, { color: theme.colors.textDim }]}
                  text={`Sold by ${product.expand.seller.name}`}
                />
              )}
              <Text style={[$price, { color: theme.colors.accent }]} text={formatNaira(product.price)} />

              {!!product.description && (
                <Text style={$description} text={product.description} />
              )}

              {inStock && (
                <View style={$qtyRow}>
                  <Text preset="formLabel" text="Quantity" />
                  <View style={$stepper}>
                    <TouchableOpacity
                      style={[$stepBtn, { borderColor: theme.colors.border }]}
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Text style={$stepBtnText} text="–" />
                    </TouchableOpacity>
                    <Text style={$qtyValue} text={String(quantity)} />
                    <TouchableOpacity
                      style={[$stepBtn, { borderColor: theme.colors.border }]}
                      onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    >
                      <Text style={$stepBtnText} text="+" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Button
                text={inStock ? "Add to Cart" : "Out of Stock"}
                onPress={handleAddToCart}
                disabled={!inStock}
                style={$addButton}
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

const $headerTitle: TextStyle = { flex: 1 }

const $error: TextStyle = { padding: spacing.md, textAlign: "center" }
const $loading: TextStyle = { padding: spacing.md, textAlign: "center" }

const $gallery: ViewStyle = {
  marginTop: spacing.sm,
}

const $galleryImage: ImageStyle = {
  width: 320,
  height: 320,
  borderRadius: 16,
  marginHorizontal: spacing.md,
}

const $galleryPlaceholder: ViewStyle = {
  height: 240,
  marginHorizontal: spacing.md,
  marginTop: spacing.sm,
  borderRadius: 16,
  justifyContent: "center",
  alignItems: "center",
}

const $body: ViewStyle = {
  padding: spacing.md,
}

const $metaRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.xs,
  marginTop: spacing.sm,
}

const $seller: TextStyle = {
  marginTop: spacing.sm,
  fontSize: 13,
}

const $price: TextStyle = {
  marginTop: spacing.sm,
  fontSize: 24,
  fontWeight: "700",
}

const $description: TextStyle = {
  marginTop: spacing.md,
  lineHeight: 21,
}

const $qtyRow: ViewStyle = {
  marginTop: spacing.lg,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $stepper: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
}

const $stepBtn: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 12,
  borderWidth: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $stepBtnText: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
}

const $qtyValue: TextStyle = {
  fontSize: 18,
  fontWeight: "700",
  minWidth: 24,
  textAlign: "center",
}

const $addButton: ViewStyle = {
  marginTop: spacing.lg,
}
