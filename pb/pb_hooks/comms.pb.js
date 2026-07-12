/// <reference path="../pb_data/types.d.ts" />
/**
 * Communication hooks (request-level): notify recipients of new messages and
 * appointment activity. Delivery is via the app's realtime subscription on
 * the notifications collection (in-app only — no push in v1).
 */

onRecordCreateRequest((e) => {
  const { createNotification } = require(`${__hooks}/utils.js`)

  e.next() // validate + persist

  const sender = e.app.findRecordById("users", e.record.getString("sender"))
  const name = `${sender.getString("firstName")} ${sender.getString("lastName")}`.trim() || "Someone"
  const preview =
    e.record.getString("messageType") === "text"
      ? e.record.getString("content").slice(0, 120)
      : "Sent an attachment"

  createNotification(
    e.app,
    e.record.getString("recipient"),
    "new_message",
    `New message from ${name}`,
    preview,
    { orderId: e.record.getString("order"), messageId: e.record.id },
  )
}, "messages")

onRecordCreateRequest((e) => {
  const { createNotification } = require(`${__hooks}/utils.js`)

  e.next() // validate + persist

  // Notify the party who did not create the appointment.
  const authId = e.auth ? e.auth.id : ""
  const customerId = e.record.getString("customer")
  const tailorId = e.record.getString("tailor")
  const target = authId === customerId ? tailorId : customerId

  createNotification(
    e.app,
    target,
    "appointment",
    "New appointment request",
    `A ${e.record.getString("type")} appointment was requested for ${e.record.getString("scheduledAt")}.`,
    { appointmentId: e.record.id },
  )
}, "appointments")

onRecordUpdateRequest((e) => {
  const { createNotification } = require(`${__hooks}/utils.js`)
  const oldStatus = e.record.original().getString("status")

  e.next() // validate + persist

  const newStatus = e.record.getString("status")
  if (oldStatus === newStatus) return

  const authId = e.auth ? e.auth.id : ""
  const customerId = e.record.getString("customer")
  const tailorId = e.record.getString("tailor")
  const target = authId === customerId ? tailorId : customerId

  createNotification(
    e.app,
    target,
    "appointment",
    `Appointment ${newStatus}`,
    `Your ${e.record.getString("type")} appointment is now ${newStatus}.`,
    { appointmentId: e.record.id },
  )
}, "appointments")
