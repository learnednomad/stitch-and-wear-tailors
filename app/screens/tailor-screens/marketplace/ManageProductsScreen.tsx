/**
 * ManageProductsScreen (tailor)
 *
 * The seller's product listings: create, edit, toggle active and delete
 * marketplace products. A modal form handles create/edit. Image upload is not
 * wired yet (no picker dependency) — listings show a placeholder until images
 * are added from the PocketBase admin.
 */
import { useRouter } from "expo-router"
import { FC, useState } from "react"
import {
  Alert,
  Image,
  ImageStyle,
  Modal,
  RefreshControl,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Button, Chip, Icon, Screen, Switch, Text, TextField } from "@/components"
import { fileUrl } from "@/services/api/pocketbase-api-adapter"
import {
  useCreateProduct,
  useDeleteProduct,
  useMyProducts,
  useUpdateProduct,
} from "@/api/marketplace"
import { errorMessage } from "@/api/common"
import { PBProductRecord, ProductCategory } from "@/services/api/marketplace-api"
import { formatNaira } from "@/utils/formatCurrency"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"


const CATEGORIES: ProductCategory[] = [
  "menswear",
  "womenswear",
  "childrenswear",
  "accessories",
  "footwear",
  "fabric",
  "other",
]

function labelize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

interface FormState {
  name: string
  price: string
  stock: string
  category: ProductCategory
  description: string
  isActive: boolean
  /** newly picked local image URIs (replace existing images on save) */
  imageUris: string[]
}

const EMPTY_FORM: FormState = {
  name: "",
  price: "",
  stock: "0",
  category: "menswear",
  description: "",
  isActive: true,
  imageUris: [],
}

