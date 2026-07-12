/** Shared record types mirroring the PocketBase schema. */

export interface BaseRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserType = "client" | "tailor" | "admin";

export interface User extends BaseRecord {
  email: string;
  emailVisibility?: boolean;
  verified: boolean;
  firstName: string;
  lastName: string;
  userType: UserType;
  phone: string;
  status: string;
  avatar: string;
  businessName: string;
  bio: string;
  location: string;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "measuring"
  | "cutting"
  | "sewing"
  | "finishing"
  | "ready"
  | "delivered"
  | "cancelled";

export type OrderPriority = "normal" | "express" | "urgent";
export type OrderType = "new_clothing" | "alteration" | "repair";
export type OrderPaymentStatus =
  | "pending"
  | "deposit_paid"
  | "fully_paid"
  | "refunded";

export interface Order extends BaseRecord {
  orderNumber: string;
  customer: string;
  tailor: string;
  status: OrderStatus;
  priority: OrderPriority;
  orderType: OrderType;
  measurement: string;
  style: string;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  currency: string;
  estimatedDelivery: string;
  actualDelivery: string;
  specialInstructions: string;
  internalNotes: string;
  fabricSource: string;
  paymentStatus: OrderPaymentStatus;
  cancellationReason: string;
  attachments: string[];
  acceptedAt: string;
  completedAt: string;
  expand?: {
    customer?: User;
    tailor?: User;
    style?: CatalogStyle;
    measurement?: Measurement;
  };
}

export interface OrderItem extends BaseRecord {
  order: string;
  itemType: string;
  quantity: number;
  fabric: string;
  designStyle: string;
  itemPrice: number;
  totalPrice: number;
  specifications: Record<string, unknown> | null;
  status: string;
  expand?: { fabric?: Fabric; order?: Order };
}

export interface OrderStage extends BaseRecord {
  order: string;
  status: OrderStatus;
  note: string;
  photo: string;
  changedBy: string;
  expand?: { changedBy?: User };
}

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------

export interface Measurement extends BaseRecord {
  user: string;
  name: string;
  measurementType: string;
  unit: string;
  chest: number;
  waist: number;
  hips: number;
  shoulderWidth: number;
  sleeveLength: number;
  armhole: number;
  bicep: number;
  wrist: number;
  neck: number;
  backLength: number;
  frontLength: number;
  inseam: number;
  outseam: number;
  thigh: number;
  knee: number;
  ankle: number;
  rise: number;
  customMeasurements: Record<string, number> | null;
  notes: string;
  isDefault: boolean;
  photos: string[];
  expand?: { user?: User };
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type FabricType =
  | "ankara"
  | "aso_oke"
  | "adire"
  | "lace"
  | "george"
  | "senator_material"
  | "kente"
  | "cotton"
  | "silk"
  | "wool"
  | "linen"
  | "polyester"
  | "mixed"
  | "other";

export interface Fabric extends BaseRecord {
  name: string;
  type: FabricType;
  color: string;
  pattern: string;
  pricePerMeter: number;
  availableQuantity: number;
  supplier: string;
  description: string;
  owner: string;
  images: string[];
  isActive: boolean;
  expand?: { owner?: User };
}

export type StyleCategory =
  | "agbada"
  | "senator"
  | "kaftan"
  | "dashiki"
  | "buba_sokoto"
  | "iro_buba"
  | "ankara_gown"
  | "suit"
  | "shirt"
  | "trouser"
  | "dress"
  | "other";

export interface CatalogStyle extends BaseRecord {
  name: string;
  category: StyleCategory;
  gender: string;
  description: string;
  basePrice: number;
  currency: string;
  images: string[];
  tags: string[] | null;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export interface Message extends BaseRecord {
  order: string;
  sender: string;
  recipient: string;
  messageType: string;
  content: string;
  attachment: string;
  isRead: boolean;
  readAt: string;
  expand?: { sender?: User; recipient?: User; order?: Order };
}

// ---------------------------------------------------------------------------
// Payments & invoices
// ---------------------------------------------------------------------------

export type PaymentMethod = "cash" | "bank_transfer" | "pos" | "other";
export type PaymentStatus = "pending_confirmation" | "confirmed" | "rejected";
export type PaymentType =
  | "deposit"
  | "final_payment"
  | "full_payment"
  | "refund";

export interface Payment extends BaseRecord {
  order: string;
  user: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentType: PaymentType;
  reference: string;
  notes: string;
  recordedBy: string;
  confirmedAt: string;
  receipt: string;
  expand?: { order?: Order; user?: User; recordedBy?: User };
}

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "void";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  amount: number;
}

export interface Invoice extends BaseRecord {
  order: string;
  customer: string;
  tailor: string;
  invoiceNumber: string;
  lineItems: InvoiceLineItem[] | null;
  subtotal: number;
  depositRequired: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  notes: string;
  expand?: { order?: Order; customer?: User; tailor?: User };
}

// ---------------------------------------------------------------------------
// Appointments, notifications, reviews
// ---------------------------------------------------------------------------

export type AppointmentType =
  | "fitting"
  | "consultation"
  | "measurement"
  | "pickup"
  | "delivery";

export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled";

export interface Appointment extends BaseRecord {
  customer: string;
  tailor: string;
  order: string;
  type: AppointmentType;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  location: string;
  notes: string;
  expand?: { customer?: User; tailor?: User; order?: Order };
}

export interface AppNotification extends BaseRecord {
  user: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string;
}

export interface Review extends BaseRecord {
  order: string;
  customer: string;
  tailor: string;
  rating: number;
  comment: string;
  expand?: { customer?: User; tailor?: User; order?: Order };
}
