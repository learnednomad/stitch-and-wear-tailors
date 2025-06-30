/**
 * FabricStore - Fabric Catalog and Inventory Management
 * Manages fabric catalog, inventory, search, filtering, and wishlist functionality
 */

import { types, flow, Instance, SnapshotOut } from "mobx-state-tree"
import { createAsyncAction, createCollectionModel, createSearchModel, generateId, createTimestamp } from "../mst"
import { Fabric, FabricCategory, FabricColor } from "../types"
import { validateFabric } from "../schemas"

/**
 * MST model for fabric inventory tracking
 */
const FabricInventoryModel = types.model("FabricInventory", {
  quantity: types.number,
  unit: types.enumeration("Unit", ["meters", "yards", "pieces"]),
  reservedQuantity: types.optional(types.number, 0),
  availableQuantity: types.number,
  reorderLevel: types.number,
  maxStock: types.number,
  location: types.maybeNull(types.string),
  lastRestocked: types.maybeNull(types.string),
  lastUpdated: types.string,
})

/**
 * MST model for fabric pricing
 */
const FabricPricingModel = types.model("FabricPricing", {
  basePrice: types.number,
  currency: types.string,
  pricePerUnit: types.number,
  discountPrice: types.maybeNull(types.number),
  wholesalePrice: types.maybeNull(types.number),
  minimumOrder: types.optional(types.number, 1),
  bulkPricing: types.array(types.model("BulkPricing", {
    minQuantity: types.number,
    pricePerUnit: types.number,
  })),
  lastUpdated: types.string,
})

/**
 * Main Fabric model
 */
const FabricModel = types.model("Fabric", {
  id: types.string,
  name: types.string,
  description: types.string,
  category: types.enumeration("FabricCategory", [
    "cotton", "silk", "wool", "linen", "polyester", "denim", "velvet", "leather", "synthetic"
  ]),
  subcategory: types.maybeNull(types.string),
  
  // Fabric properties
  material: types.string,
  weight: types.number,
  width: types.number,
  color: types.string,
  pattern: types.maybeNull(types.string),
  texture: types.maybeNull(types.string),
  stretch: types.maybeNull(types.enumeration("Stretch", ["none", "slight", "moderate", "high"])),
  opacity: types.maybeNull(types.enumeration("Opacity", ["transparent", "semi_transparent", "opaque"])),
  
  // Care instructions
  careInstructions: types.array(types.string),
  washingInstructions: types.maybeNull(types.string),
  
  // Inventory and pricing
  inventory: types.optional(FabricInventoryModel, () => FabricInventoryModel.create({
    quantity: 0,
    unit: "meters",
    availableQuantity: 0,
    reorderLevel: 10,
    maxStock: 100,
    location: null,
    lastRestocked: null,
    lastUpdated: createTimestamp(),
  })),
  pricing: types.optional(FabricPricingModel, () => FabricPricingModel.create({
    basePrice: 0,
    currency: "USD",
    pricePerUnit: 0,
    discountPrice: null,
    wholesalePrice: null,
    minimumOrder: 1,
    bulkPricing: [],
    lastUpdated: createTimestamp(),
  })),
  
  // Media and display
  images: types.array(types.string),
  primaryImage: types.maybeNull(types.string),
  thumbnailImage: types.maybeNull(types.string),
  
  // Metadata
  sku: types.string,
  barcode: types.maybeNull(types.string),
  supplier: types.maybeNull(types.string),
  supplierSku: types.maybeNull(types.string),
  tags: types.array(types.string),
  isActive: types.optional(types.boolean, true),
  isFeatured: types.optional(types.boolean, false),
  
  // Ratings and reviews
  averageRating: types.optional(types.number, 0),
  reviewCount: types.optional(types.number, 0),
  popularityScore: types.optional(types.number, 0),
  
  createdAt: types.string,
  updatedAt: types.string,
})

/**
 * Collection model for fabrics
 */
const FabricsCollectionModel = createCollectionModel("FabricsCollection", FabricModel)

/**
 * Search model with fabric-specific filters
 */
const FabricSearchModel = createSearchModel()
  .actions(self => ({
    /**
     * Set category filter
     */
    setCategoryFilter(category: FabricCategory | null) {
      if (category) {
        self.setFilter("category", category)
      } else {
        self.removeFilter("category")
      }
    },

    /**
     * Set color filter
     */
    setColorFilter(color: string | null) {
      if (color) {
        self.setFilter("color", color)
      } else {
        self.removeFilter("color")
      }
    },

    /**
     * Set price range filter
     */
    setPriceRangeFilter(min: number | null, max: number | null) {
      if (min !== null) self.setFilter("priceMin", min)
      else self.removeFilter("priceMin")
      
      if (max !== null) self.setFilter("priceMax", max)
      else self.removeFilter("priceMax")
    },

    /**
     * Set availability filter
     */
    setAvailabilityFilter(available: boolean | null) {
      if (available !== null) {
        self.setFilter("available", available)
      } else {
        self.removeFilter("available")
      }
    },
  }))

