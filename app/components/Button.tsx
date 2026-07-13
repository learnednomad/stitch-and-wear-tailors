import { ComponentType } from "react"
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native"
import { Text, TextProps } from "./Text"

type Presets = "default" | "filled" | "reversed"

export interface ButtonAccessoryProps {
  style: StyleProp<any>
  pressableState: PressableStateCallbackType
  disabled?: boolean
}

export interface ButtonProps extends PressableProps {
  /**
   * Text which is looked up via i18n.
   */
  tx?: TextProps["tx"]
  /**
   * The text to display if not using `tx` or nested components.
   */
  text?: TextProps["text"]
  /**
   * Optional options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  txOptions?: TextProps["txOptions"]
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
  /**
   * An optional style override for the "pressed" state.
   */
  pressedStyle?: StyleProp<ViewStyle>
  /**
   * An optional style override for the button text.
   */
  textStyle?: StyleProp<TextStyle>
  /**
   * An optional style override for the button text when in the "pressed" state.
   */
  pressedTextStyle?: StyleProp<TextStyle>
  /**
   * An optional style override for the button text when in the "disabled" state.
   */
  disabledTextStyle?: StyleProp<TextStyle>
  /**
   * One of the different types of button presets.
   */
  preset?: Presets
  /**
   * An optional component to render on the right side of the text.
   * Example: `RightAccessory={(props) => <View {...props} />}`
   */
  RightAccessory?: ComponentType<ButtonAccessoryProps>
  /**
   * An optional component to render on the left side of the text.
   * Example: `LeftAccessory={(props) => <View {...props} />}`
   */
  LeftAccessory?: ComponentType<ButtonAccessoryProps>
  /**
   * Children components.
   */
  children?: React.ReactNode
  /**
   * disabled prop, accessed directly for declarative styling reasons.
   * https://reactnative.dev/docs/pressable#disabled
   */
  disabled?: boolean
  /**
   * An optional style override for the disabled state
   */
  disabledStyle?: StyleProp<ViewStyle>
}

/**
 * A component that allows users to take actions and make choices.
 * Wraps the Text component with a Pressable component.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Button/}
 * @param {ButtonProps} props - The props for the `Button` component.
 * @returns {JSX.Element} The rendered `Button` component.
 * @example
 * <Button
 *   tx="common:ok"
 *   style={styles.button}
 *   textStyle={styles.buttonText}
 *   onPress={handleButtonPress}
 * />
 */
export function Button(props: ButtonProps) {
  const {
    tx,
    text,
    txOptions,
    style: $viewStyleOverride,
    pressedStyle: $pressedViewStyleOverride,
    textStyle: $textStyleOverride,
    pressedTextStyle: $pressedTextStyleOverride,
    disabledTextStyle: $disabledTextStyleOverride,
    children,
    RightAccessory,
    LeftAccessory,
    disabled,
    disabledStyle: $disabledViewStyleOverride,
    ...rest
  } = props

  const preset: Presets = props.preset ?? "default"

  // Button owns its internal className; override props stay as inline styles
  // (applied on top, so they win). `active:` variants reproduce the pressed
  // background; the pressed opacity on the label is applied from render state.
  function $viewStyle({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> {
    return [
      $viewStyleOverride,
      !!pressed && $pressedViewStyleOverride,
      !!disabled && $disabledViewStyleOverride,
    ]
  }
  function $textStyle({ pressed }: PressableStateCallbackType): StyleProp<TextStyle> {
    return [
      $textStyleOverride,
      !!pressed && $pressedTextStyleOverride,
      !!disabled && $disabledTextStyleOverride,
    ]
  }

  return (
    <Pressable
      className={`${$baseViewClass} ${$viewPresetClass[preset]}`}
      style={$viewStyle}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...rest}
      disabled={disabled}
    >
      {(state) => (
        <>
          {!!LeftAccessory && (
            <LeftAccessory style={$leftAccessoryStyle} pressableState={state} disabled={disabled} />
          )}

          <Text
            tx={tx}
            text={text}
            txOptions={txOptions}
            className={`${$baseTextClass} ${$textPresetClass[preset]} ${state.pressed ? "opacity-90" : ""}`}
            style={$textStyle(state)}
          >
            {children}
          </Text>

          {!!RightAccessory && (
            <RightAccessory
              style={$rightAccessoryStyle}
              pressableState={state}
              disabled={disabled}
            />
          )}
        </>
      )}
    </Pressable>
  )
}

// minHeight 56 (min-h-14), borderRadius 4 (rounded), paddingVertical/Horizontal
// sm=12 (py-3/px-3), centered, overflow hidden, flexDirection row.
const $baseViewClass =
  "flex-row min-h-14 rounded justify-center items-center py-3 px-3 overflow-hidden"

// fontSize 16 (text-sm), lineHeight 20 (leading-5), medium font, centered,
// flexShrink 1 (shrink) + flexGrow 0 (grow-0), zIndex 2. Color falls through to
// the Text default (semantic text) for default/filled; reversed overrides it.
const $baseTextClass = "text-sm leading-5 font-spaceMedium text-center shrink grow-0 z-[2]"

// Accessory spacing: marginEnd/marginStart xs=8, zIndex 1.
const $leftAccessoryStyle: ViewStyle = { marginEnd: 8, zIndex: 1 }
const $rightAccessoryStyle: ViewStyle = { marginStart: 8, zIndex: 1 }

// Per-preset background/border with `active:` pressed twins, each with `dark:`
// variants (mirrors the previous themed palette.neutral* + pressed lookups).
const $viewPresetClass: Record<Presets, string> = {
  default:
    "border border-neutral400 bg-neutral100 active:bg-neutral200 dark:border-neutral400-dark dark:bg-neutral100-dark dark:active:bg-neutral200-dark",
  filled: "bg-neutral300 active:bg-neutral400 dark:bg-neutral300-dark dark:active:bg-neutral400-dark",
  reversed:
    "bg-neutral800 active:bg-neutral700 dark:bg-neutral800-dark dark:active:bg-neutral700-dark",
}

const $textPresetClass: Record<Presets, string> = {
  default: "",
  filled: "",
  reversed: "text-neutral100 dark:text-neutral100-dark",
}
