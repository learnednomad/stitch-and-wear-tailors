/**
 * CatalogGrid
 *
 * Responsive image-card grid for catalog browsing (styles, fabrics).
 * 2 columns on phones, 3-4 on wider layouts via useWindowDimensions.
 * Items without an image render a colored placeholder block with the
 * item's category initial.
 */
import { useMemo } from "react"
import {
  Image,
  ImageStyle,
  TextStyle,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native"
import { Text } from "./Text"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { formatNaira } from "@/utils/formatCurrency"

export interface CatalogGridItem {
  id: string
  title: string
  subtitle?: string
  /** already-resolved image URL (use fileUrl) — placeholder shown when empty */
  imageUrl?: string
  price?: number
  /** used for the placeholder initial + color bucket */
  category?: string
}

interface CatalogGridProps {
  items: CatalogGridItem[]
  onPressItem?: (item: CatalogGridItem) => void
  /** rendered under the grid when items is empty */
  emptyText?: string
}

/** deterministic placeholder color per category */
const PLACEHOLDER_COLORS = ["#D4A574", "#4A6B8C", "#8B9D83", "#C85450", "#E8B04B", "#2C2E33"]

function placeholderColor(category?: string): string {
  const key = category || "other"
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 997
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length]
}

export function CatalogGrid(props: CatalogGridProps) {
  const { items, onPressItem, emptyText } = props
  const { width } = useWindowDimensions()
  const { theme } = useAppTheme()

  // 2 columns on phones, 3 on small tablets, 4 on wide layouts
  const columns = width >= 1024 ? 4 : width >= 768 ? 3 : 2
  const cardWidth = useMemo(() => {
    const horizontalPadding = spacing.md * 2
    const gaps = spacing.sm * (columns - 1)
    return (width - horizontalPadding - gaps) / columns
  }, [width, columns])

  if (items.length === 0) {
    return (
      <View style={$empty}>
        <Text text={emptyText ?? "Nothing here yet"} style={{ color: theme.colors.textDim }} />
      </View>
    )
  }

  return (
    <View style={$grid}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[$card, { width: cardWidth, backgroundColor: theme.colors.palette.neutral100 }]}
          onPress={() => onPressItem?.(item)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={$image} resizeMode="cover" />
          ) : (
            <View style={[$placeholder, { backgroundColor: placeholderColor(item.category) }]}>
              <Text style={$placeholderInitial}>
                {(item.category || item.title).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={$cardBody}>
            <Text style={[$title, { color: theme.colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!!item.subtitle && (
              <Text style={[$subtitle, { color: theme.colors.textDim }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
            {item.price !== undefined && (
              <Text style={[$price, { color: theme.colors.tint }]}>{formatNaira(item.price)}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const $grid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
}

const $card: ViewStyle = {
  borderRadius: 12,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
}

const $image: ImageStyle = {
  width: "100%",
  height: 120,
}

const $placeholder: ViewStyle = {
  width: "100%",
  height: 120,
  justifyContent: "center",
  alignItems: "center",
}

const $placeholderInitial: TextStyle = {
  fontSize: 40,
  fontWeight: "700",
  color: "rgba(255, 255, 255, 0.9)",
}

const $cardBody: ViewStyle = {
  padding: spacing.sm,
}

const $title: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
}

const $subtitle: TextStyle = {
  fontSize: 12,
  marginTop: 2,
}

const $price: TextStyle = {
  fontSize: 13,
  fontWeight: "700",
  marginTop: spacing.xxs,
}

const $empty: ViewStyle = {
  padding: spacing.xl,
  alignItems: "center",
}
