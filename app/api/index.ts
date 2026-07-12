/**
 * React Query hook layer over the PocketBase service layer.
 * One module per domain; `common` holds the shared QueryClient and the
 * ServiceResult -> thrown-error bridge.
 */
export * from "./common"
export * from "./catalog"
export * from "./appointments"
export * from "./invoices"
