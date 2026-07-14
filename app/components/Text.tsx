import { TOptions } from "i18next"
// eslint-disable-next-line no-restricted-imports
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native"
import { isRTL, translate, TxKeyPath } from "@/i18n"
import { ReactNode, forwardRef, ForwardedRef } from "react"

type Sizes = keyof typeof $sizeClasses
type Weights = keyof typeof $weightClasses
type Presets = "default" | "bold" | "heading" | "subheading" | "formLabel" | "formHelper"

export interface TextProps extends RNTextProps {
  /**
   * Text which is looked up via i18n.
   */
  tx?: TxKeyPath
  /**
   * The text to display if not using `tx` or nested components.
   */
  text?: string
  /**
   * Optional options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  txOptions?: TOptions
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<TextStyle>
  /**
   * One of the different types of text presets.
   */
  preset?: Presets
  /**
   * Text weight modifier.
   */
  weight?: Weights
  /**
   * Text size modifier.
   */
  size?: Sizes
  /**
   * Children components.
   */
  children?: ReactNode
}

/**
 * For your text displaying needs.
 * This component is a HOC over the built-in React Native one.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Text/}
 * @param {TextProps} props - The props for the `Text` component.
 * @returns {JSX.Element} The rendered `Text` component.
 */
export const Text = forwardRef(function Text(props: TextProps, ref: ForwardedRef<RNText>) {
  const {
    weight,
    size,
    tx,
    txOptions,
    text,
    children,
    style: $styleOverride,
    className: $classNameOverride,
    ...rest
  } = props

  const i18nText = tx && translate(tx, txOptions)
  const content = i18nText || text || children

  const preset: Presets = props.preset ?? "default"
  // Order matters: preset first, then size (overrides fontSize/lineHeight), then
  // weight (overrides fontFamily), then the caller's className last so it wins
  // for any conflicting property (e.g. color). The inline `style` prop still
  // takes final precedence over all classes.
  const className = [
    $presetClasses[preset],
    size && $sizeClasses[size],
    weight && $weightClasses[weight],
    $classNameOverride,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <RNText {...rest} className={className} style={[$rtlStyle, $styleOverride]} ref={ref}>
      {content}
    </RNText>
  )
})

// Ignite `Text` preset scale — maps to the token fontSize scale in tailwind.config.js.
const $sizeClasses = {
  xxl: "text-xxl",
  xl: "text-xl",
  lg: "text-lg",
  md: "text-md",
  sm: "text-sm",
  xs: "text-xs",
  xxs: "text-xxs",
} as const

const $weightClasses = {
  light: "font-spaceLight",
  normal: "font-spaceRegular",
  medium: "font-spaceMedium",
  semiBold: "font-spaceSemiBold",
  bold: "font-spaceBold",
} as const

// Base is size sm + normal weight + semantic text color (with dark twin, since
// the original preset color came from the themed palette).
const $baseClass = "text-sm font-spaceRegular text-text dark:text-text-dark"

const $presetClasses: Record<Presets, string> = {
  default: $baseClass,
  bold: `${$baseClass} font-spaceBold`,
  heading: `${$baseClass} text-xxl font-spaceBold`,
  subheading: `${$baseClass} text-lg font-spaceMedium`,
  formLabel: `${$baseClass} font-spaceMedium`,
  formHelper: `${$baseClass} text-sm font-spaceRegular`,
}

const $rtlStyle: TextStyle = isRTL ? { writingDirection: "rtl" } : {}
