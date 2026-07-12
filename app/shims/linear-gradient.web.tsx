/**
 * Web shim for react-native-linear-gradient (native-only package).
 * Metro aliases the package here on web builds (see metro.config.js).
 * Renders a View with a CSS linear-gradient background.
 */
import React from "react"
import { View, ViewProps } from "react-native"

interface LinearGradientProps extends ViewProps {
  colors: string[]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  locations?: number[]
}

function toCssGradient(props: LinearGradientProps): string {
  const { colors, start = { x: 0.5, y: 0 }, end = { x: 0.5, y: 1 }, locations } = props
  const angleRad = Math.atan2(end.y - start.y, end.x - start.x)
  const angleDeg = (angleRad * 180) / Math.PI + 90
  const stops = colors
    .map((color, i) => {
      const stop = locations?.[i] !== undefined ? ` ${Math.round(locations[i] * 100)}%` : ""
      return `${color}${stop}`
    })
    .join(", ")
  return `linear-gradient(${angleDeg}deg, ${stops})`
}

const LinearGradient: React.FC<LinearGradientProps> = ({
  colors,
  start,
  end,
  locations,
  style,
  children,
  ...rest
}) => (
  <View
    {...rest}
    style={[style, { backgroundImage: toCssGradient({ colors, start, end, locations }) } as any]}
  >
    {children}
  </View>
)

export default LinearGradient
export { LinearGradient }
