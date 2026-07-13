/**
 * MarketplaceScreen (Shop tab)
 *
 * Browse ready-made products for sale: search by name, filter by category,
 * tap a product for its detail page. A cart button in the header shows the
 * current item count and opens the cart.
 */
import { FC, useMemo, useState } from "react"
import { RefreshControl, ScrollView, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { CatalogGrid, CatalogGridItem, Icon, Screen, Text, TextField } from "@/components"
import { useProducts } from "@/api/marketplace"
import { errorMessage } from "@/api/common"
import { useCart } from "@/contexts/CartContext"
import { fileUrl } from "@/services/api/pocketbase-api-adapter"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface MarketplaceScreenProps extends AppStackScreenProps<"Marketplace"> {}

/** "menswear" -> "Menswear", "buba_sokoto" -> "Buba Sokoto" */
function labelize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export const MarketplaceScreen: FC<MarketplaceScreenProps> = function MarketplaceScreen({
  navigation,
}) {
  const { theme } = useAppTheme()
  const { count } = useCart()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string | null>(null)

  const productsQuery = useProducts(search ? { search } : {})
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const error = productsQuery.error ? errorMessage(productsQuery.error) : null

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products],
  )

  const visible = category ? products.filter((p) => p.category === category) : products

  const gridItems: CatalogGridItem[] = visible.map((product) => ({
    id: product.id,
    title: product.name,
    subtitle: labelize(product.category),
    imageUrl: product.images?.length ? fileUrl(product, product.images[0], "300x300") : undefined,
    price: product.price,
    category: product.category,
  }))

  return (
    <Screen
      style={$root}
      preset="scroll"
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={productsQuery.isRefetching}
            onRefresh={() => productsQuery.refetch()}
          />
        ),
      }}
    >
      <View style={$headerRow}>
        <Text preset="heading" text="Shop" style={$headingText} />
        <TouchableOpacity
          style={$cartButton}
          onPress={() => navigation.navigate("Cart")}
          accessible
          accessibilityLabel={`Cart, ${count} items`}
          accessibilityRole="button"
        >
          <Icon icon="coins" size={24} color={theme.colors.text} />
          {count > 0 && (
            <View style={[$cartBadge, { backgroundColor: theme.colors.accent }]}>
              <Text
                style={[$cartBadgeText, { color: theme.colors.palette.neutral100 }]}
                text={String(count)}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={$searchContainer}>
        <TextField
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={$linksRow}>
        <TouchableOpacity
          style={[$link, { borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate("MyPurchases")}
          accessible
          accessibilityLabel="View my purchases"
          accessibilityRole="button"
        >
          <Text style={[$linkText, { color: theme.colors.accent }]} text="My Purchases" />
        </TouchableOpacity>
      </View>

      {/* category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$chips}>
        {[null, ...categories].map((cat) => {
          const active = category === cat
          return (
            <TouchableOpacity
              key={cat ?? "all"}
              style={[
                $chip,
                {
                  backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  $chipText,
                  { color: active ? theme.colors.palette.neutral100 : theme.colors.text },
                ]}
                text={cat ? labelize(cat) : "All"}
              />
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {error ? (
        <Text style={[$error, { color: theme.colors.error }]} text={error} />
      ) : (
        <CatalogGrid
          items={gridItems}
          onPressItem={(item) => navigation.navigate("ProductDetail", { productId: item.id })}
          emptyText={productsQuery.isLoading ? "Loading products..." : "No products found"}
        />
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

const $headingText: TextStyle = { flex: 1 }

const $cartButton: ViewStyle = {
  width: 44,
  height: 44,
  justifyContent: "center",
  alignItems: "center",
}

const $cartBadge: ViewStyle = {
  position: "absolute",
  top: 2,
  right: 2,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  paddingHorizontal: 4,
  justifyContent: "center",
  alignItems: "center",
}

const $cartBadgeText: TextStyle = {
  fontSize: 11,
  fontWeight: "700",
}

const $searchContainer: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
}

const $linksRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
}

const $link: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
}

const $linkText: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
}

const $chips: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  gap: spacing.xs,
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

const $error: TextStyle = {
  padding: spacing.md,
  textAlign: "center",
}
