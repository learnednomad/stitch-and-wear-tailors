# Comprehensive Database Schema - Setup Guide

This guide covers the setup and usage of the comprehensive database schema for Stitch and Wear Tailors, supporting both the mobile app and web dashboard with advanced analytics and business intelligence features.

## Overview

The comprehensive schema includes 25+ collections organized into functional areas:

1. **Core User & Authentication**
   - `users` - Enhanced user profiles with business association
   - `sessions` - Session management and security tracking

2. **Business & Location Management**
   - `businesses` - Multi-business/franchise support
   - `locations` - Physical location management

3. **Enhanced Order Management**
   - `orders` - Comprehensive order tracking with financial data
   - `order_stages` - Detailed workflow tracking
   - `order_items` - Individual order line items

4. **Financial Management**
   - `invoices` - Professional invoice management
   - `payments` - Payment tracking and reconciliation
   - `expenses` - Business expense tracking

5. **Inventory Management**
   - `inventory_items` - Master inventory catalog
   - `inventory_locations` - Location-specific inventory
   - `inventory_transactions` - Inventory movement tracking

6. **Customer Relationship Management**
   - `client_segments` - Customer segmentation
   - `client_segments_users` - Segment membership
   - `loyalty_points` - Loyalty program tracking
   - `loyalty_transactions` - Points history

7. **Communication & Collaboration**
   - `communications` - Comprehensive communication tracking
   - `notifications_queue` - System notification management

8. **Business Intelligence & Analytics**
   - `kpi_metrics` - Key performance indicator tracking
   - `ai_insights` - Claude AI-generated insights

9. **Audit & Security**
   - `audit_logs` - Comprehensive activity tracking
   - `security_events` - Security monitoring

10. **Reporting & Exports**
    - `scheduled_reports` - Automated report configuration
    - `report_history` - Generated report tracking

## Setup Methods

### Method 1: Automated Setup (Recommended)

#### Prerequisites
1. Node.js installed on your system
2. Appwrite Server SDK access (requires API key with proper permissions)

#### Environment Variables
Set the following environment variables:

```bash
export APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"  # Or your self-hosted URL
export APPWRITE_PROJECT_ID="your-project-id"
export APPWRITE_API_KEY="your-api-key"  # Must have database write permissions
export APPWRITE_DATABASE_ID="your-database-id"
```

#### Installation
1. Install the Appwrite Server SDK:
   ```bash
   npm install node-appwrite
   ```

2. Run the setup script:
   ```bash
   node scripts/setup-appwrite-database-comprehensive.js
   ```

The script will:
- Create all collections with proper configuration
- Add all attributes with correct types and constraints
- Create indexes for optimal query performance
- Set up proper permissions for each collection

### Method 2: Manual Setup via Appwrite Console

If you prefer manual setup or don't have API key access:

1. Login to your Appwrite Console
2. Navigate to your project
3. Go to the Database section
4. Create each collection manually using the specifications in `database-setup-comprehensive.md`

### Method 3: Using Appwrite CLI

```bash
# Install Appwrite CLI
npm install -g appwrite

# Login and initialize
appwrite login
appwrite init project

# Create database
appwrite databases create --databaseId "stitch-and-wear-db" --name "Stitch and Wear Database"

# Then manually create collections using CLI commands
```

## Key Features of the Comprehensive Schema

### 1. Multi-Location Support
- Businesses can have multiple locations
- Each location tracks its own inventory, orders, and staff
- Consolidated reporting across all locations

### 2. Advanced Financial Tracking
- Complete invoice lifecycle management
- Multiple payment methods and partial payments
- Expense tracking with approval workflow
- Multi-currency support with exchange rates

### 3. Inventory Management
- Master catalog with SKU management
- Location-specific stock levels
- Automatic reorder point calculations
- Transaction history for full traceability

### 4. Customer Relationship Management
- Customer segmentation for targeted marketing
- Loyalty program with points and tiers
- Communication history tracking
- Personalized customer experiences

