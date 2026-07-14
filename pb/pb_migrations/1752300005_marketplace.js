/// <reference path="../pb_data/types.d.ts" />
/**
 * Marketplace collections: ready-made products sold by tailors/shops and the
 * buyer-facing orders placed against them.
 *
 * No payment gateway — mirroring the rest of the app, checkout records the
 * buyer's chosen payment method + reference and leaves the order in
 * `pending_payment`; the seller confirms receipt by moving it to `paid`.
 */
migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id

    const products = new Collection({
      type: "base",
      name: "products",
      // public read of active listings; sellers always see their own
      listRule: "isActive = true || seller = @request.auth.id",
      viewRule: "isActive = true || seller = @request.auth.id",
      createRule: '@request.auth.userType = "tailor" && seller = @request.auth.id',
      updateRule: "seller = @request.auth.id",
      deleteRule: "seller = @request.auth.id",
      fields: [
        {
          name: "seller",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "name", type: "text", required: true, max: 120 },
        { name: "description", type: "text", max: 2000 },
        {
          name: "category",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "menswear",
            "womenswear",
            "childrenswear",
            "accessories",
            "footwear",
            "fabric",
            "other",
          ],
        },
        { name: "price", type: "number", required: true, min: 0 },
        {
          name: "currency",
          type: "select",
          maxSelect: 1,
          values: ["NGN", "USD", "GBP", "EUR"],
        },
        { name: "stock", type: "number", min: 0, onlyInt: true },
        {
          name: "images",
          type: "file",
          maxSelect: 5,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        { name: "tags", type: "json", maxSize: 2000 },
        { name: "isActive", type: "bool" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_products_seller ON products (seller)",
        "CREATE INDEX idx_products_category ON products (category)",
        "CREATE INDEX idx_products_active ON products (isActive)",
      ],
    })
    app.save(products)

    const marketplaceOrders = new Collection({
      type: "base",
      name: "marketplace_orders",
      listRule: "buyer = @request.auth.id || seller = @request.auth.id",
      viewRule: "buyer = @request.auth.id || seller = @request.auth.id",
      createRule: "buyer = @request.auth.id",
      // buyer can cancel; seller advances fulfilment / confirms payment
      updateRule: "buyer = @request.auth.id || seller = @request.auth.id",
      fields: [
        {
          name: "buyer",
          type: "relation",
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "seller",
          type: "relation",
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "orderNumber", type: "text", max: 30 },
        // [{ productId, name, price, quantity, image }]
        { name: "items", type: "json", required: true, maxSize: 20000 },
        { name: "subtotal", type: "number", required: true, min: 0 },
        {
          name: "currency",
          type: "select",
          maxSelect: 1,
          values: ["NGN", "USD", "GBP", "EUR"],
        },
        { name: "contactName", type: "text", max: 120 },
        { name: "contactPhone", type: "text", max: 40 },
        { name: "shippingAddress", type: "text", max: 500 },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "pending_payment",
            "paid",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
          ],
        },
        {
          name: "paymentMethod",
          type: "select",
          maxSelect: 1,
          values: ["bank_transfer", "cash", "pos", "other"],
        },
        { name: "paymentReference", type: "text", max: 100 },
        { name: "notes", type: "text", max: 500 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_market_orders_number ON marketplace_orders (orderNumber)",
        "CREATE INDEX idx_market_orders_buyer ON marketplace_orders (buyer)",
        "CREATE INDEX idx_market_orders_seller ON marketplace_orders (seller)",
        "CREATE INDEX idx_market_orders_status ON marketplace_orders (status)",
      ],
    })
    app.save(marketplaceOrders)
  },
  (app) => {
    for (const name of ["marketplace_orders", "products"]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