/**
 * Wishlist model for user fabric preferences
 */
const WishlistModel = types.model("Wishlist", {
  userId: types.string,
  fabricIds: types.array(types.string),
  lastUpdated: types.string,
})
  .actions(self => ({
    addFabric(fabricId: string) {
      if (!self.fabricIds.includes(fabricId)) {
        self.fabricIds.push(fabricId)
        self.lastUpdated = createTimestamp()
      }
    },

    removeFabric(fabricId: string) {
      const index = self.fabricIds.indexOf(fabricId)
      if (index !== -1) {
        self.fabricIds.splice(index, 1)
        self.lastUpdated = createTimestamp()
      }
    },

    clear() {
      self.fabricIds.clear()
      self.lastUpdated = createTimestamp()
    },
  }))
  .views(self => ({
    get count() {
      return self.fabricIds.length
    },

    hasFabric(fabricId: string) {
      return self.fabricIds.includes(fabricId)
    },
  }))

/**
 * Main FabricStore model
 */
export const FabricStoreModel = types
  .model("FabricStore", {
    // Fabrics collection
    fabrics: types.optional(FabricsCollectionModel, {}),
    
    // Current fabric being viewed
    currentFabric: types.maybeNull(FabricModel),
    
    // Search and filtering
    search: types.optional(FabricSearchModel, {}),
    
    // Wishlist
    wishlist: types.maybeNull(WishlistModel),
    
    // Categories and filters data
    categories: types.array(types.model("Category", {
      id: types.string,
      name: types.string,
      count: types.number,
    })),
    colors: types.array(types.model("Color", {
      name: types.string,
      hex: types.string,
      count: types.number,
    })),
    priceRange: types.model("PriceRange", {
      min: types.optional(types.number, 0),
      max: types.optional(types.number, 1000),
    }),
    
    // Loading and error states
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),
    
    // Inventory alerts
    lowStockAlerts: types.array(types.model("LowStockAlert", {
      fabricId: types.string,
      fabricName: types.string,
      currentStock: types.number,
      reorderLevel: types.number,
      alertLevel: types.enumeration("AlertLevel", ["warning", "critical"]),
      createdAt: types.string,
    })),
  })
  .actions(self => {
    // Helper actions
    const setLoading = (loading: boolean) => {
      self.isLoading = loading
    }

    const setError = (error: string | null) => {
      self.error = error
    }

    const clearError = () => {
      self.error = null
    }

    const setLastFetched = (timestamp: string) => {
      self.lastFetched = timestamp
    }

    return {
      setLoading,
      setError,
      clearError,
      setLastFetched,

      /**
       * Set current fabric
       */
      setCurrentFabric(fabric: Fabric | null) {
        if (fabric) {
          const validatedFabric = validateFabric(fabric)
          self.currentFabric = FabricModel.create(validatedFabric)
        } else {
          self.currentFabric = null
        }
      },

      /**
       * Initialize wishlist for user
       */
      initializeWishlist(userId: string) {
        self.wishlist = WishlistModel.create({
          userId,
          fabricIds: [],
          lastUpdated: createTimestamp(),
        })
      },

      /**
       * Add fabric to wishlist
       */
      addToWishlist(fabricId: string) {
        if (self.wishlist) {
          self.wishlist.addFabric(fabricId)
        }
      },

      /**
       * Remove fabric from wishlist
       */
      removeFromWishlist(fabricId: string) {
        if (self.wishlist) {
          self.wishlist.removeFabric(fabricId)
        }
      },

      /**
       * Update fabric inventory
       */
      updateInventory(fabricId: string, updates: Partial<typeof FabricInventoryModel.Type>) {
        const fabric = self.fabrics.findById(fabricId)
        if (fabric) {
          Object.assign(fabric.inventory, updates, { lastUpdated: createTimestamp() })
          fabric.updatedAt = createTimestamp()

          // Update available quantity
          if (updates.quantity !== undefined || updates.reservedQuantity !== undefined) {
            fabric.inventory.availableQuantity = fabric.inventory.quantity - fabric.inventory.reservedQuantity
          }

          // Check for low stock alerts
          self.checkLowStockAlert(fabric)
        }
      },

      /**
       * Update fabric pricing
       */
      updatePricing(fabricId: string, updates: Partial<typeof FabricPricingModel.Type>) {
        const fabric = self.fabrics.findById(fabricId)
        if (fabric) {
          Object.assign(fabric.pricing, updates, { lastUpdated: createTimestamp() })
          fabric.updatedAt = createTimestamp()
        }
      },

      /**
       * Reserve fabric inventory
       */
      reserveInventory(fabricId: string, quantity: number) {
        const fabric = self.fabrics.findById(fabricId)
        if (fabric && fabric.inventory.availableQuantity >= quantity) {
          fabric.inventory.reservedQuantity += quantity
          fabric.inventory.availableQuantity -= quantity
          fabric.inventory.lastUpdated = createTimestamp()
          return true
        }
        return false
      },

      /**
       * Release reserved inventory
       */
      releaseInventory(fabricId: string, quantity: number) {
        const fabric = self.fabrics.findById(fabricId)
        if (fabric && fabric.inventory.reservedQuantity >= quantity) {
          fabric.inventory.reservedQuantity -= quantity
          fabric.inventory.availableQuantity += quantity
          fabric.inventory.lastUpdated = createTimestamp()
          return true
        }
        return false
      },

      /**
       * Check and create low stock alerts
       */
      checkLowStockAlert(fabric: any) {
        const existingAlert = self.lowStockAlerts.find(alert => alert.fabricId === fabric.id)
        
        if (fabric.inventory.availableQuantity <= fabric.inventory.reorderLevel) {
          const alertLevel = fabric.inventory.availableQuantity === 0 ? "critical" : "warning"
          
          if (!existingAlert) {
            self.lowStockAlerts.push({
              fabricId: fabric.id,
              fabricName: fabric.name,
              currentStock: fabric.inventory.availableQuantity,
              reorderLevel: fabric.inventory.reorderLevel,
              alertLevel,
              createdAt: createTimestamp(),
            })
          } else {
            // Update existing alert
            existingAlert.currentStock = fabric.inventory.availableQuantity
            existingAlert.alertLevel = alertLevel
          }
        } else if (existingAlert) {
          // Remove alert if stock is above reorder level
          const index = self.lowStockAlerts.indexOf(existingAlert)
          self.lowStockAlerts.splice(index, 1)
        }
      },

      /**
       * Update filter data
       */
      updateFilterData(data: {
        categories?: Array<{ id: string; name: string; count: number }>
        colors?: Array<{ name: string; hex: string; count: number }>
        priceRange?: { min: number; max: number }
      }) {
        if (data.categories) {
          self.categories.clear()
          self.categories.push(...data.categories)
        }
        if (data.colors) {
          self.colors.clear()
          self.colors.push(...data.colors)
        }
        if (data.priceRange) {
          self.priceRange.min = data.priceRange.min
          self.priceRange.max = data.priceRange.max
        }
      },
    }
  })
  .actions(self => {
    // Async actions
    const fetchFabrics = createAsyncAction(
      self,
      async (params: {
        page?: number
        category?: FabricCategory
        color?: string
        priceMin?: number
        priceMax?: number
        available?: boolean
        featured?: boolean
        search?: string
        sortBy?: string
        sortOrder?: "asc" | "desc"
      } = {}) => {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.set(key, value.toString())
          }
        })

        const response = await fetch(`/api/fabrics?${queryParams}`, {
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch fabrics')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to load fabrics" }
    )

    const fetchFabricDetails = createAsyncAction(
      self,
      async (fabricId: string) => {
        const response = await fetch(`/api/fabrics/${fabricId}`, {
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch fabric details')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to load fabric details" }
    )

    const updateFabric = createAsyncAction(
      self,
      async (fabricId: string, updates: Partial<Fabric>) => {
        const response = await fetch(`/api/fabrics/${fabricId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        
        if (!response.ok) {
          throw new Error('Failed to update fabric')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to update fabric" }
    )

    const syncWishlist = createAsyncAction(
      self,
      async (fabricIds: string[]) => {
        if (!self.wishlist) return

        const response = await fetch(`/api/users/${self.wishlist.userId}/wishlist`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fabricIds }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to sync wishlist')
        }
        
        return response.json()
      },
      { errorPrefix: "Failed to sync wishlist", showLoading: false }
    )

    return {
      /**
       * Load fabrics with filtering and pagination
       */
      loadFabrics: flow(function* (params: any = {}, reset: boolean = false) {
        try {
          const result = yield fetchFabrics(params)
          
          if (reset) {
            self.fabrics.setItems(result.fabrics)
          } else {
            self.fabrics.addItems(result.fabrics)
          }
          
          self.fabrics.setHasMore(result.hasMore)
          
          // Update filter data if provided
          if (result.filterData) {
            self.updateFilterData(result.filterData)
          }
          
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load single fabric details
       */
      loadFabric: flow(function* (fabricId: string) {
        try {
          const fabric = yield fetchFabricDetails(fabricId)
          self.setCurrentFabric(fabric)
          return fabric
        } catch (error) {
          throw error
        }
      }),

      /**
       * Search fabrics
       */
      searchFabrics: flow(function* (query: string, filters: any = {}) {
        self.search.setQuery(query)
        Object.entries(filters).forEach(([key, value]) => {
          self.search.setFilter(key, value)
        })
        
        try {
          const params = { ...filters, search: query, page: 1 }
          const result = yield fetchFabrics(params)
          self.fabrics.setItems(result.fabrics)
          self.fabrics.setHasMore(result.hasMore)
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load featured fabrics
       */
      loadFeaturedFabrics: flow(function* () {
        try {
          const result = yield fetchFabrics({ featured: true, page: 1 })
          return result.fabrics
        } catch (error) {
          throw error
        }
      }),

      /**
       * Save fabric changes
       */
      saveFabric: flow(function* (fabricId: string, updates: Partial<Fabric>) {
        try {
          const updatedFabric = yield updateFabric(fabricId, updates)
          self.fabrics.updateItem(fabricId, updatedFabric)
          
          if (self.currentFabric?.id === fabricId) {
            self.setCurrentFabric(updatedFabric)
          }
          
          return updatedFabric
        } catch (error) {
          throw error
        }
      }),

      /**
       * Sync wishlist with server
       */
      saveWishlist: flow(function* () {
        if (!self.wishlist) return

        try {
          yield syncWishlist([...self.wishlist.fabricIds])
        } catch (error) {
          // Silently fail wishlist sync
          console.warn('Failed to sync wishlist:', error)
        }
      }),

      /**
       * Load user's wishlist
       */
      loadWishlist: flow(function* (userId: string) {
        try {
          const response = yield fetch(`/api/users/${userId}/wishlist`)
          if (!response.ok) throw new Error('Failed to load wishlist')
          
          const wishlistData = yield response.json()
          self.wishlist = WishlistModel.create({
            userId,
            fabricIds: wishlistData.fabricIds || [],
            lastUpdated: wishlistData.lastUpdated || createTimestamp(),
          })
        } catch (error) {
          // Initialize empty wishlist on error
          self.initializeWishlist(userId)
        }
      }),
    }
  })
  .views(self => ({
    /**
     * Get fabrics by category
     */
    getFabricsByCategory(category: FabricCategory) {
      return self.fabrics.filter((fabric: any) => fabric.category === category)
    },

    /**
     * Get available fabrics (in stock)
     */
    get availableFabrics() {
      return self.fabrics.filter((fabric: any) => fabric.inventory.availableQuantity > 0)
    },

    /**
     * Get featured fabrics
     */
    get featuredFabrics() {
      return self.fabrics.filter((fabric: any) => fabric.isFeatured)
    },

    /**
     * Get fabrics on sale
     */
    get fabricsOnSale() {
      return self.fabrics.filter((fabric: any) => fabric.pricing.discountPrice !== null)
    },

    /**
     * Get wishlist fabrics
     */
    get wishlistFabrics() {
      if (!self.wishlist) return []
      return self.wishlist.fabricIds
        .map(id => self.fabrics.findById(id))
        .filter(fabric => fabric !== undefined)
    },

    /**
     * Check if fabric is in wishlist
     */
    isInWishlist(fabricId: string) {
      return self.wishlist ? self.wishlist.hasFabric(fabricId) : false
    },

    /**
     * Get low stock fabrics
     */
    get lowStockFabrics() {
      return self.fabrics.filter((fabric: any) => 
        fabric.inventory.availableQuantity <= fabric.inventory.reorderLevel
      )
    },

    /**
     * Get out of stock fabrics
     */
    get outOfStockFabrics() {
      return self.fabrics.filter((fabric: any) => fabric.inventory.availableQuantity === 0)
    },

    /**
     * Get total inventory value
     */
    get totalInventoryValue() {
      return self.fabrics.items.reduce((total: number, fabric: any) => {
        return total + (fabric.inventory.quantity * fabric.pricing.pricePerUnit)
      }, 0)
    },

    /**
     * Get fabric by ID
     */
    getFabricById(fabricId: string) {
      return self.fabrics.findById(fabricId)
    },

    /**
     * Check if data is stale
     */
    get isStale() {
      if (!self.lastFetched) return true
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return new Date(self.lastFetched).getTime() < fiveMinutesAgo
    },

    /**
     * Get search results count
     */
    get searchResultsCount() {
      return self.fabrics.count
    },

    /**
     * Check if filters are active
     */
    get hasActiveFilters() {
      return self.search.hasActiveFilters
    },
  }))

/**
 * Type definitions for FabricStore
 */
export interface FabricStore extends Instance<typeof FabricStoreModel> {}
export interface FabricStoreSnapshot extends SnapshotOut<typeof FabricStoreModel> {}