"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import {
  clearWishlist as clearRemoteWishlist,
  mergeWishlist,
  toggleWishlistItem,
} from "@/lib/api/wishlist";
import { fileUrl } from "@/lib/pb";
import type { WishlistItem } from "@/lib/types";
import type {
  CartLine,
  CartProductSnapshot,
  WishlistSnapshot,
} from "@/components/storefront/commerce/types";
import { cartLineKey } from "@/components/storefront/commerce/types";

const CART_KEY = "stitchwear.storefront.cart.v1";
const WISHLIST_KEY = "stitchwear.storefront.wishlist.v1";

interface CommerceContextValue {
  hydrated: boolean;
  cart: CartLine[];
  wishlist: WishlistSnapshot[];
  cartCount: number;
  subtotal: number;
  addToCart: (item: CartProductSnapshot, quantity?: number) => void;
  setCartQuantity: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  isWishlisted: (productId: string, variantId?: string) => boolean;
  toggleWishlist: (item: WishlistSnapshot) => void;
  removeFromWishlist: (productId: string, variantId?: string) => void;
  clearWishlist: () => void;
}

const CommerceContext = createContext<CommerceContextValue | null>(null);

function readStored<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function sameWishlistEntry(
  entry: Pick<WishlistSnapshot, "productId" | "variantId">,
  productId: string,
  variantId?: string
) {
  return entry.productId === productId && (entry.variantId ?? "") === (variantId ?? "");
}

function wishlistSnapshot(record: WishlistItem): WishlistSnapshot | null {
  const product = record.expand?.product;
  if (!product) return null;
  const variant = product.variants?.find((item) => item.id === record.variantId);
  const filename = variant?.image || product.images?.[0];
  return {
    productId: product.id,
    name: product.name,
    price: variant?.price ?? product.price,
    currency: product.currency || "NGN",
    image: filename ? fileUrl(product, filename, "600x750") : undefined,
    category: product.category,
    variantId: record.variantId || undefined,
  };
}

export function StorefrontProviders({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<WishlistSnapshot[]>([]);
  const mergedForUser = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setCart(readStored<CartLine>(CART_KEY));
      setWishlist(readStored<WishlistSnapshot>(WISHLIST_KEY));
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  useEffect(() => {
    if (!hydrated || authLoading || !user || mergedForUser.current === user.id) return;
    mergedForUser.current = user.id;
    const guestEntries = wishlist.map((item) => ({
      product: item.productId,
      variantId: item.variantId,
    }));

    mergeWishlist(guestEntries)
      .then((records) => {
        setWishlist((current) => {
          const snapshots = new Map(
            current.map((item) => [
              `${item.productId}:${item.variantId ?? ""}`,
              item,
            ])
          );
          for (const record of records) {
            const snapshot = wishlistSnapshot(record);
            if (!snapshot) continue;
            snapshots.set(`${snapshot.productId}:${snapshot.variantId ?? ""}`, snapshot);
          }
          return [...snapshots.values()];
        });
      })
      .catch(() => {
        // Keep the local copy intact. A later sign-in or explicit toggle retries sync.
        mergedForUser.current = null;
      });
  }, [authLoading, hydrated, user, wishlist]);

  const addToCart = useCallback((item: CartProductSnapshot, quantity = 1) => {
    const key = cartLineKey(item);
    const safeQuantity = Math.max(1, Math.min(Math.floor(quantity), Math.max(item.stock, 1)));
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (!existing) return [...current, { ...item, key, quantity: safeQuantity }];
      return current.map((line) =>
        line.key === key
          ? {
              ...line,
              ...item,
              quantity: Math.min(line.quantity + safeQuantity, Math.max(item.stock, 1)),
            }
          : line
      );
    });
  }, []);

  const setCartQuantity = useCallback((key: string, quantity: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.key === key
            ? {
                ...line,
                quantity: Math.max(0, Math.min(Math.floor(quantity), line.stock)),
              }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((current) => current.filter((line) => line.key !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const isWishlisted = useCallback(
    (productId: string, variantId?: string) =>
      wishlist.some((entry) => sameWishlistEntry(entry, productId, variantId)),
    [wishlist]
  );

  const removeFromWishlist = useCallback(
    (productId: string, variantId?: string) => {
      const previous = wishlist;
      setWishlist((current) =>
        current.filter((entry) => !sameWishlistEntry(entry, productId, variantId))
      );
      if (user) {
        toggleWishlistItem(productId, variantId).catch(() => setWishlist(previous));
      }
    },
    [user, wishlist]
  );

  const toggleWishlist = useCallback(
    (item: WishlistSnapshot) => {
      const previous = wishlist;
      setWishlist((current) => {
        const exists = current.some((entry) =>
          sameWishlistEntry(entry, item.productId, item.variantId)
        );
        return exists
          ? current.filter(
              (entry) => !sameWishlistEntry(entry, item.productId, item.variantId)
            )
          : [...current, item];
      });
      if (user) {
        toggleWishlistItem(item.productId, item.variantId).catch(() =>
          setWishlist(previous)
        );
      }
    },
    [user, wishlist]
  );

  const clearWishlist = useCallback(() => {
    const previous = wishlist;
    setWishlist([]);
    if (user) clearRemoteWishlist().catch(() => setWishlist(previous));
  }, [user, wishlist]);

  const value = useMemo<CommerceContextValue>(
    () => ({
      hydrated,
      cart,
      wishlist,
      cartCount: cart.reduce((total, line) => total + line.quantity, 0),
      subtotal: cart.reduce((total, line) => total + line.price * line.quantity, 0),
      addToCart,
      setCartQuantity,
      removeFromCart,
      clearCart,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
    }),
    [
      addToCart,
      cart,
      clearCart,
      clearWishlist,
      hydrated,
      isWishlisted,
      removeFromCart,
      removeFromWishlist,
      setCartQuantity,
      toggleWishlist,
      wishlist,
    ]
  );

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export function useStorefrontCommerce(): CommerceContextValue {
  const context = useContext(CommerceContext);
  if (!context) {
    throw new Error(
      "useStorefrontCommerce must be used inside <StorefrontProviders>."
    );
  }
  return context;
}
