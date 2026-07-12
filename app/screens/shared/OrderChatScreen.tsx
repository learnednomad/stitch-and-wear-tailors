/**
 * OrderChatScreen
 *
 * In-order chat between the customer and the assigned tailor. Loads the raw
 * PocketBase order (for the counterpart's identity), lists the order's
 * messages oldest-first, marks incoming unread messages as read, and stays
 * live via a realtime subscription filtered to the order. When the order has
 * no tailor yet the input is disabled with an explanatory empty state.
 */

import React, { FC, useCallback, useEffect, useState } from "react"
import { View, FlatList, TouchableOpacity, ViewStyle, TextStyle, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Icon, Text, TextField, ChatBubble } from "app/components"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "app/theme"
import { useNavigation } from "@react-navigation/native"
import { messageApi, PBMessageRecord } from "@/services/api/message-api"
import { getPocketBaseAdapter, filters, COLLECTIONS } from "@/services/api/pocketbase-api-adapter"
import { realtimeManager } from "@/services/realtime/RealtimeManager"
import { PBOrderRecord, PBOrderItemRecord } from "@/services/api/order-api"

/** Display name for an expanded users record */
function userName(user?: Record<string, any> | null): string {
  if (!user) return ""
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
  return full || user.name || user.email || ""
}

interface OrderChatScreenProps extends AppStackScreenProps<"OrderChat"> {}

