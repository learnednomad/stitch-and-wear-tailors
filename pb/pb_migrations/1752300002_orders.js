/// <reference path="../pb_data/types.d.ts" />
/**
 * Core order-domain collections: measurements, orders, order_items and
 * order_stages (status-history timeline written by pb_hooks).
 *
 * Marketplace visibility rule: unassigned pending orders (tailor = "") are
 * listable by tailors so they can accept work.
 */
migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id
    const fabricsId = app.findCollectionByNameOrId("fabrics").id
    const stylesId = app.findCollectionByNameOrId("catalog_styles").id

    const measurements = new Collection({
      type: "base",
      name: "measurements",
      listRule: 'user = @request.auth.id || @request.auth.userType = "tailor"',
      viewRule: 'user = @request.auth.id || @request.auth.userType = "tailor"',
      createRule: "user = @request.auth.id",
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
        { name: "name", type: "text", required: true, max: 100 },
        {
          name: "measurementType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["suit", "shirt", "trouser", "dress", "traditional"],
        },
        { name: "unit", type: "select", required: true, maxSelect: 1, values: ["cm", "inch"] },
        { name: "chest", type: "number", min: 0 },
        { name: "waist", type: "number", min: 0 },
        { name: "hips", type: "number", min: 0 },
        { name: "shoulderWidth", type: "number", min: 0 },
        { name: "sleeveLength", type: "number", min: 0 },
        { name: "armhole", type: "number", min: 0 },
        { name: "bicep", type: "number", min: 0 },
        { name: "wrist", type: "number", min: 0 },
        { name: "neck", type: "number", min: 0 },
        { name: "backLength", type: "number", min: 0 },
        { name: "frontLength", type: "number", min: 0 },
        { name: "inseam", type: "number", min: 0 },
        { name: "outseam", type: "number", min: 0 },
        { name: "thigh", type: "number", min: 0 },
        { name: "knee", type: "number", min: 0 },
        { name: "ankle", type: "number", min: 0 },
        { name: "rise", type: "number", min: 0 },
        { name: "customMeasurements", type: "json", maxSize: 4000 },
        { name: "notes", type: "text", max: 500 },
        { name: "isDefault", type: "bool" },
        {
          name: "photos",
          type: "file",
          maxSelect: 5,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png"],
        },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_measurements_user ON measurements (user)"],
    })
    app.save(measurements)

    const measurementsId = app.findCollectionByNameOrId("measurements").id

    const orders = new Collection({
      type: "base",
      name: "orders",
      listRule:
        'customer = @request.auth.id || tailor = @request.auth.id || @request.auth.userType = "admin" || (tailor = "" && @request.auth.userType = "tailor")',
      viewRule:
        'customer = @request.auth.id || tailor = @request.auth.id || @request.auth.userType = "admin" || (tailor = "" && @request.auth.userType = "tailor")',
      createRule: "customer = @request.auth.id",
      updateRule:
        'customer = @request.auth.id || tailor = @request.auth.id || (tailor = "" && @request.auth.userType = "tailor")',
      // no hard deletes — cancellation is a status
      fields: [
        { name: "orderNumber", type: "text", max: 30 },
        {
          name: "customer",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "tailor",
          type: "relation",
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "pending",
            "accepted",
            "rejected",
            "measuring",
            "cutting",
            "sewing",
            "finishing",
            "ready",
            "delivered",
            "cancelled",
          ],
        },
        {
          name: "priority",
          type: "select",
          maxSelect: 1,
          values: ["normal", "express", "urgent"],
        },
        {
          name: "orderType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["new_clothing", "alteration", "repair"],
        },
        {
          name: "measurement",
          type: "relation",
          collectionId: measurementsId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "style",
          type: "relation",
          collectionId: stylesId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "totalAmount", type: "number", min: 0 },
        { name: "depositAmount", type: "number", min: 0 },
        { name: "balanceAmount", type: "number", min: 0 },
        { name: "currency", type: "select", maxSelect: 1, values: ["NGN", "USD", "GBP", "EUR"] },
        { name: "estimatedDelivery", type: "date" },
        { name: "actualDelivery", type: "date" },
        { name: "specialInstructions", type: "text", max: 1000 },
        { name: "internalNotes", type: "text", max: 1000 },
        {
          name: "fabricSource",
          type: "select",
          maxSelect: 1,
          values: ["customer", "tailor", "shop"],
        },
        {
          name: "paymentStatus",
          type: "select",
          maxSelect: 1,
          values: ["pending", "deposit_paid", "fully_paid", "refunded"],
        },
        { name: "cancellationReason", type: "text", max: 500 },
        {
          name: "attachments",
          type: "file",
          maxSelect: 10,
          maxSize: 20971520,
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        },
        { name: "acceptedAt", type: "date" },
        { name: "completedAt", type: "date" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_orders_number ON orders (orderNumber)",
        "CREATE INDEX idx_orders_customer ON orders (customer)",
        "CREATE INDEX idx_orders_tailor ON orders (tailor)",
        "CREATE INDEX idx_orders_status ON orders (status)",
      ],
    })
    app.save(orders)

    const ordersId = app.findCollectionByNameOrId("orders").id

    const orderItems = new Collection({
      type: "base",
      name: "order_items",
      listRule:
        'order.customer = @request.auth.id || order.tailor = @request.auth.id || (order.tailor = "" && @request.auth.userType = "tailor")',
      viewRule:
        'order.customer = @request.auth.id || order.tailor = @request.auth.id || (order.tailor = "" && @request.auth.userType = "tailor")',
      createRule: "order.customer = @request.auth.id",
      updateRule: "order.customer = @request.auth.id || order.tailor = @request.auth.id",
      deleteRule: 'order.customer = @request.auth.id && order.status = "pending"',
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
          name: "itemType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "suit",
            "shirt",
            "trouser",
            "dress",
            "blouse",
            "skirt",
            "traditional",
            "other",
          ],
        },
        { name: "quantity", type: "number", required: true, min: 1, onlyInt: true },
        {
          name: "fabric",
          type: "relation",
          collectionId: fabricsId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "designStyle", type: "text", max: 200 },
        { name: "itemPrice", type: "number", min: 0 },
        { name: "totalPrice", type: "number", min: 0 },
        { name: "specifications", type: "json", maxSize: 4000 },
        {
          name: "status",
          type: "select",
          maxSelect: 1,
          values: ["pending", "in_progress", "completed"],
        },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_order_items_order ON order_items (`order`)"],
    })
    app.save(orderItems)

    const orderStages = new Collection({
      type: "base",
      name: "order_stages",
      listRule: "order.customer = @request.auth.id || order.tailor = @request.auth.id",
      viewRule: "order.customer = @request.auth.id || order.tailor = @request.auth.id",
      // created exclusively by pb_hooks on order status changes
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
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "pending",
            "accepted",
            "rejected",
            "measuring",
            "cutting",
            "sewing",
            "finishing",
            "ready",
            "delivered",
            "cancelled",
          ],
        },
        { name: "note", type: "text", max: 500 },
        {
          name: "photo",
          type: "file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        {
          name: "changedBy",
          type: "relation",
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "created", type: "autodate", onCreate: true },
      ],
      indexes: ["CREATE INDEX idx_order_stages_order ON order_stages (`order`)"],
    })
    app.save(orderStages)
  },
  (app) => {
    for (const name of ["order_stages", "order_items", "orders", "measurements"]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
