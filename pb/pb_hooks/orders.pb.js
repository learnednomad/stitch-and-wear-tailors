/// <reference path="../pb_data/types.d.ts" />
/**
 * Order lifecycle hooks (request-level, so they carry auth context and do
 * not re-fire on hook-internal saves):
 * - generate orderNumber on create
 * - write an order_stages timeline record on create and on every status change
 * - stamp acceptedAt/completedAt
 * - notify the counterparty on status changes
 */

onRecordCreateRequest((e) => {
  const { createNotification } = require(`${__hooks}/utils.js`)

  if (!e.record.getString("orderNumber")) {
    const year = new Date().getFullYear()
    const suffix = $security.randomStringWithAlphabet(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
    e.record.set("orderNumber", `ORD-${year}-${suffix}`)
  }
  if (!e.record.getString("status")) {
    e.record.set("status", "pending")
  }

  e.next() // validate + persist

  const stages = e.app.findCollectionByNameOrId("order_stages")
  const stage = new Record(stages)
  stage.set("order", e.record.id)
  stage.set("status", e.record.getString("status"))
  stage.set("note", "Order placed")
  stage.set("changedBy", e.record.getString("customer"))
  e.app.save(stage)

  const tailorId = e.record.getString("tailor")
  if (tailorId) {
    createNotification(
      e.app,
      tailorId,
      "order_update",
      "New order request",
      `Order ${e.record.getString("orderNumber")} is waiting for your review.`,
      { orderId: e.record.id },
    )
  }
}, "orders")

onRecordUpdateRequest((e) => {
  const { createNotification, ORDER_STATUS_LABELS } = require(`${__hooks}/utils.js`)

  const oldStatus = e.record.original().getString("status")
  const oldTailor = e.record.original().getString("tailor")
  const newStatus = e.record.getString("status")

  if (oldStatus !== newStatus) {
    if (newStatus === "accepted" && !e.record.getString("acceptedAt")) {
      e.record.set("acceptedAt", new Date().toISOString())
    }
    if (newStatus === "delivered") {
      if (!e.record.getString("completedAt")) {
        e.record.set("completedAt", new Date().toISOString())
      }
      if (!e.record.getString("actualDelivery")) {
        e.record.set("actualDelivery", new Date().toISOString())
      }
    }
  }

  e.next() // validate + persist

  const authId = e.auth ? e.auth.id : ""
  const customerId = e.record.getString("customer")
  const tailorId = e.record.getString("tailor")

  if (oldStatus !== newStatus) {
    const stages = e.app.findCollectionByNameOrId("order_stages")
    const stage = new Record(stages)
    stage.set("order", e.record.id)
    stage.set("status", newStatus)
    if (newStatus === "cancelled" && e.record.getString("cancellationReason")) {
      stage.set("note", e.record.getString("cancellationReason"))
    }
    if (authId) stage.set("changedBy", authId)
    e.app.save(stage)

    const label = ORDER_STATUS_LABELS[newStatus] || newStatus
    const orderNumber = e.record.getString("orderNumber")

    // Notify whichever party did NOT make the change; if unknown, notify both.
    const targets = []
    if (authId === customerId) {
      if (tailorId) targets.push(tailorId)
    } else if (authId === tailorId) {
      targets.push(customerId)
    } else {
      targets.push(customerId)
      if (tailorId) targets.push(tailorId)
    }
    for (const userId of targets) {
      createNotification(
        e.app,
        userId,
        "order_update",
        `Order ${orderNumber}: ${label}`,
        `The order status changed to ${label}.`,
        { orderId: e.record.id, status: newStatus },
      )
    }
  } else if (!oldTailor && tailorId) {
    // Tailor self-assigned without a status change.
    createNotification(
      e.app,
      customerId,
      "order_update",
      `Order ${e.record.getString("orderNumber")} has a tailor`,
      "A tailor has been assigned to your order.",
      { orderId: e.record.id },
    )
  }
}, "orders")
