/**
 * CatalogScreen
 *
 * Browse the tailor's style catalog: search by name, filter by category,
 * tap a style for details and start an order from it.
 */
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import {
  Modal,
  RefreshControl,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Button, CatalogGrid, CatalogGridItem, Icon, Screen, Text, TextField } from "@/components"
import { catalogApi, PBCatalogStyle } from "@/services/api/catalog-api"
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

export const CatalogScreen: FC<CatalogScreenProps> = observer(function CatalogScreen({
  navigation,
}) {
  const { theme } = useAppTheme()
  const [styles, setStyles] = useState<PBCatalogStyle[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<PBCatalogStyle | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    const result = await catalogApi.listStyles(search ? { search } : {})
    if (result.success) {
      setStyles(result.data)
      setError(null)
    } else {
      setError(result.message ?? "Failed to load catalog")
    }
    setIsLoading(false)
  }, [search])

  useEffect(() => {
    load()
  }, [load])

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
        refreshControl: <RefreshControl refreshing={isLoading} onRefresh={load} />,
      }}
    >
      <View style={$headerRow}>
        {/* No back affordance when mounted as the Browse tab root */}
        {(navigation as any).getState()?.type !== "tab" && navigation.canGoBack() && (
          <TouchableOpacity
            style={$backButton}
            onPress={() => navigation.goBack()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text preset="heading" text="Style Catalog" style={$headingText} />
      </View>

      {/* browse siblings: grouped styles and fabrics */}
      <View style={$browseLinks}>
        <TouchableOpacity
          style={[$browseLink, { borderColor: theme.colors.border }]}
          onPress={() => (navigation as any).navigate("Styles")}
          accessible
          accessibilityLabel="Browse styles by group"
          accessibilityRole="button"
        >
          <Text style={[$browseLinkText, { color: theme.colors.tint }]} text="Styles by Group" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[$browseLink, { borderColor: theme.colors.border }]}
          onPress={() => (navigation as any).navigate("FabricSearch")}
          accessible
          accessibilityLabel="Browse fabrics"
          accessibilityRole="button"
        >
          <Text style={[$browseLinkText, { color: theme.colors.tint }]} text="Fabrics" />
        </TouchableOpacity>
      </View>

      <View style={$searchContainer}>
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
              style={[
                $chip,
                {
                  backgroundColor: active ? theme.colors.tint : theme.colors.palette.neutral100,
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
        <View style={$modalOverlay}>
          <View style={[$modalCard, { backgroundColor: theme.colors.background }]}>
            {selected && (
              <>
                <Text preset="subheading" text={selected.name} />
                <Text
                  style={[$modalMeta, { color: theme.colors.textDim }]}
                  text={`${labelize(selected.category)} · ${labelize(selected.gender)}`}
                />
                {!!selected.description && (
                  <Text style={$modalDescription} text={selected.description} />
                )}
                <Text
                  style={[$modalPrice, { color: theme.colors.tint }]}
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
})

const $root: ViewStyle = {
  flex: 1,
}

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

const $headingText: TextStyle = {
  flex: 1,
}

const $browseLinks: ViewStyle = {
  flexDirection: "row",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
}

const $browseLink: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
}

const $browseLinkText: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
}

const $searchContainer: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
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
}

const $modalDescription: TextStyle = {
  marginTop: spacing.sm,
  lineHeight: 20,
}

const $modalPrice: TextStyle = {
  marginTop: spacing.sm,
  fontSize: 18,
  fontWeight: "700",
}

const $modalButton: ViewStyle = {
  marginTop: spacing.md,
  marginBottom: spacing.xs,
}
