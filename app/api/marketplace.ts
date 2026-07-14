/**
 * React Query hooks over the marketplace service: product browsing and the
 * buyer's purchase orders. Placing an order invalidates the purchases list.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  marketplaceOrderApi,
  PlaceOrderInput,
  productApi,
  ProductListParams,
  SellerProductInput,
} from "@/services/api/marketplace-api"

import { unwrap } from "./common"

export const productKeys = {
  all: ["products"] as const,
  list: (params: ProductListParams = {}) => ["products", "list", params] as const,
  detail: (productId: string) => ["products", "detail", productId] as const,
  mine: () => ["products", "mine"] as const,
}

export const marketplaceOrderKeys = {
  all: ["marketplace-orders"] as const,
  purchases: () => ["marketplace-orders", "purchases"] as const,
  detail: (orderId: string) => ["marketplace-orders", "detail", orderId] as const,
}

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => unwrap(productApi.list(params)),
    // search re-keys per keystroke; keep the last page while refetching
    placeholderData: keepPreviousData,
  })
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => unwrap(productApi.getOne(productId)),
    enabled: !!productId,
  })
}

export function useMyProducts() {
  return useQuery({
    queryKey: productKeys.mine(),
    queryFn: () => unwrap(productApi.listMine()),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SellerProductInput) => unwrap(productApi.create(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { productId: string; input: Partial<SellerProductInput> }) =>
      unwrap(productApi.update(vars.productId, vars.input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => unwrap(productApi.remove(productId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useMyPurchases() {
  return useQuery({
    queryKey: marketplaceOrderKeys.purchases(),
    queryFn: () => unwrap(marketplaceOrderApi.listMyPurchases()),
  })
}

export function useMarketplaceOrder(orderId: string) {
  return useQuery({
    queryKey: marketplaceOrderKeys.detail(orderId),
    queryFn: () => unwrap(marketplaceOrderApi.getOne(orderId)),
    enabled: !!orderId,
  })
}

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => unwrap(marketplaceOrderApi.placeOrder(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceOrderKeys.all })
    },
  })
}

export function useCancelMarketplaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => unwrap(marketplaceOrderApi.cancel(orderId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceOrderKeys.all })
    },
  })
}
