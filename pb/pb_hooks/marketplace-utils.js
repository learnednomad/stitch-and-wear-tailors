/// <reference path="../pb_data/types.d.ts" />

function jsonArray(value) {
  if (Array.isArray(value)) {
    try {
      if (value.length && value.every((item) => typeof item === "number")) {
        const parsed = JSON.parse(String.fromCharCode(...value))
        return Array.isArray(parsed) ? parsed : []
      }
      return JSON.parse(JSON.stringify(value))
    } catch {
      return []
    }
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function cleanText(value, max) {
  return String(value || "").trim().slice(0, max)
}

function orderSuffix() {
  return $security.randomStringWithAlphabet(8, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
}

function restoreStock(app, items) {
  const byProduct = new Map()
  for (const item of items) {
    const productId = cleanText(item.productId, 40)
    const quantity = Number(item.quantity)
    if (!productId || !Number.isInteger(quantity) || quantity < 1) continue
    const entry = byProduct.get(productId) || { quantity: 0, variants: new Map() }
    entry.quantity += quantity
    if (item.variantId) {
      entry.variants.set(
        item.variantId,
        (entry.variants.get(item.variantId) || 0) + quantity,
      )
    }
    byProduct.set(productId, entry)
  }

  for (const [productId, requested] of byProduct) {
    let product
    try {
      product = app.findRecordById("products", productId)
    } catch {
      continue
    }
    product.set("stock", product.getInt("stock") + requested.quantity)
    const variants = jsonArray(product.get("variants"))
    if (variants.length) {
      for (const variant of variants) {
        const quantity = requested.variants.get(variant.id) || 0
        if (quantity) variant.stock = Number(variant.stock || 0) + quantity
      }
      product.set("variants", variants)
    }
    app.save(product)
  }
}

module.exports = { cleanText, jsonArray, orderSuffix, restoreStock }
