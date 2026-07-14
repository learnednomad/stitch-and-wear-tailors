/**
 * OrderChatScreen
 *
 * In-order chat between the customer and the assigned tailor. Loads the raw
 * PocketBase order (for the counterpart's identity), lists the order's
 * messages oldest-first, marks incoming unread messages as read, and stays
 * live via a realtime subscription filtered to the order. When the order has
 * no tailor yet the input is disabled with an explanatory empty state.
 */

import { useRouter, useLocalSearchParams } from "expo-router"
import { FC, useCallback, useEffect, useState } from "react"
import { View, FlatList, TouchableOpacity, ViewStyle, TextStyle, Alert } from "react-native"
import { useQueryClient } from "@tanstack/react-query"
import { Button, Screen, Icon, Text, TextField, ChatBubble } from "@/components"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { colors, spacing } from "@/theme"
import { errorMessage } from "@/api/common"
import {
  markMessageRead,
  mergeMessageUpdate,
  upsertMessage,
  useChatCustomerFallbackName,
  useChatOrder,
  useOrderMessages,
  useSendMessage,
} from "@/api/messages"
import { PBMessageRecord } from "@/services/api/message-api"
import { getPocketBaseAdapter, filters, COLLECTIONS } from "@/services/api/pocketbase-api-adapter"
import { realtimeManager } from "@/services/realtime/RealtimeManager"

/** Display name for an expanded users record */
function userName(user?: Record<string, any> | null): string {
  if (!user) return ""
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
  return full || user.name || user.email || ""
}


export const OrderChatScreen: FC = () => {
  const router = useRouter()
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])
  const { id } = useLocalSearchParams<{ id: string }>()
  const orderId = id ?? ""

  const adapter = getPocketBaseAdapter()
  const currentUserId = adapter.currentUserId
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState("")

  // Order (with parties expanded) + messages via React Query
  const orderQuery = useChatOrder(orderId)
  const pbOrder = orderQuery.data ?? null
  const messagesQuery = useOrderMessages(orderId)
  const messages = messagesQuery.data ?? []
  const sendMessage = useSendMessage(orderId)
  const isLoading = orderQuery.isLoading || messagesQuery.isLoading
  const isSending = sendMessage.isPending

  // Tailor viewers cannot expand the customer user record (users view rule)
  // — recover the display name from the order_item specifications.
  const fallbackNameQuery = useChatCustomerFallbackName(
    orderId,
    !!pbOrder && pbOrder.customer !== currentUserId && !pbOrder.expand?.customer,
  )
  const customerFallbackName = fallbackNameQuery.data ?? ""

  // The other party on the order (empty while unassigned).
  const counterpartId =
    pbOrder?.customer === currentUserId ? (pbOrder?.tailor ?? "") : (pbOrder?.customer ?? "")
  const counterpartName =
    pbOrder?.customer === currentUserId
      ? userName(pbOrder?.expand?.tailor)
      : userName(pbOrder?.expand?.customer) || customerFallbackName
  const hasTailor = !!pbOrder?.tailor
  const canChat = hasTailor && !!counterpartId

  /** Mark an incoming message read (server + query cache) */
  const markIncomingRead = useCallback(
    (message: PBMessageRecord) => {
      if (message.recipient !== currentUserId || message.isRead) return
      markMessageRead(queryClient, orderId, message.id)
    },
    [currentUserId, orderId, queryClient],
  )

  // Mark unread incoming messages read once a loaded batch contains any
  useEffect(() => {
    for (const message of messages) {
      markIncomingRead(message)
    }
  }, [messages, markIncomingRead])

  // Realtime (kept): append incoming creates (marking them read) and fold in
  // updates (e.g. read receipts on own messages) via queryClient.setQueryData
  useEffect(() => {
    if (!orderId) return undefined
    const unsubscribe = realtimeManager.subscribe(
      `chat:${orderId}`,
      COLLECTIONS.MESSAGES,
      (event) => {
        const record = event.record as PBMessageRecord
        if (event.action === "create") {
          upsertMessage(queryClient, orderId, record)
          markIncomingRead(record)
        } else if (event.action === "update") {
          mergeMessageUpdate(queryClient, orderId, record)
        }
      },
      { filter: filters.eq("order", orderId) },
    )
    return unsubscribe
  }, [orderId, markIncomingRead, queryClient])

  const handleSend = () => {
    const content = draft.trim()
    if (!content || !canChat || isSending) return
    sendMessage.mutate(
      { recipientId: counterpartId, content },
      {
        onSuccess: () => setDraft(""),
        onError: (error) => Alert.alert("Error", errorMessage(error) || "Failed to send message"),
      },
    )
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
      contentContainerStyle={$screenContent}
    >
      {/* Header */}
      <View className="flex-row items-center border-b border-neutral200 px-6 py-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center"
          onPress={() =>router.back()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon icon="back" size={24} color={colors.palette.neutral900} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text
            className="text-[16px]"
            weight="semiBold"
            style={{ color: colors.palette.neutral900 }}
          >
            {pbOrder?.orderNumber ? `#${pbOrder.orderNumber}` : "Order Chat"}
          </Text>
          {!!counterpartName && (
            <Text className="text-[12px]" style={{ color: colors.palette.neutral600 }}>
              {counterpartName}
            </Text>
          )}
        </View>
        <View className="w-10" />
      </View>

      {/* Messages */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-3 p-8">
          <Text
            className="text-center text-[15px]"
            weight="semiBold"
            style={{ color: colors.palette.neutral700 }}
          >
            Loading messages...
          </Text>
        </View>
      ) : !hasTailor ? (
        <View className="flex-1 items-center justify-center gap-3 p-8">
          <Icon icon="sew" size={40} color={colors.palette.neutral400} />
          <Text
            className="text-center text-[15px]"
            weight="semiBold"
            style={{ color: colors.palette.neutral700 }}
          >
            A tailor hasn&apos;t accepted this order yet
          </Text>
          <Text className="text-center text-[13px]" style={{ color: colors.palette.neutral500 }}>
            You can message your tailor once the order is accepted.
          </Text>
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
            <View
              className="flex-1 items-center justify-center gap-3 p-8"
              style={{ transform: [{ scaleY: -1 }] }}
            >
              <Text
                className="text-center text-[15px]"
                weight="semiBold"
                style={{ color: colors.palette.neutral700 }}
              >
                No messages yet
              </Text>
              <Text className="text-center text-[13px]" style={{ color: colors.palette.neutral500 }}>
                Say hello to get the conversation started.
              </Text>
            </View>
          }
        />
      )}

      {/* Input row */}
      <View
        className="flex-row items-end gap-3 border-t border-neutral200 bg-neutral100 px-4 py-3"
        style={$bottomInsets}
      >
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
}

// Styles
// Component style-prop overrides (Screen contentContainerStyle, FlatList
// style/contentContainerStyle, TextField containerStyle, Button style/textStyle)
// stay inline per the recipe.

// Screen's fixed preset gives its inner container no height; without flex the
// message list collapses and the composer renders directly under the header.
const $screenContent: ViewStyle = {
  flex: 1,
}

const $list: ViewStyle = {
  flex: 1,
}

const $listContent: ViewStyle = {
  paddingVertical: spacing.md,
  flexGrow: 1,
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
