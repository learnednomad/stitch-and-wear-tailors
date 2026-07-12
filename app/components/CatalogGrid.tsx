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

/** deterministic soft placeholder tone (background + initial color) per category */
function placeholderToneIndex(category?: string, buckets: number = 6): number {
  const key = category || "other"
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 997
  return hash % buckets
}

export function CatalogGrid(props: CatalogGridProps) {
  const { items, onPressItem, emptyText } = props
  const { width } = useWindowDimensions()
  const { theme } = useAppTheme()
  const { palette } = theme.colors

  const placeholderTones = [
    { bg: palette.emerald100, fg: palette.emerald500 },
    { bg: palette.primary100, fg: palette.primary600 },
    { bg: palette.secondary100, fg: palette.secondary400 },
    { bg: palette.accent100, fg: palette.accent500 },
    { bg: palette.warning100, fg: palette.warning600 },
    { bg: palette.error100, fg: palette.error500 },
  ]

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
          style={[
            $card,
            {
              width: cardWidth,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => onPressItem?.(item)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={$image} resizeMode="cover" />
          ) : (
            <View
              style={[
                $placeholder,
                {
                  backgroundColor:
                    placeholderTones[placeholderToneIndex(item.category, placeholderTones.length)]
                      .bg,
                },
              ]}
            >
              <Text
                style={[
                  $placeholderInitial,
                  {
                    color:
                      placeholderTones[
                        placeholderToneIndex(item.category, placeholderTones.length)
                      ].fg,
                  },
                ]}
              >
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
              <Text style={[$price, { color: theme.colors.accent }]}>
                {formatNaira(item.price)}
              </Text>
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
  borderRadius: 16,
  borderWidth: 1,
  overflow: "hidden",
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
  fontSize: 36,
  fontWeight: "700",
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
