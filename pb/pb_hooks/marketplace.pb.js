/// <reference path="../pb_data/types.d.ts" />
/**
 * Marketplace integrity belongs on the server: browser snapshots are useful
 * for rendering a cart, but never authoritative for seller, price or stock.
 */

onRecordCreateRequest((e) => {
  const { createNotification } = require(`${__hooks}/utils.js`)
  const { cleanText, jsonArray, orderSuffix } = require(`${__hooks}/marketplace-utils.js`)
  if (!e.auth) throw new UnauthorizedError("Sign in before placing an order.")

  const submitted = jsonArray(e.record.get("items"))
  if (!submitted.length) throw new BadRequestError("Your cart is empty.")
  if (!cleanText(e.record.getString("contactName"), 120)) {
    throw new BadRequestError("Contact name is required.")
  }
  if (!cleanText(e.record.getString("contactPhone"), 40)) {
    throw new BadRequestError("Contact phone is required.")
  }
  if (!cleanText(e.record.getString("shippingAddress"), 500)) {
    throw new BadRequestError("Shipping address is required.")
  }

  const normalized = []
  const requestedByProduct = new Map()
  let seller = ""
  let currency = ""
  let subtotal = 0

  for (const submittedItem of submitted) {
    const productId = cleanText(submittedItem.productId, 40)
    const quantity = Number(submittedItem.quantity)
    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestError("Every order item needs a valid product and quantity.")
    }

    let product
    try {
      product = e.app.findRecordById("products", productId)
    } catch {
      throw new BadRequestError("One of the selected products is no longer available.")
    }
    if (!product.getBool("isActive")) {
      throw new BadRequestError(`${product.getString("name")} is no longer available.`)
    }

    const productSeller = product.getString("seller")
    const productCurrency = product.getString("currency") || "NGN"
    if (seller && seller !== productSeller) {
      throw new BadRequestError("Each marketplace order must contain items from one seller.")
    }
    if (currency && currency !== productCurrency) {
      throw new BadRequestError("One seller cannot mix currencies in a single order.")
    }
    seller = productSeller
    currency = productCurrency

    const variants = jsonArray(product.get("variants"))
    const variantId = cleanText(submittedItem.variantId, 100)
    const variant = variantId ? variants.find((item) => item.id === variantId) : null
    if (variantId && !variant) {
      throw new BadRequestError(`The selected ${product.getString("name")} option is unavailable.`)
    }

    const request = requestedByProduct.get(productId) || {
      quantity: 0,
      variants: new Map(),
      product,
    }
    request.quantity += quantity
    if (request.quantity > product.getInt("stock")) {
      throw new BadRequestError(`There is not enough ${product.getString("name")} in stock.`)
    }
    if (variant) {
      const variantQuantity = (request.variants.get(variant.id) || 0) + quantity
      if (variantQuantity > Number(variant.stock || 0)) {
        throw new BadRequestError(`The selected ${product.getString("name")} option is low in stock.`)
      }
      request.variants.set(variant.id, variantQuantity)
    }
    requestedByProduct.set(productId, request)

    const price = variant && variant.price !== undefined
      ? Number(variant.price)
      : product.getFloat("price")
    subtotal += price * quantity
    normalized.push({
      productId,
      name: product.getString("name"),
      price,
      quantity,
      image: variant && variant.image
        ? variant.image
        : product.getStringSlice("images")[0] || undefined,
      variantId: variant ? variant.id : undefined,
      variantLabel: variant ? variant.label : undefined,
      size: variant ? variant.size : undefined,
      color: variant ? variant.color : undefined,
    })
  }

  e.record.set("buyer", e.auth.id)
  e.record.set("seller", seller)
  e.record.set("items", normalized)
  e.record.set("subtotal", subtotal)
  e.record.set("currency", currency)
  e.record.set("status", "pending_payment")
  e.record.set("orderNumber", `MKT-${new Date().getFullYear()}-${orderSuffix()}`)
  e.record.set("contactName", cleanText(e.record.getString("contactName"), 120))
  e.record.set("contactPhone", cleanText(e.record.getString("contactPhone"), 40))
  e.record.set("shippingAddress", cleanText(e.record.getString("shippingAddress"), 500))
  e.record.set("paymentReference", cleanText(e.record.getString("paymentReference"), 100))
  e.record.set("notes", cleanText(e.record.getString("notes"), 500))

  e.next()

  for (const request of requestedByProduct.values()) {
    const product = e.app.findRecordById("products", request.product.id)
    product.set("stock", Math.max(0, product.getInt("stock") - request.quantity))
    const variants = jsonArray(product.get("variants"))
    if (variants.length) {
      for (const variant of variants) {
        const quantity = request.variants.get(variant.id) || 0
        if (quantity) variant.stock = Math.max(0, Number(variant.stock || 0) - quantity)
      }
      product.set("variants", variants)
    }
    e.app.save(product)
  }

  createNotification(
    e.app,
    seller,
    "order_update",
    "New marketplace order",
    `Order ${e.record.getString("orderNumber")} is waiting for payment confirmation.`,
    { marketplaceOrderId: e.record.id },
  )
}, "marketplace_orders")

onRecordUpdateRequest((e) => {
  const { createNotification } = require(`${__hooks}/utils.js`)
  const { jsonArray, restoreStock } = require(`${__hooks}/marketplace-utils.js`)
  const oldStatus = e.record.original().getString("status")
  const newStatus = e.record.getString("status")
  const buyer = e.record.getString("buyer")
  const seller = e.record.getString("seller")
  const authId = e.auth ? e.auth.id : ""

  if (oldStatus !== newStatus) {
    if (authId === buyer) {
      if (oldStatus !== "pending_payment" || newStatus !== "cancelled") {
        throw new ForbiddenError("Customers may only cancel an unpaid order.")
      }
    } else if (authId === seller) {
      const transitions = {
        pending_payment: ["paid", "cancelled"],
        paid: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
      }
      if (!(transitions[oldStatus] || []).includes(newStatus)) {
        throw new BadRequestError(`The order cannot move from ${oldStatus} to ${newStatus}.`)
      }
    }
  }

  e.next()

  if (oldStatus !== "cancelled" && newStatus === "cancelled") {
    restoreStock(e.app, jsonArray(e.record.get("items")))
  }
  if (oldStatus !== newStatus) {
    const target = authId === buyer ? seller : buyer
    createNotification(
      e.app,
      target,
      "order_update",
      `Marketplace order ${newStatus.replaceAll("_", " ")}`,
      `Order ${e.record.getString("orderNumber")} is now ${newStatus.replaceAll("_", " ")}.`,
      { marketplaceOrderId: e.record.id, status: newStatus },
    )
  }
}, "marketplace_orders")