### 5. Business Intelligence
- Real-time KPI tracking
- AI-powered insights using Claude
- Automated report generation
- Trend analysis and forecasting

### 6. Security & Compliance
- Comprehensive audit logging
- Security event monitoring
- Role-based access control
- Data retention policies

## Migration from Basic Schema

If you're migrating from the basic schema to the comprehensive schema:

1. **Export Existing Data**
   ```javascript
   // Use the Appwrite SDK to export existing data
   const existingOrders = await databases.listDocuments(databaseId, 'orders');
   ```

2. **Transform Data**
   - Map old fields to new schema structure
   - Add default values for new required fields
   - Handle relationship migrations

3. **Import to New Schema**
   ```javascript
   // Import transformed data to new collections
   for (const order of transformedOrders) {
     await databases.createDocument(databaseId, 'orders', 'unique()', order);
   }
   ```

4. **Update Application Code**
   - Update API service files to use new fields
   - Modify collection helpers for new schema
   - Update TypeScript types

## Usage in the Application

### 1. Update Collection IDs
In `app/services/appwrite/appwrite-client.ts`:

```typescript
export const COLLECTION_IDS = {
  // Core
  USERS: "users",
  SESSIONS: "sessions",
  
  // Business
  BUSINESSES: "businesses",
  LOCATIONS: "locations",
  
  // Orders
  ORDERS: "orders",
  ORDER_STAGES: "order_stages",
  ORDER_ITEMS: "order_items",
  
  // Financial
  INVOICES: "invoices",
  PAYMENTS: "payments",
  EXPENSES: "expenses",
  
  // Inventory
  INVENTORY_ITEMS: "inventory_items",
  INVENTORY_LOCATIONS: "inventory_locations",
  INVENTORY_TRANSACTIONS: "inventory_transactions",
  
  // CRM
  CLIENT_SEGMENTS: "client_segments",
  CLIENT_SEGMENTS_USERS: "client_segments_users",
  LOYALTY_POINTS: "loyalty_points",
  LOYALTY_TRANSACTIONS: "loyalty_transactions",
  
  // Communication
  COMMUNICATIONS: "communications",
  NOTIFICATIONS_QUEUE: "notifications_queue",
  
  // Analytics
  KPI_METRICS: "kpi_metrics",
  AI_INSIGHTS: "ai_insights",
  
  // Audit
  AUDIT_LOGS: "audit_logs",
  SECURITY_EVENTS: "security_events",
  
  // Reporting
  SCHEDULED_REPORTS: "scheduled_reports",
  REPORT_HISTORY: "report_history",
} as const;
```

### 2. Create Enhanced Collection Helpers
Create new collection helpers for the comprehensive schema:

```typescript
// app/services/appwrite/collection-helpers-comprehensive.ts
export class BusinessCollectionHelper extends CollectionHelper<Business> {
  constructor(adapter: AppwriteDatabaseAdapter) {
    super(adapter, COLLECTION_IDS.BUSINESSES, businessSchema);
  }
  
  async getBusinessWithLocations(businessId: string) {
    const business = await this.get(businessId);
    if (!business.success) return business;
    
    const locations = await this.adapter.listDocuments(
      COLLECTION_IDS.LOCATIONS,
      [Query.equal('businessId', businessId)]
    );
    
    return {
      success: true,
      data: {
        ...business.data,
        locations: locations.data?.documents || []
      }
    };
  }
}
```

### 3. Implement Business Logic
Example of using the comprehensive schema for order management:

```typescript
// app/services/business/order-workflow.ts
export class OrderWorkflowService {
  async createOrder(orderData: CreateOrderDTO) {
    // Create order with enhanced fields
    const order = await collections.orders.create({
      ...orderData,
      orderNumber: generateOrderNumber(),
      source: 'in_store',
      priority: 'normal',
      tags: [],
      orderDate: new Date().toISOString(),
    });
    
    // Create initial stage
    await collections.orderStages.create({
      orderId: order.data.$id,
      stage: 'received',
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    
    // Create invoice
    await collections.invoices.create({
      invoiceNumber: generateInvoiceNumber(),
      orderId: order.data.$id,
      status: 'draft',
      ...calculateInvoiceTotals(orderData),
    });
    
    // Track in audit log
    await collections.auditLogs.create({
      userId: currentUser.id,
      action: 'order.created',
      resource: 'orders',
      resourceId: order.data.$id,
      severity: 'info',
    });
    
    return order;
  }
}
```

