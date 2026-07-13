/**
 * CartContext
 *
 * Client-side shopping cart for the marketplace. Kept in memory and persisted
 * to MMKV so it survives app restarts. Items reference a product and carry a
 * snapshot of price/name/image/seller at add-time so the cart renders without
 * refetching. Checkout groups by seller (one marketplace order per seller).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import * as storage from "@/utils/storage"
import { PBProductRecord } from "@/services/api/marketplace-api"
import { fileUrl } from "@/services/api/pocketbase-api-adapter"

export interface CartLine {
  productId: string
  name: string
  price: number
  currency: string
  image?: string
  sellerId: string
  stock: number
  quantity: number
}

interface CartContextValue {
  lines: CartLine[]
  count: number
  subtotal: number
  addProduct: (product: PBProductRecord, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  removeProduct: (productId: string) => void
  clear: () => void
}

const CART_STORAGE_KEY = "marketplace.cart"

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(
    () => storage.getObject<CartLine[]>(CART_STORAGE_KEY) ?? [],
  )

  useEffect(() => {
    storage.set(CART_STORAGE_KEY, lines)
  }, [lines])

  const addProduct = useCallback((product: PBProductRecord, quantity: number = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: Math.min(l.quantity + quantity, l.stock || Infinity) }
            : l,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          currency: product.currency || "NGN",
          image: product.images?.length
            ? fileUrl(product, product.images[0], "300x300")
            : undefined,
          sellerId: product.seller,
          stock: product.stock ?? 0,
          quantity,
        },
      ]
    })
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
    )
  }, [])

  const removeProduct = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const count = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines])
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [lines],
  )

  const value = useMemo(
    () => ({ lines, count, subtotal, addProduct, setQuantity, removeProduct, clear }),
    [lines, count, subtotal, addProduct, setQuantity, removeProduct, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within a CartProvider")
  return ctx
}
