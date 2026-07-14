/// <reference path="../pb_data/types.d.ts" />
/**
 * Apply the marketplace write rules to installations that already ran the
 * storefront migration before the server-side validation hook was added.
 */
migrate(
  (app) => {
    const orders = app.findCollectionByNameOrId("marketplace_orders")
    orders.createRule = 'buyer = @request.auth.id && status = "pending_payment"'
    orders.updateRule =
      '(buyer = @request.auth.id && @request.body.status = "cancelled" && ' +
      '@request.body.status:changed = true && @request.body.buyer:changed = false && ' +
      '@request.body.seller:changed = false && @request.body.orderNumber:changed = false && ' +
      '@request.body.items:changed = false && @request.body.subtotal:changed = false && ' +
      '@request.body.currency:changed = false && @request.body.contactName:changed = false && ' +
      '@request.body.contactPhone:changed = false && @request.body.shippingAddress:changed = false && ' +
      '@request.body.paymentMethod:changed = false && @request.body.paymentReference:changed = false && ' +
      '@request.body.notes:changed = false) || ' +
      '(seller = @request.auth.id && @request.body.buyer:changed = false && ' +
      '@request.body.seller:changed = false && @request.body.orderNumber:changed = false && ' +
      '@request.body.items:changed = false && @request.body.subtotal:changed = false && ' +
      '@request.body.currency:changed = false && @request.body.contactName:changed = false && ' +
      '@request.body.contactPhone:changed = false && @request.body.shippingAddress:changed = false && ' +
      '@request.body.paymentMethod:changed = false && @request.body.paymentReference:changed = false && ' +
      '@request.body.notes:changed = false)'
    app.save(orders)
  },
  (app) => {
    const orders = app.findCollectionByNameOrId("marketplace_orders")
    orders.createRule = "buyer = @request.auth.id"
    orders.updateRule = "buyer = @request.auth.id || seller = @request.auth.id"
    app.save(orders)
  },
)
