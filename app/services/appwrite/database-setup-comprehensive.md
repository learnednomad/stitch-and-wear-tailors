# Comprehensive Appwrite Database Setup Instructions

This enhanced database schema supports both the Stitch and Wear Tailors mobile app and the sophisticated web dashboard with advanced analytics, financial reporting, and business intelligence capabilities.

## Setup Methods

### Option 1: Use Appwrite Console (Recommended for Initial Setup)

1. Login to your Appwrite Console
2. Navigate to your project
3. Go to the Database section
4. Create each collection manually using the schemas defined below

### Option 2: Use Appwrite Server SDK

Create a Node.js script with the Appwrite Server SDK:

```bash
npm install node-appwrite
node scripts/setup-appwrite-database-comprehensive.js
```

### Option 3: Use Appwrite CLI

```bash
appwrite login
appwrite init project
appwrite databases create --databaseId "stitch-and-wear-db" --name "Stitch and Wear Database"
```

## Database Schema Categories

### 1. Core User & Authentication

#### Users Collection
- **ID**: `users`
- **Purpose**: Core user management with role-based access
- **Key Attributes**:
  - email (email, required, unique)
  - role (enum: ["client", "tailor", "admin"], required)
  - status (enum: ["active", "inactive", "suspended"], default: "active")
  - businessId (string) - For multi-location support
  - preferredCommunication (enum: ["email", "sms", "phone", "app"])
  - twoFactorEnabled (boolean)
  - lastLoginAt (datetime)
  - loginCount (integer)

#### Sessions Collection
- **ID**: `sessions`
- **Purpose**: User session management and security
- **Key Attributes**:
  - userId (relationship → users)
  - token (string, unique)
  - ipAddress (ip)
  - userAgent (string)
  - expiresAt (datetime)

### 2. Business & Location Management

#### Businesses Collection
- **ID**: `businesses`
- **Purpose**: Multi-business/franchise support
- **Key Attributes**:
  - name (string, required)
  - type (enum: ["single", "franchise", "chain"])
  - registrationNumber (string)
  - taxId (string)
  - currency (string, default: "USD")
  - timezone (string, default: "UTC")
  - settings (JSON)

#### Locations Collection
- **ID**: `locations`
- **Purpose**: Physical location management
- **Key Attributes**:
  - businessId (relationship → businesses)
  - name (string)
  - address (string)
  - city, state, country (string)
  - managerId (relationship → users)
  - operatingHours (JSON)
  - isActive (boolean)

### 3. Enhanced Order Management

#### Orders Collection (Enhanced)
- **ID**: `orders`
- **Purpose**: Comprehensive order tracking with financial data
- **Key Attributes**:
  - orderNumber (string, unique)
  - userId, tailorId, locationId (relationships)
  - type (enum: ["custom", "alteration", "repair"])
  - status (enum: ["pending", "confirmed", "in_progress", "ready", "delivered", "cancelled"])
  - priority (enum: ["low", "normal", "high", "urgent"])
  - source (enum: ["in_store", "online", "phone", "referral"])
  - Financial fields: subtotal, taxAmount, discountAmount, totalAmount, depositAmount, balanceAmount, rushFee
  - orderDate, deliveryDate, actualDeliveryDate (datetime)
  - tags (array of strings)

#### Order Stages Collection
- **ID**: `order_stages`
- **Purpose**: Detailed workflow tracking
- **Key Attributes**:
  - orderId (relationship → orders)
  - stage (enum: ["received", "measured", "cutting", "sewing", "finishing", "quality_check", "completed"])
  - status (enum: ["pending", "in_progress", "completed", "skipped"])
  - startedAt, completedAt (datetime)
  - completedBy (relationship → users)
  - duration (integer - minutes)
  - qualityScore (integer, 0-100)
  - photos (array of URLs)

### 4. Financial Management

#### Invoices Collection
- **ID**: `invoices`
- **Purpose**: Professional invoice management
- **Key Attributes**:
  - invoiceNumber (string, unique)
  - orderId (relationship → orders, one-to-one)
  - status (enum: ["draft", "sent", "viewed", "paid", "partial", "overdue", "cancelled"])
  - Financial fields: subtotal, taxAmount, discountAmount, totalAmount, paidAmount, balanceAmount
  - currency (string), exchangeRate (float)
  - invoiceDate, dueDate, paidDate (datetime)
  - terms, notes (string)
  - remindersSent (integer), lastReminderAt (datetime)

#### Payments Collection
- **ID**: `payments`
- **Purpose**: Payment tracking and reconciliation
- **Key Attributes**:
  - paymentNumber (string, unique)
  - invoiceId (relationship → invoices)
  - amount (float), currency (string)
  - method (enum: ["cash", "credit_card", "debit_card", "bank_transfer", "check", "digital_wallet", "other"])
  - status (enum: ["pending", "processing", "completed", "failed", "refunded"])
  - transactionId (string)
  - processorResponse (JSON)
  - refundAmount (float)
  - paymentDate, processedAt, failedAt, refundedAt (datetime)

