import type { ListResult } from "pocketbase";
import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type {
  MarketplaceOrder,
  MarketplaceOrderItem,
  MarketplaceOrderStatus,
  PaymentMethod,
  Product,
  ProductCategory,
  ProductVariant,
} from "@/lib/types";

export type ProductSort =
  | "featured"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating";

export interface ProductListFilters {
  category?: ProductCategory | ProductCategory[];
  seller?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  inStock?: boolean;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
}

const PRODUCT_SORTS: Record<ProductSort, string> = {
  featured: "-isFeatured,-created",
  newest: "-created",
  price_asc: "price",
  price_desc: "-price",
  rating: "-rating,-reviewCount",
};

export async function listProducts(
  filters: ProductListFilters = {}
): Promise<ListResult<Product>> {
  const pb = getPb();
  const {
    category,
    seller,
    search,
    minPrice,
    maxPrice,
    featured,
    inStock,
    sort = "featured",
    page = 1,
    perPage = 24,
  } = filters;

  const parts = ["isActive = true"];
  const categories = category
    ? Array.isArray(category)
      ? category
      : [category]
    : [];
  if (categories.length > 0) {
    parts.push(
      `(${categories
        .map((value) => pb.filter("category = {:category}", { category: value }))
        .join(" || ")})`
    );
  }
  if (seller) parts.push(pb.filter("seller = {:seller}", { seller }));
  if (search) {
    parts.push(
      pb.filter("(name ~ {:query} || description ~ {:query})", {
        query: search,
      })
    );
  }
  if (minPrice !== undefined) {
    parts.push(pb.filter("price >= {:minPrice}", { minPrice }));
  }
  if (maxPrice !== undefined) {
    parts.push(pb.filter("price <= {:maxPrice}", { maxPrice }));
  }
  if (featured !== undefined) {
    parts.push(pb.filter("isFeatured = {:featured}", { featured }));
  }
  if (inStock) parts.push("stock > 0");

  return pb.collection(COLLECTIONS.products).getList<Product>(page, perPage, {
    filter: parts.join(" && "),
    sort: PRODUCT_SORTS[sort],
  });
}

/** Resolve either a PocketBase record id or the public product slug. */
export async function getProduct(idOrSlug: string): Promise<Product> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.products).getFirstListItem<Product>(
    pb.filter("isActive = true && (id = {:value} || slug = {:value})", {
      value: idOrSlug,
    })
  );
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const pb = getPb();
  const idFilter = uniqueIds
    .map((id) => pb.filter("id = {:id}", { id }))
    .join(" || ");
  return pb.collection(COLLECTIONS.products).getFullList<Product>({
    filter: `isActive = true && (${idFilter})`,
  });
}

export interface MarketplaceOrderItemInput {
  productId: string;
  sellerId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  currency?: string;
  variantId?: string;
  variantLabel?: string;
  size?: string;
  color?: string;
}

export interface CreateMarketplaceOrdersInput {
  items: MarketplaceOrderItemInput[];
  contactName: string;
  contactPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  notes?: string;
}

interface SellerOrderGroup {
  seller: string;
  currency: string;
  items: MarketplaceOrderItem[];
  subtotal: number;
}

/**
 * Re-read and validate product data, then create one pending-payment order per
 * seller. Prices and seller ids are always taken from PocketBase, never from
 * the browser's cart snapshot.
 */
