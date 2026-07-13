/**
 * CatalogScreen
 *
 * Browse the tailor's style catalog: search by name, filter by category,
 * tap a style for details and start an order from it.
 */
import { FC, useMemo, useState } from "react"
import { Modal, RefreshControl, ScrollView, TouchableOpacity, View, ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Button, CatalogGrid, CatalogGridItem, Icon, Screen, Text, TextField } from "@/components"
import { useStyles } from "@/api/catalog"
import { errorMessage } from "@/api/common"
import { PBCatalogStyle } from "@/services/api/catalog-api"
import { fileUrl } from "@/services/api/pocketbase-api-adapter"
import { formatNaira } from "@/utils/formatCurrency"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface CatalogScreenProps extends AppStackScreenProps<"Catalog"> {}

/** "buba_sokoto" -> "Buba Sokoto" */
function labelize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export const CatalogScreen: FC<CatalogScreenProps> = function CatalogScreen({
  navigation,
}) {
  const { theme } = useAppTheme()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<PBCatalogStyle | null>(null)

  const stylesQuery = useStyles(search ? { search } : {})
  const styles = useMemo(() => stylesQuery.data ?? [], [stylesQuery.data])
  const isLoading = stylesQuery.isLoading
  const error = stylesQuery.error ? errorMessage(stylesQuery.error) : null

  // categories actually present in the data (plus "All")
  const categories = useMemo(
    () => [...new Set(styles.map((s) => s.category).filter(Boolean))].sort(),
    [styles],
  )

  const visible = category ? styles.filter((s) => s.category === category) : styles

  const gridItems: CatalogGridItem[] = visible.map((style) => ({
    id: style.id,
    title: style.name,
    subtitle: `${labelize(style.category)} · ${labelize(style.gender)}`,
    imageUrl: style.images?.length ? fileUrl(style, style.images[0], "300x300") : undefined,
    price: style.basePrice,
    category: style.category,
  }))

  const handleStartOrder = () => {
    setSelected(null)
    // NewOrder does not accept route params — style selection happens inside
    navigation.navigate("NewOrder")
  }

  return (
    <Screen
      style={$root}
      preset="scroll"
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={stylesQuery.isRefetching}
            onRefresh={() => stylesQuery.refetch()}
          />
        ),
      }}
    >
      <View className="flex-row items-center px-4 pt-4">
        {/* No back affordance when mounted as the Browse tab root */}
        {(navigation as any).getState()?.type !== "tab" && navigation.canGoBack() && (
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center"
            onPress={() => navigation.goBack()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text preset="heading" text="Style Catalog" className="flex-1" />
      </View>

      {/* browse siblings: grouped styles and fabrics */}
      <View className="flex-row gap-2 px-4 pt-3">
        <TouchableOpacity
          className="rounded-2xl border border-border px-3 py-2 dark:border-border-dark"
          onPress={() => (navigation as any).navigate("Styles")}
          accessible
          accessibilityLabel="Browse styles by group"
          accessibilityRole="button"
        >
          <Text
            className="text-[13px] font-semibold text-accent dark:text-accent-dark"
            text="Styles by Group"
          />
        </TouchableOpacity>
        <TouchableOpacity
          className="rounded-2xl border border-border px-3 py-2 dark:border-border-dark"
          onPress={() => (navigation as any).navigate("FabricSearch")}
          accessible
          accessibilityLabel="Browse fabrics"
          accessibilityRole="button"
        >
          <Text
            className="text-[13px] font-semibold text-accent dark:text-accent-dark"
            text="Fabrics"
          />
        </TouchableOpacity>
      </View>

      <View className="px-4 pt-3">
        <TextField
          placeholder="Search styles..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$chips}>
        {[null, ...categories].map((cat) => {
          const active = category === cat
          return (
            <TouchableOpacity
              key={cat ?? "all"}
              className="rounded-2xl border border-border px-3 py-2 dark:border-border-dark"
              style={{ backgroundColor: active ? theme.colors.accent : theme.colors.surface }}
              onPress={() => setCategory(cat)}
            >
              <Text
                className="text-[13px] font-semibold"
                style={{ color: active ? theme.colors.palette.neutral100 : theme.colors.text }}
                text={cat ? labelize(cat) : "All"}
              />
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {error ? (
        <Text
          className="p-4 text-center text-error dark:text-error-dark"
          text={error}
        />
      ) : (
        <CatalogGrid
          items={gridItems}
          onPressItem={(item) => setSelected(styles.find((s) => s.id === item.id) ?? null)}
          emptyText={isLoading ? "Loading styles..." : "No styles match your search"}
        />
      )}

      {/* style detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View className="flex-1 justify-end" style={$modalOverlay}>
          <View className="rounded-t-[20px] bg-background p-6 pb-8 dark:bg-background-dark">
            {selected && (
              <>
                <Text preset="subheading" text={selected.name} />
                <Text
                  className="mt-1 text-textDim dark:text-textDim-dark"
                  text={`${labelize(selected.category)} · ${labelize(selected.gender)}`}
                />
                {!!selected.description && (
                  <Text className="mt-3 leading-5" text={selected.description} />
                )}
                <Text
                  className="mt-3 text-[18px] font-bold text-accent dark:text-accent-dark"
                  text={`From ${formatNaira(selected.basePrice)}`}
                />
                <Button text="Start Order" onPress={handleStartOrder} style={$modalButton} />
                <Button text="Close" preset="default" onPress={() => setSelected(null)} />
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

// ScrollView contentContainerStyle prop — stays an inline style object.
const $chips: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  gap: spacing.xs,
}

// Fixed overlay tint (raw rgba, not a token) — stays inline.
const $modalOverlay: ViewStyle = {
  backgroundColor: "rgba(0, 0, 0, 0.4)",
}

// Button style override — Button owns its className; callers pass style inline.
const $modalButton: ViewStyle = {
  marginTop: spacing.md,
  marginBottom: spacing.xs,
}
