/**
 * Invoice Model - Billing, payments, and tax calculations
 */

export type InvoiceStatus = 
  | 'draft' 
  | 'pending' 
  | 'sent' 
  | 'paid' 
  | 'partially_paid' 
  | 'overdue' 
  | 'cancelled' 
  | 'refunded'

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'check'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  taxable: boolean
  category: 'service' | 'material' | 'alteration' | 'rush_fee' | 'discount'
}

export interface InvoiceDiscount {
  type: 'percentage' | 'fixed'
  value: number
  description: string
  code?: string
}

export interface InvoiceTax {
  name: string
  rate: number
  amount: number
  taxId?: string
}

export interface InvoicePayment {
  id: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  transactionId?: string
  paidAt?: string
  reference?: string
  notes?: string
}

export interface InvoiceTotals {
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  amountPaid: number
  amountDue: number
  currency: string
}

export interface InvoiceTerms {
  paymentDue: string // date
  paymentTerms: string // e.g., "Net 30"
  lateFeesApply: boolean
  lateFeePercent?: number
  gracePeriodDays?: number
  notes?: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  orderId: string
  clientId: string
  tailorId: string
  status: InvoiceStatus
  lineItems: InvoiceLineItem[]
  discounts: InvoiceDiscount[]
  taxes: InvoiceTax[]
  totals: InvoiceTotals
  terms: InvoiceTerms
  payments: InvoicePayment[]
  billingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  issuedAt: string
  dueDate: string
  paidAt?: string
  sentAt?: string
  remindersSent: number
  lastReminderSent?: string
  notes?: string
  attachments: string[]
  metadata: {
    generatedBy: string
    paymentLink?: string
    downloadLink?: string
  }
  createdAt: string
  updatedAt: string
}

export interface CreateInvoiceInput {
  orderId: string
  clientId: string
  tailorId: string
  lineItems: Omit<InvoiceLineItem, 'id' | 'totalPrice'>[]
  discounts?: InvoiceDiscount[]
  terms: Omit<InvoiceTerms, 'notes'>
  billingAddress: Invoice['billingAddress']
  dueDate: string
  notes?: string
}

export interface UpdateInvoiceInput {
  status?: InvoiceStatus
  lineItems?: InvoiceLineItem[]
  discounts?: InvoiceDiscount[]
  terms?: Partial<InvoiceTerms>
  dueDate?: string
  notes?: string
}

export interface InvoiceTemplate {
  id: string
  name: string
  description: string
  lineItems: Omit<InvoiceLineItem, 'id' | 'quantity' | 'totalPrice'>[]
  terms: InvoiceTerms
  active: boolean
  createdAt: string
  updatedAt: string
}