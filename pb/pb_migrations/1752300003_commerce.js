/// <reference path="../pb_data/types.d.ts" />
/**
 * Commerce collections: manual/offline payments, invoices, appointments,
 * reviews. No payment gateway — tailors record confirmed payments; customers
 * can file "I've paid" claims (status pending_confirmation) for the tailor
 * to confirm or reject.
 */
migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id
    const ordersId = app.findCollectionByNameOrId("orders").id

    const payments = new Collection({
      type: "base",
      name: "payments",
      listRule: "order.customer = @request.auth.id || order.tailor = @request.auth.id",
      viewRule: "order.customer = @request.auth.id || order.tailor = @request.auth.id",
      createRule:
        '(order.tailor = @request.auth.id && status = "confirmed") || (order.customer = @request.auth.id && status = "pending_confirmation")',
      updateRule: "order.tailor = @request.auth.id",
      fields: [
        {
          name: "order",
          type: "relation",
          required: true,
          collectionId: ordersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "user",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "amount", type: "number", required: true, min: 0 },
        { name: "currency", type: "select", maxSelect: 1, values: ["NGN", "USD", "GBP", "EUR"] },
        {
          name: "method",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["cash", "bank_transfer", "pos", "other"],
        },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["pending_confirmation", "confirmed", "rejected"],
        },
        {
          name: "paymentType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["deposit", "final_payment", "full_payment", "refund"],
        },
        { name: "reference", type: "text", max: 100 },
        { name: "notes", type: "text", max: 500 },
        {
          name: "recordedBy",
          type: "relation",
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "confirmedAt", type: "date" },
        {
          name: "receipt",
          type: "file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_payments_order ON payments (`order`)",
        "CREATE INDEX idx_payments_user ON payments (user)",
        "CREATE INDEX idx_payments_status ON payments (status)",
      ],
    })
    app.save(payments)

    const invoices = new Collection({
      type: "base",
      name: "invoices",
      listRule: "customer = @request.auth.id || tailor = @request.auth.id",
      viewRule: "customer = @request.auth.id || tailor = @request.auth.id",
      createRule: 'tailor = @request.auth.id && @request.auth.userType = "tailor"',
      updateRule: "tailor = @request.auth.id",
      fields: [
        {
          name: "order",
          type: "relation",
          required: true,
          collectionId: ordersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
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
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "invoiceNumber", type: "text", max: 30 },
        { name: "lineItems", type: "json", maxSize: 8000 },
        { name: "subtotal", type: "number", min: 0 },
        { name: "depositRequired", type: "number", min: 0 },
        { name: "currency", type: "select", maxSelect: 1, values: ["NGN", "USD", "GBP", "EUR"] },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["draft", "sent", "partially_paid", "paid", "void"],
        },
        { name: "issuedAt", type: "date" },
        { name: "dueAt", type: "date" },
        { name: "notes", type: "text", max: 500 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_invoices_number ON invoices (invoiceNumber)",
        "CREATE INDEX idx_invoices_order ON invoices (`order`)",
        "CREATE INDEX idx_invoices_customer ON invoices (customer)",
        "CREATE INDEX idx_invoices_tailor ON invoices (tailor)",
      ],
    })
    app.save(invoices)

    const appointments = new Collection({
      type: "base",
      name: "appointments",
      listRule: "customer = @request.auth.id || tailor = @request.auth.id",
      viewRule: "customer = @request.auth.id || tailor = @request.auth.id",
      createRule: "customer = @request.auth.id || tailor = @request.auth.id",
      updateRule: "customer = @request.auth.id || tailor = @request.auth.id",
      deleteRule: "customer = @request.auth.id || tailor = @request.auth.id",
      fields: [
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
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "order",
          type: "relation",
          collectionId: ordersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["fitting", "consultation", "measurement", "pickup", "delivery"],
        },
        { name: "scheduledAt", type: "date", required: true },
        { name: "durationMinutes", type: "number", min: 0, onlyInt: true },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["requested", "confirmed", "completed", "cancelled", "rescheduled"],
        },
        { name: "location", type: "text", max: 200 },
        { name: "notes", type: "text", max: 500 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_appointments_customer ON appointments (customer)",
        "CREATE INDEX idx_appointments_tailor ON appointments (tailor)",
        "CREATE INDEX idx_appointments_scheduled ON appointments (scheduledAt)",
      ],
    })
    app.save(appointments)

    const reviews = new Collection({
      type: "base",
      name: "reviews",
      listRule: "",
      viewRule: "",
      createRule:
        'customer = @request.auth.id && order.customer = @request.auth.id && order.status = "delivered"',
      updateRule: "customer = @request.auth.id",
      deleteRule: "customer = @request.auth.id",
      fields: [
        {
          name: "order",
          type: "relation",
          required: true,
          collectionId: ordersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
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
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "rating", type: "number", required: true, min: 1, max: 5, onlyInt: true },
        { name: "comment", type: "text", max: 1000 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_reviews_order ON reviews (`order`)",
        "CREATE INDEX idx_reviews_tailor ON reviews (tailor)",
      ],
    })
    app.save(reviews)
  },
  (app) => {
    for (const name of ["reviews", "appointments", "invoices", "payments"]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
