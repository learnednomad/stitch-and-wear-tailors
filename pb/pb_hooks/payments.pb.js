/// <reference path="../pb_data/types.d.ts" />
/**
 * Payment hooks (manual/offline payments — no gateway). Request-level so
 * hook-internal order/invoice saves don't re-trigger them:
 * - reconcile order deposit/balance/paymentStatus from confirmed payments
 * - sync invoice status (partially_paid / paid)
 * - notify the counterparty (tailor gets claims, customer gets confirmations)
 */

onRecordCreateRequest((e) => {
  const { createNotification, reconcileOrder } = require(`${__hooks}/utils.js`)

  e.next() // validate + persist

  const order = e.app.findRecordById("orders", e.record.getString("order"))
  const orderNumber = order.getString("orderNumber")
  const amount = e.record.getFloat("amount")
  const currency = e.record.getString("currency") || order.getString("currency") || "NGN"

  if (e.record.getString("status") === "confirmed") {
    reconcileOrder(e.app, order.id)
    createNotification(
      e.app,
      order.getString("customer"),
      "payment_received",
      `Payment recorded for ${orderNumber}`,
      `A payment of ${currency} ${amount} was recorded on your order.`,
      { orderId: order.id, paymentId: e.record.id },
    )
  } else if (e.record.getString("status") === "pending_confirmation") {
    createNotification(
      e.app,
      order.getString("tailor"),
      "payment_claim",
      `Payment claim on ${orderNumber}`,
      `The customer reports paying ${currency} ${amount}. Confirm or reject it.`,
      { orderId: order.id, paymentId: e.record.id },
    )
  }
}, "payments")

// Tailor confirms/rejects a claim, or edits a recorded payment.
onRecordUpdateRequest((e) => {
  const { createNotification, reconcileOrder } = require(`${__hooks}/utils.js`)
  const oldStatus = e.record.original().getString("status")

  if (e.record.getString("status") === "confirmed" && !e.record.getString("confirmedAt")) {
    e.record.set("confirmedAt", new Date().toISOString())
  }

  e.next() // validate + persist

  const newStatus = e.record.getString("status")
  const order = reconcileOrder(e.app, e.record.getString("order"))

  if (oldStatus !== newStatus && (newStatus === "confirmed" || newStatus === "rejected")) {
    const verb = newStatus === "confirmed" ? "confirmed" : "rejected"
    createNotification(
      e.app,
      order.getString("customer"),
      "payment_received",
      `Payment ${verb} on ${order.getString("orderNumber")}`,
      `Your reported payment was ${verb} by the tailor.`,
      { orderId: order.id, paymentId: e.record.id },
    )
  }
}, "payments")
