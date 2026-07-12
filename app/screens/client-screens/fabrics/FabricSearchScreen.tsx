/**
 * FabricSearchScreen
 *
 * Search and filter the fabric catalog. Calls catalog-api directly — the
 * legacy FabricStore flows still target unwired /api mock endpoints and
 * its model shape doesn't match the PB schema.
 */
import { FC, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import {
  RefreshControl,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { CatalogGrid, Icon, Screen, Text, TextField } from "@/components"
import { useFabrics } from "@/api/catalog"
import { errorMessage } from "@/api/common"
import { fileUrl } from "@/services/api/pocketbase-api-adapter"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

interface FabricSearchScreenProps extends AppStackScreenProps<"FabricSearch"> {}

/** "senator_material" -> "Senator Material" */
function labelize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export const FabricSearchScreen: FC<FabricSearchScreenProps> = observer(
  function FabricSearchScreen({ navigation }) {
    const { theme } = useAppTheme()
    const [search, setSearch] = useState("")
    const [type, setType] = useState<string | null>(null)

    const fabricsQuery = useFabrics(search ? { search } : {})
    const fabrics = useMemo(() => fabricsQuery.data ?? [], [fabricsQuery.data])
    const isLoading = fabricsQuery.isLoading
    const error = fabricsQuery.error ? errorMessage(fabricsQuery.error) : null

    // fabric types present in the data (plus "All")
    const types = useMemo(
      () => [...new Set(fabrics.map((f) => f.type).filter(Boolean))].sort(),
      [fabrics],
    )

    const visible = type ? fabrics.filter((f) => f.type === type) : fabrics

    return (
      <Screen
        style={$root}
        preset="scroll"
        safeAreaEdges={["top"]}
        ScrollViewProps={{
          refreshControl: (
            <RefreshControl
              refreshing={fabricsQuery.isRefetching}
              onRefresh={() => fabricsQuery.refetch()}
            />
          ),
        }}
      >
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
          <Text preset="heading" text="Fabrics" style={$headingText} />
        </View>
        <View style={$searchContainer}>
          <TextField
            placeholder="Search fabrics..."
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* fabric type filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={$chips}
        >
          {[null, ...types].map((option) => {
            const active = type === option
            return (
              <TouchableOpacity
                key={option ?? "all"}
                style={[
                  $chip,
                  {
                    backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setType(option)}
              >
                <Text
                  style={[
                    $chipText,
                    { color: active ? theme.colors.palette.neutral100 : theme.colors.text },
                  ]}
                  text={option ? labelize(option) : "All"}
                />
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {error ? (
          <Text style={[$error, { color: theme.colors.error }]} text={error} />
        ) : (
          <CatalogGrid
            items={visible.map((fabric) => ({
              id: fabric.id,
              title: fabric.name,
              // price shown per meter; subtitle carries stock info
              subtitle:
                fabric.availableQuantity > 0
                  ? `${labelize(fabric.type)} · ${fabric.availableQuantity}m in stock`
                  : `${labelize(fabric.type)} · Out of stock`,
              imageUrl: fabric.images?.length
                ? fileUrl(fabric, fabric.images[0], "300x300")
                : undefined,
              price: fabric.pricePerMeter,
              category: fabric.type,
            }))}
            emptyText={isLoading ? "Loading fabrics..." : "No fabrics match your search"}
          />
        )}
        <Text
          style={[$footnote, { color: theme.colors.textDim }]}
          text="Prices shown are per meter"
        />
      </Screen>
    )
  },
)

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

const $footnote: TextStyle = {
  fontSize: 12,
  textAlign: "center",
  padding: spacing.md,
}