#### Expenses Collection
- **ID**: `expenses`
- **Purpose**: Business expense tracking
- **Key Attributes**:
  - locationId (relationship → locations)
  - category (enum: ["fabric", "labor", "equipment", "utilities", "rent", "marketing", "supplies", "other"])
  - amount (float), currency (string)
  - vendor (string)
  - isRecurring (boolean)
  - recurringFrequency (enum: ["daily", "weekly", "monthly", "quarterly", "yearly"])
  - expenseDate (datetime)
  - approvedBy (relationship → users)

### 5. Inventory Management

#### Inventory Items Collection
- **ID**: `inventory_items`
- **Purpose**: Master inventory catalog
- **Key Attributes**:
  - sku (string, unique)
  - name, description (string)
  - category (enum: ["fabric", "button", "zipper", "thread", "lining", "accessory", "other"])
  - unit (enum: ["meter", "yard", "piece", "roll", "spool", "box"])
  - unitCost, sellingPrice (float)
  - minimumStock, maximumStock, reorderPoint, reorderQuantity (float)
  - supplier, supplierSku (string)
  - leadTime (integer - days)
  - Fabric specifics: color, pattern, weight, width, composition
  - isActive (boolean)

#### Inventory Locations Collection
- **ID**: `inventory_locations`
- **Purpose**: Location-specific inventory tracking
- **Key Attributes**:
  - inventoryItemId (relationship → inventory_items)
  - locationId (relationship → locations)
  - quantity, reservedQuantity, availableQuantity (float)
  - binLocation (string)
  - lastCountDate, lastCountQuantity

#### Inventory Transactions Collection
- **ID**: `inventory_transactions`
- **Purpose**: Inventory movement tracking
- **Key Attributes**:
  - inventoryItemId, locationId (relationships)
  - type (enum: ["purchase", "sale", "adjustment", "transfer", "return", "damage", "sample"])
  - quantity (float - can be negative)
  - unitCost, totalCost (float)
  - referenceType, referenceId (for linking to orders, etc.)
  - performedBy (relationship → users)
  - transactionDate (datetime)

### 6. Customer Relationship Management

#### Client Segments Collection
- **ID**: `client_segments`
- **Purpose**: Customer segmentation for targeted marketing
- **Key Attributes**:
  - name, description (string)
  - type (enum: ["value", "behavior", "demographic", "custom"])
  - criteria (JSON rules)
  - benefits (JSON array)
  - priority (integer)
  - isActive (boolean)

#### Client Segments Users Collection
- **ID**: `client_segments_users`
- **Purpose**: Segment membership tracking
- **Key Attributes**:
  - segmentId (relationship → client_segments)
  - userId (relationship → users)
  - assignedAt, expiresAt (datetime)
  - manualOverride (boolean)

#### Loyalty Points Collection
- **ID**: `loyalty_points`
- **Purpose**: Customer loyalty program
- **Key Attributes**:
  - userId (relationship → users, unique)
  - points, lifetimePoints (integer)
  - tier (enum: ["bronze", "silver", "gold", "platinum"])
  - tierExpiryDate (datetime)

#### Loyalty Transactions Collection
- **ID**: `loyalty_transactions`
- **Purpose**: Points earning and redemption history
- **Key Attributes**:
  - userId (relationship → users)
  - type (enum: ["earned", "redeemed", "expired", "adjusted"])
  - points (integer - can be negative)
  - source (enum: ["order", "referral", "promotion", "manual", "system"])
  - balance (integer - after transaction)

### 7. Communication & Collaboration

#### Communications Collection
- **ID**: `communications`
- **Purpose**: Comprehensive communication tracking
- **Key Attributes**:
  - type (enum: ["email", "sms", "call", "in_person", "app_message", "whatsapp"])
  - direction (enum: ["inbound", "outbound"])
  - status (enum: ["pending", "sent", "delivered", "failed", "read"])
  - fromUserId, toUserId (relationships)
  - subject, content (string)
  - referenceType, referenceId (for context)
  - scheduledFor, sentAt, deliveredAt, readAt (datetime)

#### Notifications Queue Collection
- **ID**: `notifications_queue`
- **Purpose**: System notification management
- **Key Attributes**:
  - userId (relationship → users)
  - type (enum: ["order_update", "appointment_reminder", "payment_due", "promotion", "system", "message"])
  - channel (enum: ["in_app", "email", "sms", "push"])
  - priority (enum: ["low", "normal", "high", "urgent"])
  - title, message (string)
  - actionUrl (string)
  - status, scheduledFor, sentAt, deliveredAt (datetime)
  - retryCount (integer)

