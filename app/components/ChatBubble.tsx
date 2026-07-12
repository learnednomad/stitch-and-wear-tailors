/**
 * ChatBubble
 *
 * Single message bubble for the order chat: own messages align right in the
 * primary color, the other party's align left on a neutral background. Shows
 * the message content, a compact relative timestamp, and a read tick on own
 * messages (highlighted once the recipient has read it).
 */

import { View, ViewStyle, TextStyle } from "react-native"
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
    <View style={[$row, isOwn ? $rowOwn : $rowOther]}>
      <View style={[$bubble, isOwn ? $bubbleOwn : $bubbleOther]}>
        <Text style={[$content, isOwn ? $contentOwn : $contentOther]}>{message.content}</Text>
        <View style={$meta}>
          <Text style={[$time, isOwn ? $timeOwn : $timeOther]}>
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

// Styles
const $row: ViewStyle = {
  flexDirection: "row",
  marginBottom: spacing.xs,
  paddingHorizontal: spacing.md,
}

const $rowOwn: ViewStyle = {
  justifyContent: "flex-end",
}

const $rowOther: ViewStyle = {
  justifyContent: "flex-start",
}

const $bubble: ViewStyle = {
  maxWidth: "80%",
  borderRadius: 16,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
}

const $bubbleOwn: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderBottomRightRadius: 4,
}

const $bubbleOther: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderBottomLeftRadius: 4,
}

const $content: TextStyle = {
  fontSize: 15,
  lineHeight: 20,
}

const $contentOwn: TextStyle = {
  color: colors.palette.neutral100,
}

const $contentOther: TextStyle = {
  color: colors.palette.neutral900,
}

const $meta: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  marginTop: spacing.xxs,
}

const $time: TextStyle = {
  fontSize: 10,
}

const $timeOwn: TextStyle = {
  color: colors.palette.primary200,
}

const $timeOther: TextStyle = {
  color: colors.palette.neutral500,
}

const $tick: ViewStyle = {
  marginLeft: spacing.xxs,
}
