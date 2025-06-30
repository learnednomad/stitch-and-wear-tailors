/**
 * Style Model - Garment templates, complexity levels, and requirements
 */

export type StyleCategory = 'formal' | 'casual' | 'business' | 'evening' | 'traditional' | 'modern' | 'vintage'
export type StyleComplexity = 'basic' | 'intermediate' | 'advanced' | 'expert'
export type StyleGender = 'men' | 'women' | 'unisex'
export type StyleSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'all_season'

export interface StyleMeasurements {
  required: string[]
  optional: string[]
  critical: string[] // measurements that must be precise
}

export interface StyleFabricRequirements {
  recommendedTypes: string[]
  unsuitableTypes: string[]
  minimumQuantity: number
  unit: 'yards' | 'meters'
  properties: {
    stretch?: boolean
    weight?: 'lightweight' | 'medium' | 'heavyweight'
    drape?: 'soft' | 'structured'
  }
}

export interface StyleCustomization {
  id: string
  name: string
  description: string
  type: 'fit' | 'design' | 'functional'
  options: {
    value: string
    label: string
    additionalCost: number
    description?: string
  }[]
  required: boolean
  defaultValue?: string
}

export interface StyleInstructions {
  cutting: string[]
  stitching: string[]
  fitting: string[]
  finishing: string[]
  qualityChecks: string[]
  specialTechniques?: string[]
}

export interface StylePricing {
  basePrice: number
  currency: string
  laborHours: number
  difficultyMultiplier: number
  rushOrderMultiplier: number
}

export interface Style {
  id: string
  name: string
  description: string
  category: StyleCategory
  complexity: StyleComplexity
  gender: StyleGender
  season: StyleSeason
  measurements: StyleMeasurements
  fabricRequirements: StyleFabricRequirements
  customizations: StyleCustomization[]
  instructions: StyleInstructions
  pricing: StylePricing
  images: string[]
  technicalDrawings: string[]
  estimatedCompletionDays: number
  tags: string[]
  popularityScore: number
  featured: boolean
  active: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateStyleInput {
  name: string
  description: string
  category: StyleCategory
  complexity: StyleComplexity
  gender: StyleGender
  season: StyleSeason
  measurements: StyleMeasurements
  fabricRequirements: StyleFabricRequirements
  customizations?: StyleCustomization[]
  instructions: StyleInstructions
  pricing: StylePricing
  images?: string[]
  technicalDrawings?: string[]
  estimatedCompletionDays: number
  tags?: string[]
  createdBy: string
}

export interface UpdateStyleInput {
  name?: string
  description?: string
  category?: StyleCategory
  complexity?: StyleComplexity
  gender?: StyleGender
  season?: StyleSeason
  measurements?: Partial<StyleMeasurements>
  fabricRequirements?: Partial<StyleFabricRequirements>
  customizations?: StyleCustomization[]
  instructions?: Partial<StyleInstructions>
  pricing?: Partial<StylePricing>
  images?: string[]
  technicalDrawings?: string[]
  estimatedCompletionDays?: number
  tags?: string[]
  featured?: boolean
  active?: boolean
}