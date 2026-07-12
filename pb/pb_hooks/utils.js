/// <reference path="../pb_data/types.d.ts" />
/**
 * Shared helpers for pb_hooks. Loaded via require(`${__hooks}/utils.js`).
 */

/**
 * Create an in-app notification record (bypasses API rules — hooks only).
 * @param {core.App} app
 * @param {string} userId
 * @param {string} type one of the notifications.type select values
 * @param {string} title
 * @param {string} body
 * @param {Object} [data] extra payload (orderId, screen hints, …)
 */
function createNotification(app, userId, type, title, body, data) {
  if (!userId) return
  const collection = app.findCollectionByNameOrId("notifications")
  const record = new Record(collection)
  record.set("user", userId)
  record.set("type", type)
  record.set("title", title)
  record.set("body", body || "")
  record.set("data", data || {})
  record.set("isRead", false)
  app.save(record)
}

/**
 * Human-friendly labels for order statuses (English; the app localizes
 * client-side — notification title/body are fallback copy).
 */
const ORDER_STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  measuring: "Measuring",
  cutting: "Cutting",
  sewing: "Sewing",
  finishing: "Finishing",
  ready: "Ready for pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

/**
 * Recompute an order's deposit/balance/paymentStatus from its confirmed
 * payments and sync the order's invoice status. Returns the saved order.
 * @param {core.App} app
 * @param {string} orderId
 */
function reconcileOrder(app, orderId) {
  const order = app.findRecordById("orders", orderId)
  const confirmed = app.findRecordsByFilter(
    "payments",
    "order = {:orderId} && status = 'confirmed'",
    "-created",
    500,
    0,
    { orderId: orderId },
  )

  let paid = 0
  for (const p of confirmed) {
    const amount = p.getFloat("amount")
    paid += p.getString("paymentType") === "refund" ? -amount : amount
  }

  const total = order.getFloat("totalAmount")
  order.set("depositAmount", paid)
  order.set("balanceAmount", Math.max(total - paid, 0))
  if (paid <= 0) {
    order.set("paymentStatus", "pending")
  } else if (paid < total) {
    order.set("paymentStatus", "deposit_paid")
  } else {
    order.set("paymentStatus", "fully_paid")
  }
  app.save(order)

  // Sync the order's invoice, if one exists.
  const invoices = app.findRecordsByFilter(
    "invoices",
    "order = {:orderId} && status != 'void'",
    "-created",
    1,
    0,
    { orderId: orderId },
  )
  if (invoices.length > 0) {
    const invoice = invoices[0]
    const current = invoice.getString("status")
    if (paid <= 0) {
      if (current === "partially_paid" || current === "paid") {
        invoice.set("status", "sent")
        app.save(invoice)
      }
    } else {
      invoice.set("status", paid < invoice.getFloat("subtotal") ? "partially_paid" : "paid")
      app.save(invoice)
    }
  }

  return order
}

module.exports = { createNotification, ORDER_STATUS_LABELS, reconcileOrder }