export async function createMarketplaceOrders(
  input: CreateMarketplaceOrdersInput
): Promise<MarketplaceOrder[]> {
  if (input.items.length === 0) throw new Error("Your cart is empty.");
  if (!input.contactName.trim()) throw new Error("Contact name is required.");
  if (!input.contactPhone.trim()) throw new Error("Contact phone is required.");
  if (!input.shippingAddress.trim()) {
    throw new Error("Shipping address is required.");
  }

  const buyer = authedUserId();
  const products = await getProductsByIds(input.items.map((item) => item.productId));
  const productMap = new Map(products.map((product) => [product.id, product]));
  const groups = new Map<string, SellerOrderGroup>();

  for (const cartItem of input.items) {
    if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) {
      throw new Error(`Choose a valid quantity for ${cartItem.name}.`);
    }

    const product = productMap.get(cartItem.productId);
    if (!product) {
      throw new Error(`${cartItem.name} is no longer available.`);
    }
    if (product.seller !== cartItem.sellerId) {
      throw new Error(`${product.name} has changed seller. Refresh your cart.`);
    }

    const variant = resolveVariant(product, cartItem.variantId);
    if (cartItem.variantId && !variant) {
      throw new Error(`Your selected ${product.name} option is no longer available.`);
    }
    const availableStock = variant ? variant.stock : product.stock;
    if (availableStock < cartItem.quantity) {
      throw new Error(
        `Only ${Math.max(availableStock, 0)} of ${product.name} is available.`
      );
    }

    const currency = product.currency || "NGN";
    if (cartItem.currency && cartItem.currency !== currency) {
      throw new Error(`${product.name} has changed currency. Refresh your cart.`);
    }
    const price = variant?.price ?? product.price;
    const orderItem: MarketplaceOrderItem = {
      productId: product.id,
      name: product.name,
      price,
      quantity: cartItem.quantity,
      image: variant?.image || product.images[0] || undefined,
      variantId: variant?.id,
      variantLabel: variant?.label,
      size: variant?.size,
      color: variant?.color,
    };

    const existing = groups.get(product.seller);
    if (existing && existing.currency !== currency) {
      throw new Error(
        "Products from one seller must use the same currency before checkout."
      );
    }
    const group = existing ?? {
      seller: product.seller,
      currency,
      items: [],
      subtotal: 0,
    };
    group.items.push(orderItem);
    group.subtotal += price * cartItem.quantity;
    groups.set(product.seller, group);
  }

  const pb = getPb();
  const orders: MarketplaceOrder[] = [];
  for (const group of groups.values()) {
    orders.push(
      await pb.collection(COLLECTIONS.marketplaceOrders).create<MarketplaceOrder>({
        buyer,
        seller: group.seller,
        orderNumber: marketplaceOrderNumber(),
        items: group.items,
        subtotal: group.subtotal,
        currency: group.currency,
        contactName: input.contactName.trim(),
        contactPhone: input.contactPhone.trim(),
        shippingAddress: input.shippingAddress.trim(),
        status: "pending_payment",
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference?.trim() ?? "",
        notes: input.notes?.trim() ?? "",
      })
    );
  }
  return orders;
}

export async function listMyMarketplaceOrders(
  page = 1,
  perPage = 20
): Promise<ListResult<MarketplaceOrder>> {
  const pb = getPb();
  return pb
    .collection(COLLECTIONS.marketplaceOrders)
    .getList<MarketplaceOrder>(page, perPage, {
      filter: pb.filter("buyer = {:buyer}", { buyer: authedUserId() }),
      sort: "-created",
    });
}

export async function getMarketplaceOrder(id: string): Promise<MarketplaceOrder> {
  return getPb()
    .collection(COLLECTIONS.marketplaceOrders)
    .getOne<MarketplaceOrder>(id);
}

export async function listSellerMarketplaceOrders(
  page = 1,
  perPage = 50
): Promise<ListResult<MarketplaceOrder>> {
  const pb = getPb();
  return pb
    .collection(COLLECTIONS.marketplaceOrders)
    .getList<MarketplaceOrder>(page, perPage, {
      filter: pb.filter("seller = {:seller}", { seller: authedUserId() }),
      sort: "-created",
    });
}

export async function updateMarketplaceOrderStatus(
  id: string,
  status: MarketplaceOrderStatus
): Promise<MarketplaceOrder> {
  return getPb()
    .collection(COLLECTIONS.marketplaceOrders)
    .update<MarketplaceOrder>(id, { status });
}

function resolveVariant(
  product: Product,
  variantId?: string
): ProductVariant | undefined {
  if (!variantId) return undefined;
  return product.variants?.find((variant) => variant.id === variantId);
}

function marketplaceOrderNumber(): string {
  const year = new Date().getFullYear();
  const suffix = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `MKT-${year}-${suffix.toUpperCase()}`;
}
