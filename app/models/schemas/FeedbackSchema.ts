/**
 * Feedback Model Zod Validation Schemas
 */

import { z } from "zod"

// Enums
export const FeedbackTypeSchema = z.enum([
  "review",
  "complaint",
  "suggestion",
  "compliment",
  "quality_issue",
])
export const FeedbackStatusSchema = z.enum([
  "pending",
  "in_review",
  "responded",
  "resolved",
  "escalated",
])
export const FeedbackSourceSchema = z.enum(["app", "website", "email", "phone", "in_person"])

// Rating schema
export const FeedbackRatingSchema = z.object({
  overall: z.number().int().min(1).max(5, "Overall rating must be between 1 and 5"),
  quality: z.number().int().min(1).max(5, "Quality rating must be between 1 and 5"),
  timeliness: z.number().int().min(1).max(5, "Timeliness rating must be between 1 and 5"),
  communication: z.number().int().min(1).max(5, "Communication rating must be between 1 and 5"),
  value: z.number().int().min(1).max(5, "Value rating must be between 1 and 5"),
})

// Aspect schema
export const FeedbackAspectSchema = z.object({
  aspect: z.string().min(1, "Aspect is required"),
  rating: z.number().int().min(1).max(5, "Aspect rating must be between 1 and 5"),
  comment: z.string().optional(),
})

// Response schema
export const FeedbackResponseSchema = z.object({
  id: z.string().uuid("Invalid response ID format"),
  respondedBy: z.string().uuid("Invalid user ID format"),
  respondedAt: z.string().datetime("Invalid date format"),
  response: z.string().min(1, "Response is required"),
  internal: z.boolean(),
  escalated: z.boolean(),
  escalatedTo: z.string().uuid("Invalid user ID format").optional(),
  escalatedAt: z.string().datetime("Invalid date format").optional(),
})

// Metadata schema
export const FeedbackMetadataSchema = z.object({
  source: FeedbackSourceSchema,
  device: z.string().optional(),
  platform: z.string().optional(),
  version: z.string().optional(),
  ipAddress: z.string().ip("Invalid IP address").optional(),
  userAgent: z.string().optional(),
})

// Attachment schema
export const FeedbackAttachmentSchema = z.object({
  id: z.string().uuid("Invalid attachment ID format"),
  type: z.enum(["image", "video", "document"]),
  url: z.string().url("Invalid attachment URL"),
  filename: z.string().min(1, "Filename is required"),
  size: z.number().int().positive("File size must be positive"),
  description: z.string().optional(),
})

// Main Feedback schema
export const FeedbackSchema = z.object({
  id: z.string().uuid("Invalid feedback ID format"),
  orderId: z.string().uuid("Invalid order ID format").optional(),
  clientId: z.string().uuid("Invalid client ID format"),
  tailorId: z.string().uuid("Invalid tailor ID format"),
  type: FeedbackTypeSchema,
  status: FeedbackStatusSchema,
  rating: FeedbackRatingSchema,
  aspects: z.array(FeedbackAspectSchema),
  title: z.string().max(100, "Title too long").optional(),
  comment: z.string().min(1, "Comment is required").max(1000, "Comment too long"),
  tags: z.array(z.string()),
  responses: z.array(FeedbackResponseSchema),
  attachments: z.array(FeedbackAttachmentSchema),
  metadata: FeedbackMetadataSchema,
  anonymous: z.boolean(),
  verified: z.boolean(),
  helpful: z.number().int().min(0, "Helpful count cannot be negative"),
  reported: z.boolean(),
  reportReason: z.string().optional(),
  moderatedBy: z.string().uuid("Invalid user ID format").optional(),
  moderatedAt: z.string().datetime("Invalid date format").optional(),
  featured: z.boolean(),
  public: z.boolean(),
  createdAt: z.string().datetime("Invalid date format"),
  updatedAt: z.string().datetime("Invalid date format"),
})

// Input schemas
export const CreateFeedbackInputSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format").optional(),
  clientId: z.string().uuid("Invalid client ID format"),
  tailorId: z.string().uuid("Invalid tailor ID format"),
  type: FeedbackTypeSchema,
  rating: FeedbackRatingSchema,
  aspects: z.array(FeedbackAspectSchema).optional(),
  title: z.string().max(100, "Title too long").optional(),
  comment: z.string().min(1, "Comment is required").max(1000, "Comment too long"),
  tags: z.array(z.string()).optional(),
  attachments: z.array(FeedbackAttachmentSchema.omit({ id: true })).optional(),
  metadata: FeedbackMetadataSchema,
  anonymous: z.boolean().optional(),
  public: z.boolean().optional(),
})

export const UpdateFeedbackInputSchema = z.object({
  status: FeedbackStatusSchema.optional(),
  rating: FeedbackRatingSchema.partial().optional(),
  aspects: z.array(FeedbackAspectSchema).optional(),
  title: z.string().max(100, "Title too long").optional(),
  comment: z.string().min(1, "Comment is required").max(1000, "Comment too long").optional(),
  tags: z.array(z.string()).optional(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
  public: z.boolean().optional(),
})

// Summary schema
export const FeedbackSummarySchema = z.object({
  tailorId: z.string().uuid("Invalid tailor ID format"),
  totalReviews: z.number().int().min(0, "Total reviews cannot be negative"),
  averageRating: FeedbackRatingSchema,
  ratingDistribution: z.object({
    1: z.number().int().min(0),
    2: z.number().int().min(0),
    3: z.number().int().min(0),
    4: z.number().int().min(0),
    5: z.number().int().min(0),
  }),
  aspectAverages: z.record(z.string(), z.number().min(1).max(5)),
  recentTrends: z.array(
    z.object({
      period: z.string().min(1, "Period is required"),
      averageRating: z.number().min(1).max(5),
      totalReviews: z.number().int().min(0),
    }),
  ),
  topTags: z.array(
    z.object({
      tag: z.string().min(1, "Tag is required"),
      count: z.number().int().positive("Count must be positive"),
      sentiment: z.enum(["positive", "negative", "neutral"]),
    }),
  ),
  responseRate: z.number().min(0).max(100, "Response rate must be between 0 and 100"),
  averageResponseTime: z.number().min(0, "Response time cannot be negative"),
})

// Validation functions
export const validateFeedback = (data: unknown) => FeedbackSchema.parse(data)
export const validateCreateFeedbackInput = (data: unknown) => CreateFeedbackInputSchema.parse(data)
export const validateUpdateFeedbackInput = (data: unknown) => UpdateFeedbackInputSchema.parse(data)
export const validateFeedbackSummary = (data: unknown) => FeedbackSummarySchema.parse(data)

// Type inference
export type FeedbackSchemaType = z.infer<typeof FeedbackSchema>
export type CreateFeedbackInputSchemaType = z.infer<typeof CreateFeedbackInputSchema>
export type UpdateFeedbackInputSchemaType = z.infer<typeof UpdateFeedbackInputSchema>
export type FeedbackSummarySchemaType = z.infer<typeof FeedbackSummarySchema>
