# Order Management API Documentation
**Version**: 1.0.0  
**Base URL**: https://appwrite.learnednomad.com/v1  
**Database**: stitch-and-wear-db  
**Authentication**: JWT Bearer Token / Session Cookie

## 📚 Table of Contents

1. [Authentication](#authentication)
2. [Order Endpoints](#order-endpoints)
3. [Measurement Endpoints](#measurement-endpoints)
4. [Fabric Endpoints](#fabric-endpoints)
5. [Real-time Subscriptions](#real-time-subscriptions)
6. [Error Responses](#error-responses)

---

## 🔐 Authentication

All API requests require authentication via Appwrite session.

### Headers Required
```http
X-Appwrite-Project: tm-saas
X-Appwrite-Session: [session-token]
Content-Type: application/json
```

### Authentication Flow
```typescript
// Login to get session
POST /account/sessions/email
{
  "email": "user@example.com",
  "password": "password123"
}

// Response includes session token
{
  "$id": "session-id",
  "userId": "user-id",
  "expire": "2025-09-03T10:00:00.000Z"
}
```

---

## 📦 Order Endpoints

### Create Order
**POST** `/databases/stitch-and-wear-db/collections/orders/documents`

Creates a new order with Nigerian garment specifications.

#### Request Body
```json
{
  "documentId": "unique()",
  "data": {
    "orderNumber": "ORD-2025-0001",
    "userId": "user-123",
    "businessId": "business-456",
    "type": "custom",
    "status": "pending",
    "priority": "normal",
    "source": "mobile",
    "garmentType": "agbada",
    "fabric": {
      "id": "fabric-789",
      "name": "Guinea Brocade",
      "color": "Royal Blue",
      "quantity": 5.5
    },
    "measurements": {
      "chest": 42,
      "waist": 38,
      "length": 45,
      "shoulder": 18,
      "sleeve": 25,
      "neck": 16
    },
    "specifications": {
      "embroideryStyle": "elaborate",
      "neckStyle": "round",
      "matching": ["cap", "shoe"]
    },
    "pricing": {
      "basePrice": 25000,
      "fabricCost": 27500,
      "embroideryCharge": 5000,
      "priorityCharge": 0,
      "subtotal": 57500,
      "tax": 4312.50,
      "totalAmount": 61812.50
    },
    "deliveryDate": "2025-09-10T10:00:00.000Z",
    "deliveryAddress": {
      "street": "123 Victoria Island",
      "city": "Lagos",
      "state": "Lagos",
      "country": "Nigeria"
    },
    "notes": "Please add traditional patterns",
    "orderDate": "2025-09-02T10:00:00.000Z"
  }
}
```

#### Response
```json
{
  "$id": "order-unique-id",
  "$collectionId": "orders",
  "$databaseId": "stitch-and-wear-db",
  "$createdAt": "2025-09-02T10:00:00.000Z",
  "$updatedAt": "2025-09-02T10:00:00.000Z",
  "orderNumber": "ORD-2025-0001",
  "status": "pending",
  // ... all order fields
}
```

#### Status Codes
- `201`: Order created successfully
- `400`: Validation error
- `401`: Unauthorized
- `409`: Duplicate order number

---

### Get Order by ID
**GET** `/databases/stitch-and-wear-db/collections/orders/documents/{orderId}`

Retrieves a specific order by its ID.

#### Response
```json
{
  "$id": "order-id",
  "orderNumber": "ORD-2025-0001",
  "status": "in_progress",
  "garmentType": "agbada",
  // ... complete order details
}
```

---

### List Orders
**GET** `/databases/stitch-and-wear-db/collections/orders/documents`

Lists orders with filtering and pagination.

#### Query Parameters
```typescript
queries: [
  Query.equal('userId', 'user-123'),
  Query.equal('status', 'pending'),
  Query.orderDesc('$createdAt'),
  Query.limit(25),
  Query.offset(0)
]
```

#### Response
```json
{
  "total": 150,
  "documents": [
    {
      "$id": "order-1",
      "orderNumber": "ORD-2025-0001",
      "status": "pending",
      "garmentType": "agbada",
      "totalAmount": 61812.50
    },
    // ... more orders
  ]
}
```

---

### Update Order Status
**PATCH** `/databases/stitch-and-wear-db/collections/orders/documents/{orderId}`

Updates order status and tracks progress.

#### Request Body
```json
{
  "data": {
    "status": "in_progress",
    "currentStage": "cutting",
    "progressPercentage": 25,
    "updatedAt": "2025-09-02T14:00:00.000Z"
  }
}
```

#### Valid Status Transitions
```typescript
const STATUS_FLOW = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['in_progress', 'cancelled'],
  'in_progress': ['ready_for_fitting', 'cancelled'],
  'ready_for_fitting': ['alterations_needed', 'ready_for_delivery'],
  'alterations_needed': ['in_progress'],
  'ready_for_delivery': ['delivered'],
  'delivered': ['completed'],
  'completed': [],
  'cancelled': []
}
```

---

### Delete Order
**DELETE** `/databases/stitch-and-wear-db/collections/orders/documents/{orderId}`

Soft deletes an order (only if status is 'pending' or 'cancelled').

#### Response
```json
{
  "message": "Order deleted successfully"
}
```

---

## 📏 Measurement Endpoints

### Save Measurements
**POST** `/databases/stitch-and-wear-db/collections/measurements/documents`

Saves customer measurements for future orders.

#### Request Body
```json
{
  "documentId": "unique()",
  "data": {
    "userId": "user-123",
    "profileName": "My Agbada Measurements",
    "garmentType": "agbada",
    "measurements": {
      "chest": 42,
      "waist": 38,
      "length": 45,
      "shoulder": 18,
      "sleeve": 25,
      "neck": 16,
      "armhole": 20,
      "bicep": 14
    },
    "unit": "inches",
    "notes": "Measured on Sept 2, 2025",
    "isDefault": true
  }
}
```

---

### Get Measurement Profiles
**GET** `/databases/stitch-and-wear-db/collections/measurements/documents`

#### Query Parameters
```typescript
queries: [
  Query.equal('userId', 'user-123'),
  Query.equal('garmentType', 'agbada')
]
```

---

## 🧵 Fabric Endpoints

### List Available Fabrics
**GET** `/databases/stitch-and-wear-db/collections/fabrics/documents`

Returns available fabrics with Nigerian textile options.

#### Response
```json
{
  "total": 45,
  "documents": [
    {
      "$id": "fabric-1",
      "name": "Guinea Brocade",
      "type": "brocade",
      "origin": "nigeria",
      "pricePerMeter": 5000,
      "availableColors": ["Royal Blue", "Gold", "White", "Green"],
      "inStock": true,
      "quantity": 150,
      "description": "Premium quality Guinea brocade",
      "image": "https://storage.appwrite.io/fabrics/guinea-brocade.jpg"
    },
    {
      "$id": "fabric-2",
      "name": "Aso Oke",
      "type": "traditional",
      "origin": "yoruba",
      "pricePerMeter": 8000,
      "availableColors": ["Brown", "Blue", "Red"],
      "inStock": true
    },
    {
      "$id": "fabric-3",
      "name": "Ankara",
      "type": "print",
      "origin": "african",
      "pricePerMeter": 2500,
      "patterns": ["Geometric", "Floral", "Abstract"],
      "inStock": true
    }
  ]
}
```

---

### Check Fabric Availability
**GET** `/databases/stitch-and-wear-db/collections/fabric_inventory/documents/{fabricId}`

#### Response
```json
{
  "fabricId": "fabric-1",
  "availableQuantity": 150,
  "reservedQuantity": 20,
  "minOrderQuantity": 2,
  "lastRestocked": "2025-08-30T10:00:00.000Z"
}
```

---

## 🔄 Real-time Subscriptions

### Subscribe to Order Updates
```typescript
// Using Appwrite Realtime
import { client } from '@/services/appwrite'

// Subscribe to specific order
const unsubscribe = client.subscribe(
  'databases.stitch-and-wear-db.collections.orders.documents.order-id',
  (response) => {
    console.log('Order updated:', response.payload)
    // Update UI with new order status
  }
)

// Subscribe to all user orders
const unsubscribe = client.subscribe(
  [
    'databases.stitch-and-wear-db.collections.orders.documents',
    Query.equal('userId', 'user-123')
  ],
  (response) => {
    if (response.events.includes('create')) {
      console.log('New order created:', response.payload)
    }
    if (response.events.includes('update')) {
      console.log('Order updated:', response.payload)
    }
  }
)
```

### WebSocket Events
```typescript
// Event types
type OrderEvent = {
  events: [
    'databases.*.collections.*.documents.*.create',
    'databases.*.collections.*.documents.*.update',
    'databases.*.collections.*.documents.*.delete'
  ],
  payload: Order,
  timestamp: string
}

// Handle reconnection
client.subscribe(channel, callback, 
  onError: (error) => {
    console.error('Subscription error:', error)
    // Implement reconnection logic
  }
)
```

---

## 🧮 Helper Functions

### Generate Order Number
```typescript
// Service: app/services/orders/orderService.ts

export const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  
  // Get last order number
  const lastOrder = await databases.listDocuments(
    DATABASE_ID,
    'orders',
    [
      Query.orderDesc('orderNumber'),
      Query.limit(1)
    ]
  )
  
  let sequence = 1
  if (lastOrder.documents.length > 0) {
    const lastNumber = lastOrder.documents[0].orderNumber
    const lastSequence = parseInt(lastNumber.split('-').pop())
    sequence = lastSequence + 1
  }
  
  return `ORD-${year}${month}-${String(sequence).padStart(4, '0')}`
}
```

### Calculate Pricing
```typescript
export const calculateOrderPricing = (order: OrderData): Pricing => {
  const { garmentType, fabric, priority, specifications } = order
  
  // Base prices for Nigerian garments
  const basePrices = {
    agbada: 25000,
    kaftan: 18000,
    senator: 15000,
    dashiki: 12000,
    isiagu: 20000,
    babban_riga: 22000
  }
  
  const basePrice = basePrices[garmentType] || 15000
  const fabricCost = fabric.quantity * fabric.pricePerMeter
  
  // Priority charges
  const priorityCharges = {
    normal: 0,
    express: basePrice * 0.25, // 25% extra
    urgent: basePrice * 0.50   // 50% extra
  }
  
  // Special work charges
  let specialCharges = 0
  if (specifications.embroideryStyle === 'elaborate') {
    specialCharges += 5000
  }
  if (specifications.stoneWork) {
    specialCharges += 8000
  }
  
  const subtotal = basePrice + fabricCost + priorityCharges[priority] + specialCharges
  const tax = subtotal * 0.075 // 7.5% VAT
  const totalAmount = subtotal + tax
  
  return {
    basePrice,
    fabricCost,
    priorityCharge: priorityCharges[priority],
    specialCharges,
    subtotal,
    tax,
    totalAmount
  }
}
```

### Validate Measurements
```typescript
export const validateMeasurements = (
  garmentType: string, 
  measurements: Measurements
): ValidationResult => {
  const requiredMeasurements = {
    agbada: ['chest', 'length', 'shoulder', 'sleeve', 'neck'],
    kaftan: ['chest', 'length', 'hip', 'shoulder'],
    senator: ['chest', 'waist', 'length', 'trouser_length'],
    dashiki: ['chest', 'length', 'shoulder'],
    isiagu: ['chest', 'length', 'shoulder', 'sleeve'],
    babban_riga: ['chest', 'length', 'shoulder', 'sleeve', 'height']
  }
  
  const required = requiredMeasurements[garmentType] || []
  const missing = required.filter(field => !measurements[field])
  
  if (missing.length > 0) {
    return {
      valid: false,
      errors: missing.map(field => `${field} is required`)
    }
  }
  
  // Validate measurement ranges
  const errors = []
  if (measurements.chest && (measurements.chest < 30 || measurements.chest > 60)) {
    errors.push('Chest must be between 30-60 inches')
  }
  if (measurements.waist && (measurements.waist < 25 || measurements.waist > 55)) {
    errors.push('Waist must be between 25-55 inches')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

---

## ❌ Error Responses

### Standard Error Format
```json
{
  "message": "Validation failed",
  "type": "validation_error",
  "code": 400,
  "errors": [
    {
      "field": "measurements.chest",
      "message": "Chest measurement is required"
    }
  ]
}
```

### Common Error Codes
| Code | Type | Description |
|------|------|-------------|
| 400 | validation_error | Invalid request data |
| 401 | unauthorized | Missing or invalid authentication |
| 403 | forbidden | Insufficient permissions |
| 404 | not_found | Resource not found |
| 409 | conflict | Duplicate resource |
| 429 | rate_limit | Too many requests |
| 500 | server_error | Internal server error |

---

## 📊 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Create Order | 10 | 1 minute |
| List Orders | 100 | 1 minute |
| Update Order | 30 | 1 minute |
| Real-time Subscribe | 10 | 1 minute |

---

## 🔒 Security Considerations

1. **Authentication Required**: All endpoints require valid session
2. **User Isolation**: Users can only access their own orders
3. **Role-Based Access**: Tailors have additional permissions
4. **Input Validation**: All inputs are validated against schema
5. **SQL Injection Protection**: Appwrite handles parameterization
6. **Rate Limiting**: Prevents abuse and DoS attacks
7. **HTTPS Only**: All communication encrypted
8. **Audit Logging**: All order operations are logged

---

## 📝 Testing

### Postman Collection
Import the Postman collection from `/docs/postman/orders-api.json`

### cURL Examples
```bash
# Create order
curl -X POST https://appwrite.learnednomad.com/v1/databases/stitch-and-wear-db/collections/orders/documents \
  -H "X-Appwrite-Project: tm-saas" \
  -H "X-Appwrite-Session: $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "unique()",
    "data": {
      "orderNumber": "ORD-2025-0001",
      "userId": "user-123",
      "garmentType": "agbada",
      "status": "pending"
    }
  }'

# Get order
curl -X GET https://appwrite.learnednomad.com/v1/databases/stitch-and-wear-db/collections/orders/documents/order-id \
  -H "X-Appwrite-Project: tm-saas" \
  -H "X-Appwrite-Session: $SESSION_TOKEN"
```

---

## 📚 Related Documentation

- [Authentication API](./API-DOCUMENTATION-AUTH.md)
- [User Management API](./API-DOCUMENTATION-USERS.md)
- [Payment API](./API-DOCUMENTATION-PAYMENTS.md)
- [Notification API](./API-DOCUMENTATION-NOTIFICATIONS.md)

---

*Last Updated: September 2, 2025*  
*API Version: 1.0.0*