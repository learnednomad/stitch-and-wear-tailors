/**
 * Invoice Model Zod Validation Schemas
 */

import { z } from 'zod'

// Enums
export const InvoiceStatusSchema = z.enum(['draft', 'pending', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'])
export const PaymentMethodSchema = z.enum(['cash', 'card', 'bank_transfer', 'digital_wallet', 'check'])
export const PaymentStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'refunded'])

// Line item schema
export const InvoiceLineItemSchema = z.object({
  id: z.string().uuid('Invalid line item ID format'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  totalPrice: z.number().min(0, 'Total price cannot be negative'),
  taxable: z.boolean(),
  category: z.enum(['service', 'material', 'alteration', 'rush_fee', 'discount']),
})

// Discount schema
export const InvoiceDiscountSchema = z.object({
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive('Discount value must be positive'),
  description: z.string().min(1, 'Description is required'),
  code: z.string().optional(),
})

// Tax schema
export const InvoiceTaxSchema = z.object({
  name: z.string().min(1, 'Tax name is required'),
  rate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  amount: z.number().min(0, 'Tax amount cannot be negative'),
  taxId: z.string().optional(),
})

// Payment schema
export const InvoicePaymentSchema = z.object({
  id: z.string().uuid('Invalid payment ID format'),
  amount: z.number().positive('Payment amount must be positive'),
  method: PaymentMethodSchema,
  status: PaymentStatusSchema,
  transactionId: z.string().optional(),
  paidAt: z.string().datetime('Invalid date format').optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

// Totals schema
export const InvoiceTotalsSchema = z.object({
  subtotal: z.number().min(0, 'Subtotal cannot be negative'),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative'),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative'),
  total: z.number().min(0, 'Total cannot be negative'),
  amountPaid: z.number().min(0, 'Amount paid cannot be negative'),
  amountDue: z.number().min(0, 'Amount due cannot be negative'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
})

// Terms schema
export const InvoiceTermsSchema = z.object({
  paymentDue: z.string().datetime('Invalid date format'),
  paymentTerms: z.string().min(1, 'Payment terms are required'),
  lateFeesApply: z.boolean(),
  lateFeePercent: z.number().min(0).max(100, 'Late fee percent must be between 0 and 100').optional(),
  gracePeriodDays: z.number().int().min(0, 'Grace period cannot be negative').optional(),
  notes: z.string().optional(),
})

// Billing address schema
export const BillingAddressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
})

// Metadata schema
export const InvoiceMetadataSchema = z.object({
  generatedBy: z.string().uuid('Invalid user ID format'),
  paymentLink: z.string().url('Invalid payment link').optional(),
  downloadLink: z.string().url('Invalid download link').optional(),
})

// Main Invoice schema
export const InvoiceSchema = z.object({
  id: z.string().uuid('Invalid invoice ID format'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  orderId: z.string().uuid('Invalid order ID format'),
  clientId: z.string().uuid('Invalid client ID format'),
  tailorId: z.string().uuid('Invalid tailor ID format'),
  status: InvoiceStatusSchema,
  lineItems: z.array(InvoiceLineItemSchema).min(1, 'At least one line item is required'),
  discounts: z.array(InvoiceDiscountSchema),
  taxes: z.array(InvoiceTaxSchema),
  totals: InvoiceTotalsSchema,
  terms: InvoiceTermsSchema,
  payments: z.array(InvoicePaymentSchema),
  billingAddress: BillingAddressSchema,
  issuedAt: z.string().datetime('Invalid date format'),
  dueDate: z.string().datetime('Invalid date format'),
  paidAt: z.string().datetime('Invalid date format').optional(),
  sentAt: z.string().datetime('Invalid date format').optional(),
  remindersSent: z.number().int().min(0, 'Reminders sent cannot be negative'),
  lastReminderSent: z.string().datetime('Invalid date format').optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string().url('Invalid attachment URL')),
  metadata: InvoiceMetadataSchema,
  createdAt: z.string().datetime('Invalid date format'),
  updatedAt: z.string().datetime('Invalid date format'),
})

// Input schemas
export const CreateInvoiceInputSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
  clientId: z.string().uuid('Invalid client ID format'),
  tailorId: z.string().uuid('Invalid tailor ID format'),
  lineItems: z.array(InvoiceLineItemSchema.omit({ id: true, totalPrice: true })).min(1, 'At least one line item is required'),
  discounts: z.array(InvoiceDiscountSchema).optional(),
  terms: InvoiceTermsSchema.omit({ notes: true }),
  billingAddress: BillingAddressSchema,
  dueDate: z.string().datetime('Invalid date format'),
  notes: z.string().optional(),
})

export const UpdateInvoiceInputSchema = z.object({
  status: InvoiceStatusSchema.optional(),
  lineItems: z.array(InvoiceLineItemSchema).optional(),
  discounts: z.array(InvoiceDiscountSchema).optional(),
  terms: InvoiceTermsSchema.partial().optional(),
  dueDate: z.string().datetime('Invalid date format').optional(),
  notes: z.string().optional(),
})

// Template schema
export const InvoiceTemplateSchema = z.object({
  id: z.string().uuid('Invalid template ID format'),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().min(1, 'Description is required'),
  lineItems: z.array(InvoiceLineItemSchema.omit({ id: true, quantity: true, totalPrice: true })),
  terms: InvoiceTermsSchema,
  active: z.boolean(),
  createdAt: z.string().datetime('Invalid date format'),
  updatedAt: z.string().datetime('Invalid date format'),
})

// Validation functions
export const validateInvoice = (data: unknown) => InvoiceSchema.parse(data)
export const validateCreateInvoiceInput = (data: unknown) => CreateInvoiceInputSchema.parse(data)
export const validateUpdateInvoiceInput = (data: unknown) => UpdateInvoiceInputSchema.parse(data)
export const validateInvoiceTemplate = (data: unknown) => InvoiceTemplateSchema.parse(data)

// Type inference
export type InvoiceSchemaType = z.infer<typeof InvoiceSchema>
export type CreateInvoiceInputSchemaType = z.infer<typeof CreateInvoiceInputSchema>
export type UpdateInvoiceInputSchemaType = z.infer<typeof UpdateInvoiceInputSchema>
export type InvoiceTemplateSchemaType = z.infer<typeof InvoiceTemplateSchema>