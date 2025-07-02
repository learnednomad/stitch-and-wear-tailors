/**
 * Feedback Model - Reviews, ratings, and responses
 */

export type FeedbackType = "review" | "complaint" | "suggestion" | "compliment" | "quality_issue"
export type FeedbackStatus = "pending" | "in_review" | "responded" | "resolved" | "escalated"
export type FeedbackSource = "app" | "website" | "email" | "phone" | "in_person"

export interface FeedbackRating {
  overall: number // 1-5
  quality: number // 1-5
  timeliness: number // 1-5
  communication: number // 1-5
  value: number // 1-5
}

export interface FeedbackAspect {
  aspect: string
  rating: number
  comment?: string
}

export interface FeedbackResponse {
  id: string
  respondedBy: string
  respondedAt: string
  response: string
  internal: boolean // internal note or public response
  escalated: boolean
  escalatedTo?: string
  escalatedAt?: string
}

export interface FeedbackMetadata {
  source: FeedbackSource
  device?: string
  platform?: string
  version?: string
  ipAddress?: string
  userAgent?: string
}

export interface FeedbackAttachment {
  id: string
  type: "image" | "video" | "document"
  url: string
  filename: string
  size: number
  description?: string
}

export interface Feedback {
  id: string
  orderId?: string
  clientId: string
  tailorId: string
  type: FeedbackType
  status: FeedbackStatus
  rating: FeedbackRating
  aspects: FeedbackAspect[]
  title?: string
  comment: string
  tags: string[]
  responses: FeedbackResponse[]
  attachments: FeedbackAttachment[]
  metadata: FeedbackMetadata
  anonymous: boolean
  verified: boolean
  helpful: number // count of helpful votes
  reported: boolean
  reportReason?: string
  moderatedBy?: string
  moderatedAt?: string
  featured: boolean
  public: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateFeedbackInput {
  orderId?: string
  clientId: string
  tailorId: string
  type: FeedbackType
  rating: FeedbackRating
  aspects?: FeedbackAspect[]
  title?: string
  comment: string
  tags?: string[]
  attachments?: Omit<FeedbackAttachment, "id">[]
  metadata: FeedbackMetadata
  anonymous?: boolean
  public?: boolean
}

export interface UpdateFeedbackInput {
  status?: FeedbackStatus
  rating?: Partial<FeedbackRating>
  aspects?: FeedbackAspect[]
  title?: string
  comment?: string
  tags?: string[]
  verified?: boolean
  featured?: boolean
  public?: boolean
}

export interface FeedbackSummary {
  tailorId: string
  totalReviews: number
  averageRating: FeedbackRating
  ratingDistribution: {
    [key in 1 | 2 | 3 | 4 | 5]: number
  }
  aspectAverages: {
    [aspect: string]: number
  }
  recentTrends: {
    period: string
    averageRating: number
    totalReviews: number
  }[]
  topTags: {
    tag: string
    count: number
    sentiment: "positive" | "negative" | "neutral"
  }[]
  responseRate: number
  averageResponseTime: number // in hours
}
