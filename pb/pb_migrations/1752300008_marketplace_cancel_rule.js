/// <reference path="../pb_data/types.d.ts" />
/** Ensure buyer cancellation checks the submitted status, not the stored one. */
migrate(
  (app) => {
    const orders = app.findCollectionByNameOrId("marketplace_orders")
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
    orders.updateRule =
      '(buyer = @request.auth.id && status = "cancelled" && ' +
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
)
