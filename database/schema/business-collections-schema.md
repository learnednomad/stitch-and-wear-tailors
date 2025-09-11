# Business Logic Collections Schema

## Core Business Collections

### 1. measurements
**Collection ID**: `measurements`
**Purpose**: Store customer body measurements for tailoring

| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| userId | string | 36 | Yes | - | Customer user ID |
| name | string | 100 | Yes | - | Measurement profile name (e.g., "My Suit Measurements") |
| measurementType | enum | - | Yes | - | Values: suit, shirt, trouser, dress, traditional |
| unit | enum | - | Yes | cm | Values: cm, inch |
| chest | float | - | No | - | Chest/Bust measurement |
| waist | float | - | No | - | Waist measurement |
| hips | float | - | No | - | Hip measurement |
| shoulderWidth | float | - | No | - | Shoulder width |
| sleeveLength | float | - | No | - | Sleeve length |
| armhole | float | - | No | - | Armhole measurement |
| bicep | float | - | No | - | Bicep circumference |
| wrist | float | - | No | - | Wrist circumference |
| neck | float | - | No | - | Neck circumference |
| backLength | float | - | No | - | Back length |
| frontLength | float | - | No | - | Front length |
| inseam | float | - | No | - | Inseam (for trousers) |
| outseam | float | - | No | - | Outseam (for trousers) |
| thigh | float | - | No | - | Thigh circumference |
| knee | float | - | No | - | Knee circumference |
| ankle | float | - | No | - | Ankle circumference |
| rise | float | - | No | - | Rise (crotch to waist) |
| customMeasurements | string | 2000 | No | - | JSON for additional measurements |
| notes | string | 500 | No | - | Special fitting notes |
| isDefault | boolean | - | Yes | false | Default measurement profile |
| createdAt | datetime | - | Yes | - | Creation timestamp |
| updatedAt | datetime | - | Yes | - | Last update timestamp |

**Indexes**:
- userId
- isDefault
- measurementType

### 2. orders
**Collection ID**: `orders`
**Purpose**: Main orders table for tailoring requests

| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| orderNumber | string | 20 | Yes | - | Unique order number (e.g., ORD-2024-0001) |
| customerId | string | 36 | Yes | - | Customer user ID |
| tailorId | string | 36 | No | - | Assigned tailor ID |
| status | enum | - | Yes | pending | Values: pending, accepted, rejected, measuring, cutting, sewing, finishing, ready, delivered, cancelled |
| priority | enum | - | Yes | normal | Values: normal, express, urgent |
| orderType | enum | - | Yes | - | Values: new_clothing, alteration, repair |
| measurementId | string | 36 | No | - | Reference to measurements |
| totalAmount | float | - | Yes | 0 | Total order amount |
| depositAmount | float | - | Yes | 0 | Deposit paid |
| balanceAmount | float | - | Yes | 0 | Remaining balance |
| currency | enum | - | Yes | NGN | Values: NGN, USD, GBP, EUR |
| estimatedDelivery | datetime | - | No | - | Estimated completion date |
| actualDelivery | datetime | - | No | - | Actual delivery date |
| specialInstructions | string | 1000 | No | - | Customer special requests |
| internalNotes | string | 1000 | No | - | Tailor's internal notes |
| fabricSource | enum | - | Yes | customer | Values: customer, tailor, shop |
| paymentStatus | enum | - | Yes | pending | Values: pending, deposit_paid, fully_paid, refunded |
| createdAt | datetime | - | Yes | - | Order creation time |
| updatedAt | datetime | - | Yes | - | Last update time |
| acceptedAt | datetime | - | No | - | When tailor accepted |
| completedAt | datetime | - | No | - | When order completed |

**Indexes**:
- orderNumber (unique)
- customerId
- tailorId
- status
- createdAt
- estimatedDelivery

### 3. order_items
**Collection ID**: `order_items`
**Purpose**: Individual items within an order

| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| orderId | string | 36 | Yes | - | Reference to orders |
| itemType | enum | - | Yes | - | Values: suit, shirt, trouser, dress, blouse, skirt, traditional, other |
| quantity | integer | - | Yes | 1 | Number of pieces |
| fabricId | string | 36 | No | - | Reference to fabrics collection |
| designStyle | string | 200 | No | - | Style description |
| itemPrice | float | - | Yes | 0 | Price per item |
| totalPrice | float | - | Yes | 0 | Total for this line item |
| specifications | string | 2000 | No | - | JSON for detailed specs |
| status | enum | - | Yes | pending | Values: pending, in_progress, completed |
| createdAt | datetime | - | Yes | - | Creation timestamp |

**Indexes**:
- orderId
- status

### 4. fabrics
**Collection ID**: `fabrics`
**Purpose**: Fabric inventory and selections

| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| name | string | 100 | Yes | - | Fabric name |
| type | enum | - | Yes | - | Values: cotton, silk, wool, linen, polyester, mixed, other |
| color | string | 50 | Yes | - | Primary color |
| pattern | string | 50 | No | - | Pattern description |
| pricePerMeter | float | - | No | 0 | Price per meter |
| availableQuantity | float | - | No | 0 | Available meters |
| supplier | string | 100 | No | - | Supplier name |
| imageUrl | string | 500 | No | - | Fabric sample image |
| description | string | 500 | No | - | Detailed description |
| ownerId | string | 36 | No | - | Tailor who owns this fabric |
| isActive | boolean | - | Yes | true | Available for selection |
| createdAt | datetime | - | Yes | - | Creation timestamp |

**Indexes**:
- type
- ownerId
- isActive

