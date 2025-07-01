# Appwrite Database Setup Instructions

The Appwrite client SDK (used in React Native apps) does not support creating collections, attributes, or indexes. These operations must be performed using one of the following methods:

## Option 1: Use Appwrite Console (Recommended)

1. Login to your Appwrite Console
2. Navigate to your project
3. Go to the Database section
4. Create each collection manually using the schemas defined in `database-schema.ts`

## Option 2: Use Appwrite Server SDK

Create a Node.js script with the Appwrite Server SDK to set up the database:

```bash
npm install appwrite-server
```

Then run the setup script on your server or local machine with appropriate API keys.

## Option 3: Use Appwrite CLI

```bash
appwrite login
appwrite init project
appwrite databases create --databaseId "stitch-and-wear-db" --name "Stitch and Wear Database"
```

## Collection Schemas

The following collections need to be created:

### 1. Users Collection
- ID: `users`
- Attributes:
  - email (email, required)
  - role (enum: ["client", "tailor", "admin"], required)
  - profile (object)
  - createdAt (datetime)
  - updatedAt (datetime)

### 2. Orders Collection
- ID: `orders`
- Attributes:
  - userId (relationship → users)
  - tailorId (relationship → users)
  - type (enum: ["custom", "alteration", "repair"])
  - status (enum: ["pending", "confirmed", "in_progress", "ready", "delivered", "cancelled"])
  - items (array)
  - totalAmount (float)
  - deliveryDate (datetime)
  - createdAt (datetime)
  - updatedAt (datetime)

### 3. Order Items Collection
- ID: `order_items`
- Attributes:
  - orderId (relationship → orders)
  - fabricId (relationship → fabrics)
  - quantity (integer)
  - price (float)
  - customizations (object)

### 4. Fabrics Collection
- ID: `fabrics`
- Attributes:
  - name (string, required)
  - description (string)
  - category (enum: ["cotton", "silk", "wool", "linen", "synthetic", "blend"])
  - color (string)
  - pattern (string)
  - pricePerMeter (float)
  - stockQuantity (integer)
  - imageUrl (url)
  - isAvailable (boolean)

### 5. Measurements Collection
- ID: `measurements`
- Attributes:
  - userId (relationship → users)
  - type (enum: ["shirt", "trouser", "suit", "dress", "traditional"])
  - measurements (object)
  - notes (string)
  - createdAt (datetime)
  - updatedAt (datetime)

### 6. Appointments Collection
- ID: `appointments`
- Attributes:
  - userId (relationship → users)
  - tailorId (relationship → users)
  - date (datetime)
  - time (string)
  - type (enum: ["consultation", "measurement", "fitting", "delivery"])
  - status (enum: ["scheduled", "confirmed", "completed", "cancelled"])
  - notes (string)

### 7. Notifications Collection
- ID: `notifications`
- Attributes:
  - userId (relationship → users)
  - type (enum: ["order_update", "appointment_reminder", "message", "promotion"])
  - title (string)
  - message (string)
  - data (object)
  - isRead (boolean)
  - createdAt (datetime)

### 8. Reviews Collection
- ID: `reviews`
- Attributes:
  - orderId (relationship → orders)
  - userId (relationship → users)
  - tailorId (relationship → users)
  - rating (integer, min: 1, max: 5)
  - comment (string)
  - createdAt (datetime)

### 9. Favorites Collection
- ID: `favorites`
- Attributes:
  - userId (relationship → users)
  - fabricId (relationship → fabrics)
  - createdAt (datetime)

### 10. Progress Updates Collection
- ID: `progress_updates`
- Attributes:
  - orderId (relationship → orders)
  - status (string)
  - description (string)
  - imageUrl (url)
  - createdAt (datetime)

## Indexes

Create the following indexes for better query performance:

1. Users: email (unique)
2. Orders: userId, tailorId, status
3. Measurements: userId, type
4. Appointments: userId, tailorId, date
5. Notifications: userId, isRead
6. Reviews: tailorId, rating
7. Favorites: userId
8. Progress Updates: orderId

## Permissions

Set appropriate permissions for each collection:
- Users: Read/Write for authenticated users (own records only)
- Orders: Read/Write for authenticated users (own records only)
- Other collections: Similar permission patterns based on ownership