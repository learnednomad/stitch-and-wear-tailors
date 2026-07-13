/**
 * FabricSearchScreen
 *
 * Search and filter the fabric catalog. Calls catalog-api directly — the
 * legacy FabricStore flows still target unwired /api mock endpoints and
 * its model shape doesn't match the PB schema.
 */
import { FC, useMemo, useState } from "react"
import { RefreshControl, ScrollView, TouchableOpacity, View, ViewStyle } from "react-native"
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

export const FabricSearchScreen: FC<FabricSearchScreenProps> = 
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
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center"
            onPress={() => navigation.goBack()}
            accessible
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon icon="back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text preset="heading" text="Fabrics" className="flex-1" />
        </View>
        <View className="px-4 pt-3">
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
                className="rounded-2xl border border-border px-3 py-2 dark:border-border-dark"
                style={{ backgroundColor: active ? theme.colors.accent : theme.colors.surface }}
                onPress={() => setType(option)}
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: active ? theme.colors.palette.neutral100 : theme.colors.text }}
                  text={option ? labelize(option) : "All"}
                />
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {error ? (
          <Text className="p-4 text-center text-error dark:text-error-dark" text={error} />
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
          className="p-4 text-center text-[12px] text-textDim dark:text-textDim-dark"
          text="Prices shown are per meter"
        />
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
