# Appwrite Database Setup

This document explains how to set up the Appwrite database for the Stitch and Wear Tailors application.

## Overview

The application uses a comprehensive database schema that supports:
- User management (clients, tailors, admins)
- Order management and tracking
- Business location management
- Inventory tracking
- Customer relationship management
- Business intelligence and analytics
- Audit logging and security

## Prerequisites

1. **Appwrite Instance**: Either self-hosted or Appwrite Cloud
2. **Project Setup**: Created project in Appwrite with API key
3. **Environment Variables**: Configure the required environment variables

## Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# Client-side configuration
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id-here
EXPO_PUBLIC_APPWRITE_DATABASE_ID=stitch-and-wear-db
EXPO_PUBLIC_APPWRITE_STORAGE_ID=stitch-and-wear-storage

# Server-side API key (for setup script)
APPWRITE_API_KEY=your-api-key-here
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id-here
```

## Database Setup

### Automatic Setup (Recommended)

Run the automated setup script:

```bash
npm run setup:db
```

This script will:
1. Create the main database (`stitch-and-wear-db`)
2. Create all essential collections
3. Add attributes to each collection
4. Create indexes for optimal performance

### Manual Setup

If you prefer manual setup or need to customize:

1. **Create Database**:
   - Database ID: `stitch-and-wear-db`
   - Name: "Stitch and Wear Tailors Database"

2. **Collections Created**:
   - `users` - User accounts and profiles
   - `orders` - Order management
   - `businesses` - Business information
   - `styles_catalog` - Available garment styles
   - `notifications_queue` - Notification system

3. **Import Schema**: Use the comprehensive schema in `app/services/appwrite/database-schema-comprehensive.ts`

## Collections Overview

### Core Collections

#### Users
- **Purpose**: Store user accounts (clients, tailors, admins)
- **Key Fields**: email, role, status, profile, phoneNumber
- **Security**: Document-level security enabled
- **Indexes**: email (unique), role, status

#### Orders
- **Purpose**: Manage customer orders and their lifecycle
- **Key Fields**: orderNumber, userId, tailorId, type, status, totalAmount
- **Security**: Document-level security enabled
- **Indexes**: orderNumber (unique), userId, tailorId, status

#### Businesses
- **Purpose**: Multi-location business management
- **Key Fields**: name, type, currency, timezone
- **Security**: Collection-level security
- **Indexes**: name, type

#### Styles Catalog
- **Purpose**: Available garment styles and pricing
- **Key Fields**: code, name, category, basePrice, isActive
- **Security**: Public read access
- **Indexes**: code (unique), category, isActive

#### Notifications Queue
- **Purpose**: Notification delivery system
- **Key Fields**: userId, type, title, message, status
- **Security**: Document-level security
- **Indexes**: userId, status, type

## Database Schema Features

### Comprehensive Schema
The full schema (`database-schema-comprehensive.ts`) includes:
- 20+ collections for complete business management
- Relationship attributes for data integrity
- Business intelligence and analytics tables
- Audit logging and security events
- Scheduled reporting system

### Security Model
- Document-level security for user data
- Collection-level security for shared data
- Role-based permissions (client, tailor, admin)
- Audit logging for all operations

### Performance Optimization
- Strategic indexes on frequently queried fields
- Compound indexes for complex queries
- Full-text search on searchable content
- Optimized for mobile and web access

## Usage

### Client Integration
```typescript
import { getAppwriteClient } from './app/services/appwrite/appwrite-client'

const client = getAppwriteClient()
const databases = client.databases

// Example: Get user orders
const orders = await databases.listDocuments(
  'stitch-and-wear-db',
  'orders',
  [Query.equal('userId', userId)]
)
```

### Service Layer
The application includes a complete service layer:
- `app/services/appwrite/` - Appwrite integration
- `app/services/api/` - API service layer
- Reactive data stores with MobX State Tree

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Verify API key has correct permissions
   - Check collection permissions are properly set

2. **Attribute Creation Fails**
   - Ensure required attributes are created first
   - Wait for attributes to be "available" before creating indexes

3. **Rate Limiting**
   - Setup script includes delays to avoid rate limits
   - For manual setup, wait between operations

### Verification

Test the setup:
```bash
# Check collections exist
curl -X GET \
  'https://cloud.appwrite.io/v1/databases/stitch-and-wear-db/collections' \
  -H 'X-Appwrite-Project: YOUR_PROJECT_ID' \
  -H 'X-Appwrite-Key: YOUR_API_KEY'
```

## Next Steps

After database setup:
1. Configure authentication (users, teams, permissions)
2. Set up storage buckets for file uploads
3. Deploy cloud functions for business logic
4. Configure webhooks for real-time updates
5. Set up monitoring and analytics

## Support

For issues with database setup:
1. Check Appwrite console for error messages
2. Verify environment variables are correct
3. Review the setup script logs
4. Consult Appwrite documentation for specific errors