## Performance Considerations

### 1. Indexes
The schema includes strategic indexes for common query patterns:
- Unique indexes for business keys (order numbers, SKUs)
- Key indexes for foreign keys and status fields
- Composite indexes for complex queries

### 2. Query Optimization
```typescript
// Efficient query with proper indexing
const activeOrders = await databases.listDocuments(
  databaseId,
  'orders',
  [
    Query.equal('locationId', locationId),
    Query.equal('status', ['pending', 'in_progress']),
    Query.orderDesc('orderDate'),
    Query.limit(50)
  ]
);
```

### 3. Data Archival
Implement periodic archival for old data:
```typescript
// Archive orders older than 2 years
const archivalDate = new Date();
archivalDate.setFullYear(archivalDate.getFullYear() - 2);

const oldOrders = await databases.listDocuments(
  databaseId,
  'orders',
  [Query.lessThan('orderDate', archivalDate.toISOString())]
);
```

## Security Best Practices

### 1. Document Security
Enable document-level security for sensitive collections:
- Financial data (invoices, payments)
- User information
- Business data

### 2. Role-Based Access
Implement proper permission checks:
```typescript
// Check user role before allowing access
if (user.role !== 'admin' && user.role !== 'manager') {
  throw new Error('Insufficient permissions');
}
```

### 3. Audit Logging
Log all significant actions:
```typescript
await auditLog.log({
  action: 'payment.processed',
  userId: user.$id,
  details: { amount, method, invoiceId },
  severity: 'info'
});
```

## Monitoring and Maintenance

### 1. Health Checks
Monitor collection health:
```typescript
async function checkDatabaseHealth() {
  const collections = Object.values(COLLECTION_IDS);
  const health = {};
  
  for (const collectionId of collections) {
    try {
      const stats = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.limit(1)]
      );
      health[collectionId] = {
        status: 'healthy',
        documentCount: stats.total
      };
    } catch (error) {
      health[collectionId] = {
        status: 'error',
        error: error.message
      };
    }
  }
  
  return health;
}
```

### 2. Backup Strategy
- Enable automatic Appwrite backups
- Export critical data periodically
- Test restore procedures regularly

### 3. Performance Monitoring
Track query performance and optimize as needed:
```typescript
const startTime = Date.now();
const result = await databases.listDocuments(databaseId, collectionId, queries);
const duration = Date.now() - startTime;

if (duration > 1000) {
  console.warn(`Slow query detected: ${duration}ms`, queries);
}
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   - The setup script includes delays to avoid rate limits
   - If you encounter rate limits, increase the delay values

2. **Permission Errors**
   - Ensure your API key has proper permissions
   - Check collection-level and document-level permissions

3. **Relationship Creation**
   - Create collections in the correct order
   - Ensure related collections exist before creating relationships

4. **Index Creation Failures**
   - Wait for attributes to be ready before creating indexes
   - Check that attribute names match exactly

### Getting Help

1. Check the Appwrite documentation: https://appwrite.io/docs
2. Review error messages in the Appwrite console
3. Enable debug logging in your application
4. Contact Appwrite support for infrastructure issues

## Next Steps

1. **Complete Setup**: Run the setup script or manually create collections
2. **Update Application**: Modify your app to use the new schema
3. **Test Thoroughly**: Test all CRUD operations with the new schema
4. **Deploy Dashboard**: Build the web dashboard using the comprehensive data
5. **Enable Analytics**: Start collecting KPIs and generating insights
6. **Monitor Performance**: Set up monitoring and alerting

Remember to always test in a development environment before deploying to production!