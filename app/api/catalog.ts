/**
 * React Query hooks over the catalog service (styles, fabrics, tailors).
 *
 * Thin wrappers: the PocketBase service layer stays the transport;
 * these hooks only own caching, refetch and error state.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { catalogApi, FabricSearchParams, StyleListParams } from "@/services/api/catalog-api"

import { unwrap } from "./common"

export const styleKeys = {
  list: (params: StyleListParams = {}) => ["styles", "list", params] as const,
  detail: (styleId: string) => ["styles", "detail", styleId] as const,
}

export const fabricKeys = {
  list: (params: FabricSearchParams = {}) => ["fabrics", "list", params] as const,
}

export const tailorKeys = {
  list: () => ["tailors", "list"] as const,
}

export function useStyles(params: StyleListParams = {}) {
  return useQuery({
    queryKey: styleKeys.list(params),
    queryFn: () => unwrap(catalogApi.listStyles(params)),
    // The search input re-keys this query per keystroke; keep the previous
    // page of results on screen instead of flashing to empty.
    placeholderData: keepPreviousData,
  })
}

export function useStyle(styleId: string) {
  return useQuery({
    queryKey: styleKeys.detail(styleId),
    queryFn: () => unwrap(catalogApi.getStyle(styleId)),
    enabled: !!styleId,
  })
}

export function useFabrics(params: FabricSearchParams = {}) {
  return useQuery({
    queryKey: fabricKeys.list(params),
    queryFn: () => unwrap(catalogApi.listFabrics(params)),
    placeholderData: keepPreviousData,
  })
}

export function useTailors() {
  return useQuery({
    queryKey: tailorKeys.list(),
    queryFn: () => unwrap(catalogApi.listTailors()),
  })
}
