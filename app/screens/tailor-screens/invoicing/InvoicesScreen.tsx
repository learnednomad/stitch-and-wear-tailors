import { useRouter, useFocusEffect } from "expo-router"
import { FC, useCallback, useMemo, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native"
import { Screen, Text, Icon, Button } from "@/components"
import { colors, spacing } from "@/theme"
import { errorMessage } from "@/api/common"
import {
  useConfirmClaim,
  useOrderItemsForOrders,
  usePendingClaims,
  useRejectClaim,
  useTailorInvoices,
} from "@/api/invoices"
import { formatMoney, InvoiceStatus } from "@/services/api/invoice-api"
import { PBPaymentRecord } from "@/services/api/payment-api"
import {
  INVOICE_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  customerDisplayName,
  nameMapFromOrderItems,
} from "./invoicing-shared"


/**
 * Tailor invoice list: pending customer payment claims up top, status
 * filter chips, and the invoice list (newest first).
 */
export const InvoicesScreen: FC = function InvoicesScreen() {
  const router = useRouter()

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all")

  const invoicesQuery = useTailorInvoices()
  const claimsQuery = usePendingClaims()
  const confirmClaim = useConfirmClaim()
  const rejectClaim = useRejectClaim()

  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data])
  const claims = claimsQuery.data ?? []
  const isLoading = invoicesQuery.isLoading
  const error = invoicesQuery.error ? errorMessage(invoicesQuery.error) : null

  // Customer user records are usually not readable by tailors, so fall back
  // to the customer name captured in order_items specifications JSON —
  // a dependent query keyed on the order ids of invoices missing a name.
  const unnamed = useMemo(
    () => invoices.filter((inv) => !inv.expand?.customer?.name && !inv.expand?.customer?.firstName),
    [invoices],
  )
  const orderIds = useMemo(
    () => [...new Set(unnamed.map((inv) => inv.order).filter(Boolean))].sort(),
    [unnamed],
  )
  const orderItemsQuery = useOrderItemsForOrders(orderIds)
  const nameMap = useMemo(() => {
    if (!orderItemsQuery.data) return {}
    const orderCustomer: Record<string, string> = {}
    for (const inv of unnamed) orderCustomer[inv.order] = inv.customer
    return nameMapFromOrderItems(orderItemsQuery.data, orderCustomer)
  }, [orderItemsQuery.data, unnamed])

  // Refetch whenever the screen regains focus (after create/detail actions)
  useFocusEffect(
    useCallback(() => {
      invoicesQuery.refetch()
      claimsQuery.refetch()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  )

  const isRefreshing = invoicesQuery.isRefetching || claimsQuery.isRefetching
  const onRefresh = () => {
    invoicesQuery.refetch()
    claimsQuery.refetch()
  }

  const actingClaimId = confirmClaim.isPending
    ? confirmClaim.variables
    : rejectClaim.isPending
      ? rejectClaim.variables
      : null

  const handleClaim = (claim: PBPaymentRecord, action: "confirm" | "reject") => {
    const mutation = action === "confirm" ? confirmClaim : rejectClaim
    mutation.mutate(claim.id, {
      onError: (mutationError) => {
        Alert.alert(
          "Action Failed",
          errorMessage(mutationError) || `Could not ${action} the payment claim.`,
        )
      },
    })
  }

  const filtered =
    statusFilter === "all" ? invoices : invoices.filter((inv) => inv.status === statusFilter)

  const renderStatusChip = (status: InvoiceStatus) => {
    const palette = STATUS_COLORS[status] ?? STATUS_COLORS.draft
    return (
      <View className="py-[3px] px-3 rounded-xl" style={{ backgroundColor: palette.bg }}>
        <Text className="text-[12px]" weight="semiBold" style={{ color: palette.text }}>
          {STATUS_LABELS[status] ?? status}
        </Text>
      </View>
    )
  }

  return (
    <Screen
      backgroundColor={colors.palette.neutral100}
      safeAreaEdges={["top"]}
      preset="fixed"
      statusBarStyle="dark"
      contentContainerStyle={$screenContent}
    >
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-neutral200">
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center"
          onPress={() =>router.back()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon icon="back" size={24} color={colors.palette.neutral900} />
        </TouchableOpacity>
        <Text className="flex-1 text-[18px] text-center" weight="semiBold" style={$headerTitleColor}>
          Invoices
        </Text>
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center"
          onPress={() =>router.push("/invoices/new")}
          accessibilityLabel="New invoice"
          accessibilityRole="button"
        >
          <Text className="text-[22px]" weight="semiBold" style={$plusTextColor}>
            ＋
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={$container}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <Text className="text-[13px] px-6 py-3" style={$errorTextColor}>
              {error}
            </Text>
          )}

          {/* Pending payment claims */}
          {claims.length > 0 && (
            <View className="px-6 pt-4">
              <Text className="text-[16px] mb-3" weight="semiBold" style={$sectionTitleColor}>
                Pending Payment Claims
              </Text>
              {claims.map((claim) => (
                <View key={claim.id} className="rounded-xl bg-warning100 p-4 mb-3">
                  <View className="mb-3">
                    <Text className="text-[16px]" weight="bold" style={$claimAmountColor}>
                      {formatMoney(claim.amount, claim.currency)}
                    </Text>
                    <Text className="text-[13px] mt-0.5" style={$claimMetaColor}>
                      Order {claim.expand?.order?.orderNumber ?? claim.order} ·{" "}
                      {claim.method.replace("_", " ")}
                      {claim.reference ? ` · ${claim.reference}` : ""}
                    </Text>
                  </View>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 rounded-lg bg-success500 py-3 items-center"
                      disabled={actingClaimId === claim.id}
                      onPress={() => handleClaim(claim, "confirm")}
                    >
                      <Text className="text-[14px]" weight="semiBold" style={$confirmButtonTextColor}>
                        Confirm
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 rounded-lg border border-error500 py-3 items-center"
                      disabled={actingClaimId === claim.id}
                      onPress={() =>
                        Alert.alert("Reject Claim", "Reject this payment claim?", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Reject",
                            style: "destructive",
                            onPress: () => handleClaim(claim, "reject"),
                          },
                        ])
                      }
                    >
                      <Text className="text-[14px]" weight="semiBold" style={$rejectButtonTextColor}>
                        Reject
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Status filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={$filterScroll}
            contentContainerStyle={$filterRow}
          >
            {(["all", ...INVOICE_STATUSES] as (InvoiceStatus | "all")[]).map((status) => (
              <TouchableOpacity
                key={status}
                className="py-2 px-4 rounded-2xl border border-neutral300"
                style={statusFilter === status ? $selectedFilterChip : undefined}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  className="text-[13px]"
                  weight="medium"
                  style={statusFilter === status ? $selectedFilterChipTextColor : $filterChipTextColor}
                >
                  {status === "all" ? "All" : STATUS_LABELS[status]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Invoice list */}
          <View className="px-6 pt-4">
            {filtered.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-[16px] mb-2" weight="semiBold" style={$emptyTitleColor}>
                  No invoices
                </Text>
                <Text className="text-[13px] text-center leading-[18px]" style={$emptyTextColor}>
                  {statusFilter === "all"
                    ? "Create your first invoice for an order with the + button."
                    : `No ${STATUS_LABELS[statusFilter as InvoiceStatus]} invoices.`}
                </Text>
              </View>
            ) : (
              filtered.map((invoice) => (
                <TouchableOpacity
                  key={invoice.id}
                  className="rounded-2xl border border-border bg-surface p-4 mb-3"
                  onPress={() =>router.push(`/invoices/${invoice.id}`)}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[15px]" weight="bold" style={$invoiceNumberColor}>
                      {invoice.invoiceNumber}
                    </Text>
                    {renderStatusChip(invoice.status)}
                  </View>
                  <Text className="text-[13px] mt-2" style={$invoiceMetaColor}>
                    {customerDisplayName(invoice, nameMap)} · Order{" "}
                    {invoice.expand?.order?.orderNumber ?? invoice.order}
                  </Text>
                  <View className="flex-row items-center justify-between mt-3">
                    <Text className="text-[16px]" weight="bold" style={$invoiceAmountColor}>
                      {formatMoney(invoice.subtotal, invoice.currency)}
                    </Text>
                    <Text className="text-[13px]" style={$invoiceDueColor}>
                      Due {formatDate(invoice.dueAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <Button
            text="+ New Invoice"
            style={$newInvoiceButton}
            textStyle={$newInvoiceButtonText}
            onPress={() =>router.push("/invoices/new")}
          />
          <View className="h-12" />
        </ScrollView>
      )}
    </Screen>
  )
}

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (light in both schemes) — no `dark:` variants. Layout, spacing,
// and container backgrounds/borders are className token utilities. Data-driven
// status-chip colors, the selection-state filter-chip background, the flex/filter
// ScrollView styles + contentContainerStyle, the Screen contentContainerStyle,
// and Button style overrides stay inline.
//
// Screen's fixed preset gives its inner container no height; without flex the
// invoice list collapses to zero height.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  flex: 1,
}

// Horizontal filter ScrollView style + its contentContainerStyle take style objects.
const $filterScroll: ViewStyle = {
  flexGrow: 0,
  marginTop: spacing.md,
}

const $filterRow: ViewStyle = {
  paddingHorizontal: spacing.lg,
  gap: spacing.sm,
}

// Selection-state filter-chip background/border stays inline (conditional style).
const $selectedFilterChip: ViewStyle = {
  backgroundColor: colors.accent,
  borderColor: colors.accent,
}

// Button style overrides stay inline (Button owns its className).
const $newInvoiceButton: ViewStyle = {
  backgroundColor: colors.accent,
  borderRadius: 12,
  marginHorizontal: spacing.lg,
  marginTop: spacing.md,
}

const $newInvoiceButtonText: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

// Text color overrides (static, light-only).
const $headerTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $plusTextColor: TextStyle = { color: colors.accent }
const $errorTextColor: TextStyle = { color: colors.palette.error500 }
const $sectionTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $claimAmountColor: TextStyle = { color: colors.palette.neutral900 }
const $claimMetaColor: TextStyle = { color: colors.textDim }
const $confirmButtonTextColor: TextStyle = { color: colors.palette.neutral100 }
const $rejectButtonTextColor: TextStyle = { color: colors.palette.error500 }
const $filterChipTextColor: TextStyle = { color: colors.palette.neutral700 }
const $selectedFilterChipTextColor: TextStyle = { color: colors.palette.neutral100 }
const $invoiceNumberColor: TextStyle = { color: colors.palette.neutral900 }
const $invoiceMetaColor: TextStyle = { color: colors.textDim }
const $invoiceAmountColor: TextStyle = { color: colors.accent }
const $invoiceDueColor: TextStyle = { color: colors.textDim }
const $emptyTitleColor: TextStyle = { color: colors.palette.neutral900 }
const $emptyTextColor: TextStyle = { color: colors.textDim }
