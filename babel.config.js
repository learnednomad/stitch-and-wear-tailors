/** @type {import('@babel/core').TransformOptions} */
module.exports = function (api) {
  api.cache(true)
  return {
    // jsxImportSource: "nativewind" routes JSX through NativeWind's runtime so
    // `className` is honored; "nativewind/babel" wires the css-interop transform.
    // NOTE: babel-preset-expo may double-register the Reanimated plugin via the
    // nativewind preset — babel tolerates this on Reanimated 3.16; revisit in Phase 4.
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  }
}