### 8. Business Intelligence & Analytics

#### KPI Metrics Collection
- **ID**: `kpi_metrics`
- **Purpose**: Key performance indicator tracking
- **Key Attributes**:
  - locationId (relationship → locations)
  - metricType (enum: ["revenue", "orders", "clients", "inventory", "quality", "efficiency"])
  - metricName (string)
  - value (float), unit (string)
  - period (enum: ["daily", "weekly", "monthly", "quarterly", "yearly"])
  - periodStart, periodEnd (datetime)
  - previousValue, target (float)
  - trend (enum: ["up", "down", "stable"])
  - percentageChange (float)

#### AI Insights Collection
- **ID**: `ai_insights`
- **Purpose**: Claude AI-generated business insights
- **Key Attributes**:
  - insightType (enum: ["revenue_optimization", "operational_efficiency", "client_satisfaction", "inventory_management", "growth_opportunity", "risk_alert"])
  - title, summary, analysis (string)
  - recommendations (array of strings)
  - impact (JSON)
  - confidence (float, 0-100)
  - priority (enum: ["low", "medium", "high", "critical"])
  - status (enum: ["new", "reviewed", "actioned", "dismissed"])
  - validFrom, validUntil (datetime)

### 9. Audit & Security

#### Audit Logs Collection
- **ID**: `audit_logs`
- **Purpose**: Comprehensive activity tracking
- **Key Attributes**:
  - userId (relationship → users)
  - action, resource, resourceId (string)
  - changes (JSON diff)
  - ipAddress (ip)
  - severity (enum: ["info", "warning", "error", "critical"])
  - timestamp (datetime)

#### Security Events Collection
- **ID**: `security_events`
- **Purpose**: Security monitoring and threat detection
- **Key Attributes**:
  - eventType (enum: ["login_success", "login_failure", "password_reset", "permission_change", "suspicious_activity", "data_export", "api_limit_exceeded"])
  - userId (relationship → users)
  - ipAddress (ip)
  - riskScore (integer, 0-100)
  - blocked (boolean)

### 10. Reporting & Exports

#### Scheduled Reports Collection
- **ID**: `scheduled_reports`
- **Purpose**: Automated report generation
- **Key Attributes**:
  - name, description (string)
  - reportType (enum: ["financial", "operational", "inventory", "customer", "custom"])
  - parameters (JSON configuration)
  - schedule (cron expression)
  - format (enum: ["pdf", "excel", "csv", "json"])
  - recipients (array of emails)
  - isActive (boolean)

#### Report History Collection
- **ID**: `report_history`
- **Purpose**: Generated report tracking
- **Key Attributes**:
  - scheduledReportId (relationship → scheduled_reports)
  - status (enum: ["pending", "generating", "completed", "failed"])
  - fileUrl (url)
  - fileSize (integer - bytes)
  - generationTime (integer - seconds)
  - sentTo (array of emails)
  - generatedAt, expiresAt (datetime)

## Indexes for Performance

Each collection includes optimized indexes for common query patterns:

1. **Unique Indexes**: Email, order numbers, invoice numbers, SKUs
2. **Key Indexes**: Foreign keys, status fields, date ranges
3. **Fulltext Indexes**: Searchable text fields like names and descriptions
4. **Composite Indexes**: Multi-field queries for complex filters

## Permissions Structure

1. **Public Collections**: Read-only access for certain data
2. **User Collections**: Users can manage their own data
3. **Admin Collections**: Restricted to admin role only
4. **Document Security**: Enabled for sensitive collections

## Data Relationships

The schema implements comprehensive relationships:
- **One-to-One**: Order ↔ Invoice
- **One-to-Many**: User → Orders, Location → Inventory
- **Many-to-One**: Orders → User, Payments → Invoice
- **Many-to-Many**: Users ↔ Client Segments (via junction table)

## Migration Considerations

When migrating from the basic schema:
1. Export existing data
2. Create new collections with enhanced schema
3. Transform data to match new structure
4. Import into new collections
5. Update application code to use new fields
6. Test thoroughly before switching over

## Security Best Practices

1. Enable document-level security where appropriate
2. Use field-level encryption for sensitive data
3. Implement proper access controls based on user roles
4. Regular audit log reviews
5. Monitor security events for anomalies
6. Set up automated backups
7. Use HTTPS for all API communications

## Performance Optimization

1. Create indexes for frequently queried fields
2. Use pagination for large datasets
3. Implement caching strategies
4. Archive old data periodically
5. Monitor query performance
6. Optimize relationship queries
7. Use batch operations where possible

## Next Steps

1. Review and customize the schema for your specific needs
2. Set up development environment first
3. Test with sample data
4. Implement gradual rollout
5. Monitor performance and adjust indexes
6. Set up automated backups
7. Configure monitoring and alerts