### 5. order_attachments
**Collection ID**: `order_attachments`
**Purpose**: Images and documents for orders

| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| orderId | string | 36 | Yes | - | Reference to orders |
| fileId | string | 36 | Yes | - | Appwrite Storage file ID |
| fileName | string | 255 | Yes | - | Original file name |
| fileType | enum | - | Yes | - | Values: design_reference, fabric_sample, measurement_photo, completed_photo, other |
| fileSize | integer | - | Yes | - | File size in bytes |
| mimeType | string | 50 | Yes | - | MIME type |
| uploadedBy | string | 36 | Yes | - | User who uploaded |
| description | string | 500 | No | - | File description |
| createdAt | datetime | - | Yes | - | Upload timestamp |

**Indexes**:
- orderId
- fileType
- uploadedBy

### 6. messages
**Collection ID**: `messages`
**Purpose**: Order-related communication

| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| orderId | string | 36 | Yes | - | Reference to orders |
| senderId | string | 36 | Yes | - | Sender user ID |
| recipientId | string | 36 | Yes | - | Recipient user ID |
| messageType | enum | - | Yes | text | Values: text, image, voice_note |
| content | string | 2000 | No | - | Message text content |
| attachmentId | string | 36 | No | - | Reference to attachment |
| isRead | boolean | - | Yes | false | Read status |
| readAt | datetime | - | No | - | When message was read |
| createdAt | datetime | - | Yes | - | Send timestamp |

**Indexes**:
- orderId
- senderId
- recipientId
- isRead
- createdAt

### 7. payments
**Collection ID**: `payments`
**Purpose**: Payment transactions

| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| orderId | string | 36 | Yes | - | Reference to orders |
| userId | string | 36 | Yes | - | User making payment |
| amount | float | - | Yes | - | Payment amount |
| currency | enum | - | Yes | NGN | Values: NGN, USD, GBP, EUR |
| provider | enum | - | Yes | - | Values: stripe, paystack, flutterwave, cash, bank_transfer |
| providerTransactionId | string | 100 | No | - | Provider's transaction ID |
| status | enum | - | Yes | pending | Values: pending, processing, success, failed, refunded |
| paymentType | enum | - | Yes | - | Values: deposit, final_payment, full_payment, refund |
| metadata | string | 2000 | No | - | JSON for provider-specific data |
| failureReason | string | 500 | No | - | Reason if failed |
| paidAt | datetime | - | No | - | Successful payment time |
| createdAt | datetime | - | Yes | - | Transaction creation |

**Indexes**:
- orderId
- userId
- provider
- status
- createdAt

### 8. tailor_analytics
**Collection ID**: `tailor_analytics`
**Purpose**: Analytics data for tailors

| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| tailorId | string | 36 | Yes | - | Tailor user ID |
| period | enum | - | Yes | - | Values: daily, weekly, monthly |
| periodDate | datetime | - | Yes | - | Start of period |
| totalOrders | integer | - | Yes | 0 | Orders in period |
| completedOrders | integer | - | Yes | 0 | Completed orders |
| totalRevenue | float | - | Yes | 0 | Revenue in period |
| averageOrderValue | float | - | Yes | 0 | Average order value |
| newCustomers | integer | - | Yes | 0 | New customers acquired |
| repeatCustomers | integer | - | Yes | 0 | Returning customers |
| averageCompletionTime | float | - | Yes | 0 | Avg completion (hours) |
| customerSatisfaction | float | - | No | - | Average rating (1-5) |
| createdAt | datetime | - | Yes | - | Record creation |

**Indexes**:
- tailorId
- period
- periodDate

### 9. notifications
**Collection ID**: `notifications`
**Purpose**: Push notification management

| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| userId | string | 36 | Yes | - | Recipient user ID |
| type | enum | - | Yes | - | Values: order_update, new_message, payment_received, reminder |
| title | string | 200 | Yes | - | Notification title |
| body | string | 500 | Yes | - | Notification body |
| data | string | 1000 | No | - | JSON for additional data |
| isRead | boolean | - | Yes | false | Read status |
| readAt | datetime | - | No | - | When read |
| createdAt | datetime | - | Yes | - | Creation time |

**Indexes**:
- userId
- type
- isRead
- createdAt

## Appwrite Realtime Subscriptions Setup

```javascript
// Realtime channels to subscribe to:

// For customers:
`databases.${DATABASE_ID}.collections.orders.documents.${orderId}`
`databases.${DATABASE_ID}.collections.messages.documents`
`databases.${DATABASE_ID}.collections.notifications.documents`

// For tailors:
`databases.${DATABASE_ID}.collections.orders.documents`
`databases.${DATABASE_ID}.collections.messages.documents`
`databases.${DATABASE_ID}.collections.tailor_analytics.documents`

// Global notifications:
`databases.${DATABASE_ID}.collections.notifications.documents.${userId}`
```

## Storage Buckets Configuration

```javascript
const buckets = [
  {
    id: 'profile-images',
    name: 'Profile Images',
    maximumFileSize: 5242880, // 5MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  },
  {
    id: 'measurement-photos',
    name: 'Measurement Photos',
    maximumFileSize: 10485760, // 10MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png'],
  },
  {
    id: 'fabric-samples',
    name: 'Fabric Samples',
    maximumFileSize: 10485760, // 10MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  },
  {
    id: 'order-attachments',
    name: 'Order Attachments',
    maximumFileSize: 20971520, // 20MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
  },
  {
    id: 'completed-works',
    name: 'Completed Works Gallery',
    maximumFileSize: 15728640, // 15MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  },
];
```