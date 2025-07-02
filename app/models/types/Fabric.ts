/**
 * Fabric Model - Catalog items, inventory management, and pricing
 */

export type FabricCategory =
  | "cotton"
  | "silk"
  | "wool"
  | "linen"
  | "polyester"
  | "denim"
  | "velvet"
  | "leather"
  | "synthetic"
export type FabricWeight = "lightweight" | "medium" | "heavyweight"
export type FabricPattern =
  | "solid"
  | "striped"
  | "checkered"
  | "floral"
  | "geometric"
  | "abstract"
  | "paisley"
export type FabricAvailability = "in_stock" | "low_stock" | "out_of_stock" | "pre_order"

export interface FabricProperties {
  weight: FabricWeight
  pattern: FabricPattern
  stretch: boolean
  breathable: boolean
  washable: boolean
  ironingTemp?: "low" | "medium" | "high"
  dryCleanOnly: boolean
  fadeResistant: boolean
  wrinkleResistant: boolean
}

export interface FabricColors {
  primary: string
  secondary?: string
  accent?: string
  colorCode: string
  colorName: string
}

export interface FabricInventory {
  totalQuantity: number
  availableQuantity: number
  reservedQuantity: number
  unit: "yards" | "meters"
  minimumStock: number
  reorderPoint: number
}

export interface FabricPricing {
  basePrice: number
  currency: string
  pricePerUnit: number
  bulkPricing?: {
    minimumQuantity: number
    discountPercentage: number
  }[]
  seasonalDiscount?: {
    discountPercentage: number
    validFrom: string
    validTo: string
  }
}

export interface FabricSupplier {
  id: string
  name: string
  contactInfo: {
    email: string
    phone: string
    address: string
  }
  leadTime: number // in days
  minimumOrder: number
}

export interface Fabric {
  id: string
  name: string
  description: string
  category: FabricCategory
  material: string
  properties: FabricProperties
  colors: FabricColors
  inventory: FabricInventory
  pricing: FabricPricing
  supplier: FabricSupplier
  availability: FabricAvailability
  images: string[]
  careInstructions: string[]
  suitableFor: string[] // garment types
  tags: string[]
  featured: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateFabricInput {
  name: string
  description: string
  category: FabricCategory
  material: string
  properties: FabricProperties
  colors: FabricColors
  inventory: Omit<FabricInventory, "reservedQuantity">
  pricing: FabricPricing
  supplier: FabricSupplier
  images?: string[]
  careInstructions?: string[]
  suitableFor?: string[]
  tags?: string[]
}

export interface UpdateFabricInput {
  name?: string
  description?: string
  properties?: Partial<FabricProperties>
  colors?: Partial<FabricColors>
  inventory?: Partial<FabricInventory>
  pricing?: Partial<FabricPricing>
  availability?: FabricAvailability
  images?: string[]
  careInstructions?: string[]
  suitableFor?: string[]
  tags?: string[]
  featured?: boolean
  active?: boolean
}
