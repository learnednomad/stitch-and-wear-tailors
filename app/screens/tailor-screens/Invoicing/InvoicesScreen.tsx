import React, { FC, useCallback, useEffect, useState } from "react"
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
import { observer } from "mobx-react-lite"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon, Button } from "@/components"
import { colors, spacing } from "app/theme"
import {
  invoiceApi,
  formatMoney,
  InvoiceStatus,
  PBInvoiceRecord,
} from "@/services/api/invoice-api"
import { paymentApi, PBPaymentRecord } from "@/services/api/payment-api"
import {
  INVOICE_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  customerDisplayName,
} from "./invoicing-shared"

interface InvoicesScreenProps extends AppStackScreenProps<"Invoices"> {}

/**
 * Tailor invoice list: pending customer payment claims up top, status
 * filter chips, and the invoice list (newest first).
 */
export const InvoicesScreen: FC<InvoicesScreenProps> = observer(function InvoicesScreen() {
  const navigation = useNavigation<any>()

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [invoices, setInvoices] = useState<PBInvoiceRecord[]>([])
  const [claims, setClaims] = useState<PBPaymentRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all")
  const [error, setError] = useState<string | null>(null)
  const [actingClaimId, setActingClaimId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const [invoicesResult, claimsResult] = await Promise.all([
      invoiceApi.listByTailor(),
      paymentApi.listPendingClaims(),
    ])
    if (invoicesResult.success) {
      setInvoices(invoicesResult.data)
    } else {
      setError(invoicesResult.message ?? "Failed to load invoices")
    }
    if (claimsResult.success) setClaims(claimsResult.data)
    setIsLoading(false)
    setIsRefreshing(false)
  }, [])

  // Reload whenever the screen regains focus (after create/detail actions)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load)
    return unsubscribe
  }, [navigation, load])

  const onRefresh = () => {
    setIsRefreshing(true)
    load()
  }

  const handleClaim = async (claim: PBPaymentRecord, action: "confirm" | "reject") => {
    setActingClaimId(claim.id)
    const result =
      action === "confirm"
        ? await paymentApi.confirmClaim(claim.id)
        : await paymentApi.rejectClaim(claim.id)
    setActingClaimId(null)
    if (result.success) {
      load()
    } else {
      Alert.alert("Action Failed", result.message ?? `Could not ${action} the payment claim.`)
    }
  }

  const filtered =
    statusFilter === "all" ? invoices : invoices.filter((inv) => inv.status === statusFilter)

  const renderStatusChip = (status: InvoiceStatus) => {
    const palette = STATUS_COLORS[status] ?? STATUS_COLORS.draft
    return (
      <View style={[$statusChip, { backgroundColor: palette.bg }]}>
        <Text style={[$statusChipText, { color: palette.text }]}>
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
    >
      {/* Header */}
      <View style={$header}>
        <TouchableOpacity
          style={$backButton}
          onPress={() => navigation.goBack()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon icon="back" size={24} color={colors.palette.neutral900} />
        </TouchableOpacity>
        <Text style={$headerTitle}>Invoices</Text>
        <TouchableOpacity
          style={$backButton}
          onPress={() => navigation.navigate("CreateInvoice")}
          accessibilityLabel="New invoice"
          accessibilityRole="button"
        >
          <Text style={$plusText}>＋</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={$loadingContainer}>
          <ActivityIndicator size="large" color={colors.palette.primary500} />
        </View>
      ) : (
        <ScrollView
          style={$container}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.palette.primary500}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {error && <Text style={$errorText}>{error}</Text>}

          {/* Pending payment claims */}
          {claims.length > 0 && (
            <View style={$section}>
              <Text style={$sectionTitle}>Pending Payment Claims</Text>
              {claims.map((claim) => (
                <View key={claim.id} style={$claimCard}>
                  <View style={$claimInfo}>
                    <Text style={$claimAmount}>
                      {formatMoney(claim.amount, claim.currency)}
                    </Text>
                    <Text style={$claimMeta}>
                      Order {claim.expand?.order?.orderNumber ?? claim.order} ·{" "}
                      {claim.method.replace("_", " ")}
                      {claim.reference ? ` · ${claim.reference}` : ""}
                    </Text>
                  </View>
                  <View style={$claimActions}>
                    <TouchableOpacity
                      style={$confirmButton}
                      disabled={actingClaimId === claim.id}
                      onPress={() => handleClaim(claim, "confirm")}
                    >
                      <Text style={$confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={$rejectButton}
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
                      <Text style={$rejectButtonText}>Reject</Text>
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
                style={[$filterChip, statusFilter === status && $selectedFilterChip]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[$filterChipText, statusFilter === status && $selectedFilterChipText]}
                >
                  {status === "all" ? "All" : STATUS_LABELS[status]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Invoice list */}
          <View style={$section}>
            {filtered.length === 0 ? (
              <View style={$emptyContainer}>
                <Text style={$emptyTitle}>No invoices</Text>
                <Text style={$emptyText}>
                  {statusFilter === "all"
                    ? "Create your first invoice for an order with the + button."
                    : `No ${STATUS_LABELS[statusFilter as InvoiceStatus]} invoices.`}
                </Text>
              </View>
            ) : (
              filtered.map((invoice) => (
                <TouchableOpacity
                  key={invoice.id}
                  style={$invoiceCard}
                  onPress={() => navigation.navigate("InvoiceDetail", { invoiceId: invoice.id })}
                >
                  <View style={$invoiceTopRow}>
                    <Text style={$invoiceNumber}>{invoice.invoiceNumber}</Text>
                    {renderStatusChip(invoice.status)}
                  </View>
                  <Text style={$invoiceMeta}>
                    {customerDisplayName(invoice)} · Order{" "}
                    {invoice.expand?.order?.orderNumber ?? invoice.order}
                  </Text>
                  <View style={$invoiceBottomRow}>
                    <Text style={$invoiceAmount}>
                      {formatMoney(invoice.subtotal, invoice.currency)}
                    </Text>
                    <Text style={$invoiceDue}>Due {formatDate(invoice.dueAt)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <Button
            text="+ New Invoice"
            style={$newInvoiceButton}
            textStyle={$newInvoiceButtonText}
            onPress={() => navigation.navigate("CreateInvoice")}
          />
          <View style={$scrollFooterSpace} />
        </ScrollView>
      )}
    </Screen>
  )
})

// Styles
const $container: ViewStyle = {
  flex: 1,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $backButton: ViewStyle = {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
}

const $headerTitle: TextStyle = {
  flex: 1,
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.neutral900,
  textAlign: "center",
}

const $plusText: TextStyle = {
  fontSize: 22,
  fontWeight: "600",
  color: colors.palette.primary500,
}

const $errorText: TextStyle = {
  color: colors.palette.error500,
  fontSize: 13,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
}

const $section: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.sm,
}

const $claimCard: ViewStyle = {
  backgroundColor: colors.palette.warning100,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.sm,
}

const $claimInfo: ViewStyle = {
  marginBottom: spacing.sm,
}

const $claimAmount: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.neutral900,
}

const $claimMeta: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  marginTop: 2,
}

const $claimActions: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $confirmButton: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.success500,
  borderRadius: 8,
  paddingVertical: spacing.sm,
  alignItems: "center",
}

const $confirmButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

const $rejectButton: ViewStyle = {
  flex: 1,
  borderWidth: 1,
  borderColor: colors.palette.error500,
  borderRadius: 8,
  paddingVertical: spacing.sm,
  alignItems: "center",
}

const $rejectButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.error500,
}

const $filterScroll: ViewStyle = {
  flexGrow: 0,
  marginTop: spacing.md,
}

const $filterRow: ViewStyle = {
  paddingHorizontal: spacing.lg,
  gap: spacing.sm,
}

const $filterChip: ViewStyle = {
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.md,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $selectedFilterChip: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
}

const $filterChipText: TextStyle = {
  fontSize: 13,
  fontWeight: "500",
  color: colors.palette.neutral700,
}

const $selectedFilterChipText: TextStyle = {
  color: colors.palette.neutral100,
}

const $invoiceCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  padding: spacing.md,
  marginBottom: spacing.sm,
}

const $invoiceTopRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $invoiceNumber: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  color: colors.palette.neutral900,
}

const $statusChip: ViewStyle = {
  paddingVertical: 3,
  paddingHorizontal: spacing.sm,
  borderRadius: 12,
}

const $statusChipText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
}

const $invoiceMeta: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  marginTop: spacing.xs,
}

const $invoiceBottomRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: spacing.sm,
}

const $invoiceAmount: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: colors.palette.primary600,
}

const $invoiceDue: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
}

const $newInvoiceButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  marginHorizontal: spacing.lg,
  marginTop: spacing.md,
}

const $newInvoiceButtonText: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral100,
}

const $emptyContainer: ViewStyle = {
  alignItems: "center",
  paddingVertical: spacing.xl,
}

const $emptyTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
  marginBottom: spacing.xs,
}

const $emptyText: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  textAlign: "center",
  lineHeight: 18,
}

const $scrollFooterSpace: ViewStyle = {
  height: spacing.xxl,
}
