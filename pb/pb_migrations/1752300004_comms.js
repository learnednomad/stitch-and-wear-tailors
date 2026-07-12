/// <reference path="../pb_data/types.d.ts" />
/**
 * Communication collections: in-order messages and in-app notifications.
 * Notifications are created exclusively by pb_hooks (no client create rule).
 */
migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id
    const ordersId = app.findCollectionByNameOrId("orders").id

    const messages = new Collection({
      type: "base",
      name: "messages",
      listRule: "sender = @request.auth.id || recipient = @request.auth.id",
      viewRule: "sender = @request.auth.id || recipient = @request.auth.id",
      createRule:
        "sender = @request.auth.id && (order.customer = @request.auth.id || order.tailor = @request.auth.id)",
      updateRule: "recipient = @request.auth.id",
      fields: [
        {
          name: "order",
          type: "relation",
          required: true,
          collectionId: ordersId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "sender",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "recipient",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "messageType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["text", "image", "voice_note", "system"],
        },
        { name: "content", type: "text", max: 2000 },
        {
          name: "attachment",
          type: "file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp4"],
        },
        { name: "isRead", type: "bool" },
        { name: "readAt", type: "date" },
        { name: "created", type: "autodate", onCreate: true },
      ],
      indexes: [
        "CREATE INDEX idx_messages_order ON messages (`order`)",
        "CREATE INDEX idx_messages_recipient ON messages (recipient, isRead)",
      ],
    })
    app.save(messages)

    const notifications = new Collection({
      type: "base",
      name: "notifications",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      // created exclusively by pb_hooks
      updateRule: "user = @request.auth.id",
      deleteRule: "user = @request.auth.id",
      fields: [
        {
          name: "user",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "order_update",
            "new_message",
            "payment_received",
            "payment_claim",
            "appointment",
            "reminder",
            "system",
          ],
        },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "body", type: "text", max: 500 },
        { name: "data", type: "json", maxSize: 2000 },
        { name: "isRead", type: "bool" },
        { name: "readAt", type: "date" },
        { name: "created", type: "autodate", onCreate: true },
      ],
      indexes: ["CREATE INDEX idx_notifications_user ON notifications (user, isRead)"],
    })
    app.save(notifications)
  },
  (app) => {
    for (const name of ["notifications", "messages"]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