export const OrderChatScreen: FC<OrderChatScreenProps> = observer(({ route }) => {
  const navigation = useNavigation()
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])
  const { orderId } = route?.params || { orderId: "" }

  const adapter = getPocketBaseAdapter()
  const currentUserId = adapter.currentUserId

  const [pbOrder, setPbOrder] = useState<PBOrderRecord | null>(null)
  const [customerFallbackName, setCustomerFallbackName] = useState("")
  const [messages, setMessages] = useState<PBMessageRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [draft, setDraft] = useState("")

  // The other party on the order (empty while unassigned). Note: the users
  // view rule only exposes tailor records to other users, so when a tailor is
  // viewing, expand.customer is empty and the name falls back to the
  // customerInfo stored on the order_item specifications.
  const counterpartId =
    pbOrder?.customer === currentUserId ? (pbOrder?.tailor ?? "") : (pbOrder?.customer ?? "")
  const counterpartName =
    pbOrder?.customer === currentUserId
      ? userName(pbOrder?.expand?.tailor)
      : userName(pbOrder?.expand?.customer) || customerFallbackName
  const hasTailor = !!pbOrder?.tailor
  const canChat = hasTailor && !!counterpartId

  /** Mark an incoming message read (server + local state) */
  const markIncomingRead = useCallback(
    (message: PBMessageRecord) => {
      if (message.recipient !== currentUserId || message.isRead) return
      messageApi.markRead(message.id)
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m)),
      )
    },
    [currentUserId],
  )

  // Initial load: order (with parties expanded) + messages, then mark unread
  // incoming messages as read
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!orderId) {
        setIsLoading(false)
        return
      }
      const [orderResult, messagesResult] = await Promise.all([
        adapter.getOne<PBOrderRecord>(COLLECTIONS.ORDERS, orderId, "customer,tailor"),
        messageApi.listByOrder(orderId),
      ])
      if (cancelled) return
      if (orderResult.success) {
        setPbOrder(orderResult.data)
        // Tailor viewers cannot expand the customer user record (users view
        // rule) — recover the display name from the order_item specifications
        if (
          orderResult.data.customer !== currentUserId &&
          !orderResult.data.expand?.customer
        ) {
          adapter
            .getFirst<PBOrderItemRecord>(
              COLLECTIONS.ORDER_ITEMS,
              filters.eq("order", orderId),
            )
            .then((itemResult) => {
              if (cancelled || !itemResult.success || !itemResult.data) return
              const specs = itemResult.data.specifications
              const info =
                specs && typeof specs === "object" ? (specs as any).customerInfo : undefined
              const name = `${info?.firstName ?? ""} ${info?.lastName ?? ""}`.trim()
              if (name) setCustomerFallbackName(name)
            })
        }
      }
      if (messagesResult.success) {
        setMessages(messagesResult.data.items)
        for (const message of messagesResult.data.items) {
          if (message.recipient === currentUserId && !message.isRead) {
            messageApi.markRead(message.id)
          }
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.recipient === currentUserId && !m.isRead ? { ...m, isRead: true } : m,
          ),
        )
      }
      setIsLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  // Realtime: append incoming creates (marking them read) and fold in updates
  // (e.g. read receipts on own messages)
  useEffect(() => {
    if (!orderId) return undefined
    const unsubscribe = realtimeManager.subscribe(
      `chat:${orderId}`,
      COLLECTIONS.MESSAGES,
      (event) => {
        const record = event.record as PBMessageRecord
        if (event.action === "create") {
          setMessages((prev) => (prev.some((m) => m.id === record.id) ? prev : [...prev, record]))
          markIncomingRead(record)
        } else if (event.action === "update") {
          setMessages((prev) => prev.map((m) => (m.id === record.id ? { ...m, ...record } : m)))
        }
      },
      { filter: filters.eq("order", orderId) },
    )
    return unsubscribe
  }, [orderId, markIncomingRead])

  const handleSend = async () => {
    const content = draft.trim()
    if (!content || !canChat || isSending) return
    setIsSending(true)
    const result = await messageApi.send(orderId, counterpartId, content)
    setIsSending(false)
    if (result.success) {
      setDraft("")
      setMessages((prev) =>
        prev.some((m) => m.id === result.data.id) ? prev : [...prev, result.data],
      )
    } else {
      Alert.alert("Error", result.message || "Failed to send message")
    }
  }

  // Inverted list wants newest first
  const invertedMessages = [...messages].reverse()

  const renderMessage = ({ item }: { item: PBMessageRecord }) => (
    <ChatBubble message={item} isOwn={item.sender === currentUserId} />
  )

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
        <View style={$headerCenter}>
          <Text style={$headerTitle}>
            {pbOrder?.orderNumber ? `#${pbOrder.orderNumber}` : "Order Chat"}
          </Text>
          {!!counterpartName && <Text style={$headerSubtitle}>{counterpartName}</Text>}
        </View>
        <View style={$headerSpacer} />
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={$emptyContainer}>
          <Text style={$emptyText}>Loading messages...</Text>
        </View>
      ) : !hasTailor ? (
        <View style={$emptyContainer}>
          <Icon icon="sew" size={40} color={colors.palette.neutral400} />
          <Text style={$emptyText}>A tailor hasn&apos;t accepted this order yet</Text>
          <Text style={$emptyHint}>You can message your tailor once the order is accepted.</Text>
        </View>
      ) : (
        <FlatList
          data={invertedMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          style={$list}
          contentContainerStyle={$listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={$invertedEmpty}>
              <Text style={$emptyText}>No messages yet</Text>
              <Text style={$emptyHint}>Say hello to get the conversation started.</Text>
            </View>
          }
        />
      )}

      {/* Input row */}
      <View style={[$inputRow, $bottomInsets]}>
        <TextField
          value={draft}
          onChangeText={setDraft}
          placeholder={canChat ? "Type a message..." : "Messaging unavailable"}
          editable={canChat && !isSending}
          multiline
          containerStyle={$inputField}
        />
        <Button
          text={isSending ? "..." : "Send"}
          style={$sendButton}
          textStyle={$sendButtonText}
          disabled={!canChat || isSending || !draft.trim()}
          onPress={handleSend}
        />
      </View>
    </Screen>
  )
})

// Styles
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

const $headerCenter: ViewStyle = {
  flex: 1,
  alignItems: "center",
}

const $headerTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral900,
}

const $headerSubtitle: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
}

const $headerSpacer: ViewStyle = {
  width: 40,
}

const $list: ViewStyle = {
  flex: 1,
}

const $listContent: ViewStyle = {
  paddingVertical: spacing.md,
  flexGrow: 1,
}

const $emptyContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
  gap: spacing.sm,
}

const $invertedEmpty: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
  gap: spacing.sm,
  transform: [{ scaleY: -1 }],
}

const $emptyText: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral700,
  textAlign: "center",
}

const $emptyHint: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral500,
  textAlign: "center",
}

const $inputRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-end",
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
  backgroundColor: colors.palette.neutral100,
}

const $inputField: ViewStyle = {
  flex: 1,
}

const $sendButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  minHeight: 44,
}

const $sendButtonText: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
  color: colors.palette.neutral100,
}
