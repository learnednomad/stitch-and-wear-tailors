/**
 * Async Action Utilities for MST Models
 * Provides common patterns for handling async operations in MST stores
 */

import { flow } from "mobx-state-tree"

/**
 * Configuration for async actions
 */
export interface AsyncActionConfig {
  /** Whether to show loading state during execution */
  showLoading?: boolean
  /** Whether to clear errors before starting */
  clearErrors?: boolean
  /** Whether to handle errors automatically */
  handleErrors?: boolean
  /** Custom error message prefix */
  errorPrefix?: string
  /** Whether to update lastFetched timestamp on success */
  updateTimestamp?: boolean
}

/**
 * Creates a standardized async action with error handling and loading states
 */
export function createAsyncAction<TArgs extends any[], TReturn>(
  store: {
    setLoading?: (loading: boolean) => void
    setError?: (error: string | null) => void
    clearError?: () => void
    setLastFetched?: (timestamp: string) => void
  },
  asyncFn: (...args: TArgs) => Promise<TReturn>,
  config: AsyncActionConfig = {}
) {
  const {
    showLoading = true,
    clearErrors = true,
    handleErrors = true,
    errorPrefix = "",
    updateTimestamp = true,
  } = config

  return flow(function* (...args: TArgs) {
    try {
      // Clear previous errors if requested
      if (clearErrors && store.clearError) {
        store.clearError()
      }

      // Set loading state if requested
      if (showLoading && store.setLoading) {
        store.setLoading(true)
      }

      // Execute the async operation
      const result: TReturn = yield asyncFn(...args)

      // Update timestamp on success if requested
      if (updateTimestamp && store.setLastFetched) {
        store.setLastFetched(new Date().toISOString())
      }

      return result
    } catch (error) {
      // Handle errors if requested
      if (handleErrors && store.setError) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : String(error)
        
        const finalMessage = errorPrefix 
          ? `${errorPrefix}: ${errorMessage}`
          : errorMessage
          
        store.setError(finalMessage)
      }

      // Re-throw error for caller to handle if needed
      throw error
    } finally {
      // Always clear loading state
      if (showLoading && store.setLoading) {
        store.setLoading(false)
      }
    }
  })
}

/**
 * Creates a debounced async action to prevent rapid successive calls
 */
export function createDebouncedAsyncAction<TArgs extends any[], TReturn>(
  store: any,
  asyncFn: (...args: TArgs) => Promise<TReturn>,
  debounceMs: number = 300,
  config: AsyncActionConfig = {}
) {
  let timeoutId: NodeJS.Timeout | null = null
  
  const asyncAction = createAsyncAction(store, asyncFn, config)

  return (...args: TArgs) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // Set new timeout
    return new Promise<TReturn>((resolve, reject) => {
      timeoutId = setTimeout(() => {
        asyncAction(...args)
          .then(resolve)
          .catch(reject)
      }, debounceMs)
    })
  }
}

/**
 * Creates an async action with retry logic
 */
export function createRetryAsyncAction<TArgs extends any[], TReturn>(
  store: any,
  asyncFn: (...args: TArgs) => Promise<TReturn>,
  maxRetries: number = 3,
  retryDelay: number = 1000,
  config: AsyncActionConfig = {}
) {
  return flow(function* (...args: TArgs) {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Use regular async action for each attempt
        const asyncAction = createAsyncAction(store, asyncFn, {
          ...config,
          // Only show loading on first attempt
          showLoading: config.showLoading && attempt === 0,
        })
        
        const result: TReturn = yield asyncAction(...args)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // If this was the last attempt, don't wait
        if (attempt === maxRetries) {
          break
        }
        
        // Wait before retrying
        yield new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
    
    // If we get here, all attempts failed
    throw lastError
  })
}

/**
 * Creates an optimistic update action that reverts on failure
 */
export function createOptimisticAction<TArgs extends any[], TReturn, TState>(
  store: any,
  asyncFn: (...args: TArgs) => Promise<TReturn>,
  optimisticUpdate: (store: any, ...args: TArgs) => TState,
  revertUpdate: (store: any, previousState: TState) => void,
  config: AsyncActionConfig = {}
) {
  return flow(function* (...args: TArgs) {
    // Apply optimistic update and save previous state
    const previousState = optimisticUpdate(store, ...args)
    
    try {
      // Execute the async operation
      const result: TReturn = yield asyncFn(...args)
      
      // Update timestamp on success if requested
      if (config.updateTimestamp && store.setLastFetched) {
        store.setLastFetched(new Date().toISOString())
      }
      
      return result
    } catch (error) {
      // Revert optimistic update on failure
      revertUpdate(store, previousState)
      
      // Handle errors if requested
      if (config.handleErrors && store.setError) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : String(error)
        
        const finalMessage = config.errorPrefix 
          ? `${config.errorPrefix}: ${errorMessage}`
          : errorMessage
          
        store.setError(finalMessage)
      }
      
      throw error
    }
  })
}

/**
 * Utility for creating paginated load actions
 */
export function createPaginatedAction<TItem>(
  store: {
    items: TItem[]
    page: number
    hasMore: boolean
    isLoading: boolean
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    setHasMore: (hasMore: boolean) => void
    incrementPage: () => void
    addItems: (items: TItem[]) => void
    setItems: (items: TItem[]) => void
  },
  fetchFn: (page: number) => Promise<{ items: TItem[]; hasMore: boolean }>
) {
  return flow(function* (reset: boolean = false) {
    try {
      store.setLoading(true)
      store.setError(null)
      
      const currentPage = reset ? 1 : store.page
      const result: { items: TItem[]; hasMore: boolean } = yield fetchFn(currentPage)
      
      if (reset) {
        store.setItems(result.items)
      } else {
        store.addItems(result.items)
      }
      
      store.setHasMore(result.hasMore)
      
      if (!reset) {
        store.incrementPage()
      }
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      store.setError(`Failed to load items: ${errorMessage}`)
      throw error
    } finally {
      store.setLoading(false)
    }
  })
}