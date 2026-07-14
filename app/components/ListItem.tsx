import { forwardRef, ReactElement, ComponentType } from "react"
import {
  StyleProp,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from "react-native"
import { Icon, IconTypes } from "./Icon"
import { Text, TextProps } from "./Text"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"

export interface ListItemProps extends TouchableOpacityProps {
  /**
   * How tall the list item should be.
   * Default: 56
   */
  height?: number
  /**
   * Whether to show the top separator.
   * Default: false
   */
  topSeparator?: boolean
  /**
   * Whether to show the bottom separator.
   * Default: false
   */
  bottomSeparator?: boolean
  /**
   * Text to display if not using `tx` or nested components.
   */
  text?: TextProps["text"]
  /**
   * Text which is looked up via i18n.
   */
  tx?: TextProps["tx"]
  /**
   * Children components.
   */
  children?: TextProps["children"]
  /**
   * Optional options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  txOptions?: TextProps["txOptions"]
  /**
   * Optional text style override.
   */
  textStyle?: StyleProp<TextStyle>
  /**
   * Pass any additional props directly to the Text component.
   */
  TextProps?: TextProps
  /**
   * Optional View container style override.
   */
  containerStyle?: StyleProp<ViewStyle>
  /**
   * Optional TouchableOpacity style override.
   */
  style?: StyleProp<ViewStyle>
  /**
   * Icon that should appear on the left.
   */
  leftIcon?: IconTypes
  /**
   * An optional tint color for the left icon
   */
  leftIconColor?: string
  /**
   * Icon that should appear on the right.
   */
  rightIcon?: IconTypes
  /**
   * An optional tint color for the right icon
   */
  rightIconColor?: string
  /**
   * Right action custom ReactElement.
   * Overrides `rightIcon`.
   */
  RightComponent?: ReactElement
  /**
   * Left action custom ReactElement.
   * Overrides `leftIcon`.
   */
  LeftComponent?: ReactElement
}

interface ListItemActionProps {
  icon?: IconTypes
  iconColor?: string
  Component?: ReactElement
  size: number
  side: "left" | "right"
}

/**
 * A styled row component that can be used in FlatList, SectionList, or by itself.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/ListItem/}
 * @param {ListItemProps} props - The props for the `ListItem` component.
 * @returns {JSX.Element} The rendered `ListItem` component.
 */
export const ListItem = forwardRef<View, ListItemProps>(function ListItem(
  props: ListItemProps,
  ref,
) {
  const {
    bottomSeparator,
    children,
    height = 56,
    LeftComponent,
    leftIcon,
    leftIconColor,
    RightComponent,
    rightIcon,
    rightIconColor,
    style,
    text,
    TextProps,
    topSeparator,
    tx,
    txOptions,
    textStyle: $textStyleOverride,
    containerStyle: $containerStyleOverride,
    ...TouchableOpacityProps
  } = props
  const { themed } = useAppTheme()

  const isTouchable =
    TouchableOpacityProps.onPress !== undefined ||
    TouchableOpacityProps.onPressIn !== undefined ||
    TouchableOpacityProps.onPressOut !== undefined ||
    TouchableOpacityProps.onLongPress !== undefined

  const $textStyles = [$textStyleOverride, TextProps?.style]

  // Separators are solid-token borders keyed off boolean props -> conditional
  // className with `dark:` twins; caller override stays inline.
  const $separatorClass = `${
    topSeparator ? "border-t border-separator dark:border-separator-dark" : ""
  } ${bottomSeparator ? "border-b border-separator dark:border-separator-dark" : ""}`

  const Wrapper: ComponentType<TouchableOpacityProps> = isTouchable ? TouchableOpacity : View

  return (
    <View ref={ref} className={$separatorClass} style={$containerStyleOverride}>
      <Wrapper
        {...TouchableOpacityProps}
        className="flex-row items-start"
        style={[{ minHeight: height }, style]}
      >
        <ListItemAction
          side="left"
          size={height}
          icon={leftIcon}
          iconColor={leftIconColor}
          Component={LeftComponent}
        />

        <Text
          {...TextProps}
          tx={tx}
          text={text}
          txOptions={txOptions}
          className="shrink grow self-center py-2"
          style={$textStyles}
        >
          {children}
        </Text>

        <ListItemAction
          side="right"
          size={height}
          icon={rightIcon}
          iconColor={rightIconColor}
          Component={RightComponent}
        />
      </Wrapper>
    </View>
  )
})

/**
 * @param {ListItemActionProps} props - The props for the `ListItemAction` component.
 * @returns {JSX.Element | null} The rendered `ListItemAction` component.
 */
function ListItemAction(props: ListItemActionProps) {
  const { icon, Component, iconColor, size, side } = props
  const { themed } = useAppTheme()

  const $iconContainerStyles = [$iconContainer]

  if (Component) return Component

  if (icon !== undefined) {
    return (
      <Icon
        size={24}
        icon={icon}
        color={iconColor}
        containerStyle={themed([
          $iconContainerStyles,
          side === "left" && $iconContainerLeft,
          side === "right" && $iconContainerRight,
          { height: size },
        ])}
      />
    )
  }

  return null
}

// Icon `containerStyle` is a component style prop (with a dynamic height), so the
// icon-container styles stay as themed inline styles.
const $iconContainer: ViewStyle = {
  justifyContent: "center",
  alignItems: "center",
  flexGrow: 0,
}
const $iconContainerLeft: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginEnd: spacing.md,
})

const $iconContainerRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginStart: spacing.md,
})