export const ManageProductsScreen: FC = 
  function ManageProductsScreen() {
    const router = useRouter()
    const { theme } = useAppTheme()
    const productsQuery = useMyProducts()
    const createProduct = useCreateProduct()
    const updateProduct = useUpdateProduct()
    const deleteProduct = useDeleteProduct()

    const products = productsQuery.data ?? []
    const error = productsQuery.error ? errorMessage(productsQuery.error) : null

    const [editing, setEditing] = useState<PBProductRecord | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)

    const openCreate = () => {
      setEditing(null)
      setForm(EMPTY_FORM)
      setFormOpen(true)
    }

    const openEdit = (product: PBProductRecord) => {
      setEditing(product)
      setForm({
        name: product.name,
        price: String(product.price ?? ""),
        stock: String(product.stock ?? 0),
        category: product.category,
        description: product.description ?? "",
        isActive: product.isActive ?? true,
        imageUris: [],
      })
      setFormOpen(true)
    }

    const pickImages = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photo access to add product images.")
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8,
      })
      if (!result.canceled) {
        setForm((f) => ({ ...f, imageUris: result.assets.map((a) => a.uri).slice(0, 5) }))
      }
    }

    const handleSave = async () => {
      const price = Number(form.price)
      const stock = Number(form.stock)
      if (!form.name.trim()) {
        Alert.alert("Missing name", "Please enter a product name.")
        return
      }
      if (!Number.isFinite(price) || price < 0) {
        Alert.alert("Invalid price", "Enter a valid price.")
        return
      }

      const input = {
        name: form.name.trim(),
        price,
        stock: Number.isFinite(stock) ? stock : 0,
        category: form.category,
        description: form.description.trim() || undefined,
        isActive: form.isActive,
        imageUris: form.imageUris.length ? form.imageUris : undefined,
      }

      try {
        if (editing) {
          await updateProduct.mutateAsync({ productId: editing.id, input })
        } else {
          await createProduct.mutateAsync(input)
        }
        setFormOpen(false)
      } catch (e: any) {
        Alert.alert("Save failed", e?.message ?? "Could not save the product.")
      }
    }

    const handleDelete = (product: PBProductRecord) => {
      Alert.alert("Delete product", `Delete "${product.name}"? This cannot be undone.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProduct.mutateAsync(product.id)
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not delete the product.")
            }
          },
        },
      ])
    }

    const isSaving = createProduct.isPending || updateProduct.isPending

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
          {router.canGoBack() && (
            <TouchableOpacity
              style={$backButton}
              onPress={() =>router.back()}
              accessible
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Icon icon="back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <Text preset="heading" text="My Products" style={$headingText} />
          <TouchableOpacity
            style={[$addButton, { backgroundColor: theme.colors.accent }]}
            onPress={openCreate}
            accessible
            accessibilityLabel="Add product"
            accessibilityRole="button"
          >
            <Text style={[$addButtonText, { color: theme.colors.palette.neutral100 }]} text="+ Add" />
          </TouchableOpacity>
        </View>

        {error && <Text style={[$error, { color: theme.colors.error }]} text={error} />}
        {!error && products.length === 0 && (
          <Text
            style={[$empty, { color: theme.colors.textDim }]}
            text={productsQuery.isLoading ? "Loading..." : "No products yet. Tap “+ Add” to list one."}
          />
        )}

        {products.map((product) => (
          <View
            key={product.id}
            style={[$card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            {product.images?.length ? (
              <Image
                source={{ uri: fileUrl(product, product.images[0], "300x200") }}
                style={$cardThumb}
                resizeMode="cover"
              />
            ) : null}
            <View style={$cardHeader}>
              <Text style={[$name, { color: theme.colors.text }]} text={product.name} numberOfLines={1} />
              <Chip
                text={product.isActive ? "Active" : "Hidden"}
                tone={product.isActive ? "success" : "neutral"}
              />
            </View>
            <Text
              style={[$meta, { color: theme.colors.textDim }]}
              text={`${labelize(product.category)} · ${formatNaira(product.price)} · ${
                product.stock ?? 0
              } in stock`}
            />
            <View style={$cardActions}>
              <TouchableOpacity onPress={() => openEdit(product)}>
                <Text style={[$actionText, { color: theme.colors.accent }]} text="Edit" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(product)}>
                <Text style={[$actionText, { color: theme.colors.error }]} text="Delete" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* create / edit form modal */}
        <Modal
          visible={formOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setFormOpen(false)}
        >
          <View style={$modalOverlay}>
            <View style={[$modalCard, { backgroundColor: theme.colors.background }]}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text preset="subheading" text={editing ? "Edit Product" : "New Product"} />
                <TextField
                  label="Name"
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  containerStyle={$field}
                />
                <View style={$row}>
                  <TextField
                    label="Price (₦)"
                    value={form.price}
                    onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                    keyboardType="numeric"
                    containerStyle={[$field, $rowItem]}
                  />
                  <TextField
                    label="Stock"
                    value={form.stock}
                    onChangeText={(v) => setForm((f) => ({ ...f, stock: v }))}
                    keyboardType="numeric"
                    containerStyle={[$field, $rowItem]}
                  />
                </View>

                <Text preset="formLabel" text="Category" style={$catLabel} />
                <View style={$chips}>
                  {CATEGORIES.map((cat) => {
                    const active = form.category === cat
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          $chip,
                          {
                            backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => setForm((f) => ({ ...f, category: cat }))}
                      >
                        <Text
                          style={[
                            $chipText,
                            { color: active ? theme.colors.palette.neutral100 : theme.colors.text },
                          ]}
                          text={labelize(cat)}
                        />
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <Text preset="formLabel" text="Photos" style={$catLabel} />
                <View style={$photoRow}>
                  {(form.imageUris.length
                    ? form.imageUris
                    : (editing?.images ?? []).map((img) => fileUrl(editing!, img, "200x200"))
                  ).map((uri) => (
                    <Image key={uri} source={{ uri }} style={$photoThumb} resizeMode="cover" />
                  ))}
                  <TouchableOpacity
                    style={[$photoAdd, { borderColor: theme.colors.border }]}
                    onPress={pickImages}
                    accessible
                    accessibilityLabel="Add photos"
                    accessibilityRole="button"
                  >
                    <Text style={[$photoAddText, { color: theme.colors.accent }]} text="+" />
                  </TouchableOpacity>
                </View>
                {form.imageUris.length > 0 && (
                  <Text
                    style={[$photoHint, { color: theme.colors.textDim }]}
                    text={`${form.imageUris.length} photo${
                      form.imageUris.length === 1 ? "" : "s"
                    } selected${editing ? " — will replace existing" : ""}`}
                  />
                )}

                <TextField
                  label="Description"
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                  multiline
                  containerStyle={$field}
                />

                <Switch
                  label="Active (visible in the shop)"
                  value={form.isActive}
                  onValueChange={(v) => setForm((f) => ({ ...f, isActive: !!v }))}
                  containerStyle={$toggle}
                />

                <Button
                  text={isSaving ? "Saving..." : editing ? "Save Changes" : "Create Product"}
                  onPress={handleSave}
                  disabled={isSaving}
                  style={$modalButton}
                />
                <Button text="Cancel" onPress={() => setFormOpen(false)} />
              </ScrollView>
            </View>
          </View>
        </Modal>
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

const $addButton: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 12,
}

const $addButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "700",
}

const $error: TextStyle = { padding: spacing.md, textAlign: "center" }
const $empty: TextStyle = { padding: spacing.md, textAlign: "center" }

const $card: ViewStyle = {
  marginHorizontal: spacing.md,
  marginTop: spacing.sm,
  borderRadius: 16,
  borderWidth: 1,
  padding: spacing.md,
}

const $cardThumb: ImageStyle = {
  width: "100%",
  height: 140,
  borderRadius: 12,
  marginBottom: spacing.sm,
}

const $cardHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $photoRow: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
}

const $photoThumb: ImageStyle = {
  width: 64,
  height: 64,
  borderRadius: 12,
}

const $photoAdd: ViewStyle = {
  width: 64,
  height: 64,
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: "dashed",
  justifyContent: "center",
  alignItems: "center",
}

const $photoAddText: TextStyle = {
  fontSize: 26,
  fontWeight: "600",
}

const $photoHint: TextStyle = {
  fontSize: 12,
  marginTop: spacing.xs,
}

const $name: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  flex: 1,
  marginRight: spacing.sm,
}

const $meta: TextStyle = {
  fontSize: 13,
  marginTop: spacing.xs,
}

const $cardActions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.lg,
  marginTop: spacing.sm,
}

const $actionText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
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
  maxHeight: "88%",
}

const $field: ViewStyle = {
  marginTop: spacing.sm,
}

const $row: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $rowItem: ViewStyle = {
  flex: 1,
}

const $catLabel: TextStyle = {
  marginTop: spacing.md,
  marginBottom: spacing.xs,
}

const $chips: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
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

const $toggle: ViewStyle = {
  marginTop: spacing.md,
}

const $modalButton: ViewStyle = {
  marginTop: spacing.lg,
  marginBottom: spacing.xs,
}
