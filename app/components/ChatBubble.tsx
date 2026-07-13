/**
 * ChatBubble
 *
 * Single message bubble for the order chat: own messages align right in the
 * primary color, the other party's align left on a neutral background. Shows
 * the message content, a compact relative timestamp, and a read tick on own
 * messages (highlighted once the recipient has read it).
 */

import { View, ViewStyle } from "react-native"
import { Text } from "./Text"
import { Icon } from "./Icon"
import { colors, spacing } from "../theme"
import { formatRelativeTime } from "../utils/formatRelativeTime"

export interface ChatBubbleMessage {
  content: string
  created: string
  isRead?: boolean
}

export interface ChatBubbleProps {
  message: ChatBubbleMessage
  /** true when the current user sent this message */
  isOwn: boolean
}

export function ChatBubble(props: ChatBubbleProps) {
  const { message, isOwn } = props

  return (
    <View className={`mb-2 flex-row px-4 ${isOwn ? "justify-end" : "justify-start"}`}>
      <View
        className={`max-w-[80%] rounded-2xl px-3 py-2 ${isOwn ? "rounded-br" : "rounded-bl"}`}
        style={{
          backgroundColor: isOwn ? colors.palette.primary500 : colors.palette.neutral200,
        }}
      >
        <Text
          className="text-[15px] leading-5"
          style={{ color: isOwn ? colors.palette.neutral100 : colors.palette.neutral900 }}
        >
          {message.content}
        </Text>
        <View className="mt-1 flex-row items-center justify-end">
          <Text
            className="text-[10px]"
            style={{ color: isOwn ? colors.palette.primary200 : colors.palette.neutral500 }}
          >
            {formatRelativeTime(message.created)}
          </Text>
          {isOwn && (
            <Icon
              icon="check"
              size={12}
              color={message.isRead ? colors.palette.accent300 : colors.palette.primary200}
              containerStyle={$tick}
            />
          )}
        </View>
      </View>
    </View>
  )
}

// Icon `containerStyle` is a component style prop, so it stays inline.
const $tick: ViewStyle = {
  marginLeft: spacing.xxs,
}
