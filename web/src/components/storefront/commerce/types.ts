export interface CartProductSnapshot {
  productId: string;
  sellerId: string;
  name: string;
  price: number;
  currency: string;
  image?: string;
  stock: number;
  variantId?: string;
  variantLabel?: string;
  size?: string;
  color?: string;
}

export interface CartLine extends CartProductSnapshot {
  key: string;
  quantity: number;
}

export interface WishlistSnapshot {
  productId: string;
  name: string;
  price: number;
  currency: string;
  image?: string;
  category?: string;
  variantId?: string;
}

export interface CheckoutDraft {
  contactName: string;
  contactPhone: string;
  shippingAddress: string;
  paymentMethod: "bank_transfer" | "cash" | "pos" | "other";
  paymentReference: string;
  notes: string;
}

export interface OrderSuccessSnapshot {
  id: string;
  orderNumber: string;
  sellerId: string;
  subtotal: number;
  currency: string;
}

export function cartLineKey(
  item: Pick<CartProductSnapshot, "productId" | "variantId" | "size" | "color">
): string {
  return [item.productId, item.variantId, item.size, item.color]
    .filter(Boolean)
    .join(":");
}

