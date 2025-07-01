#!/usr/bin/env node

const { Client, Databases, ID } = require('appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client();
client.setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT);
client.setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID);
client.setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = 'stitch-and-wear-db';

async function testDatabase() {
  console.log('🧪 Testing Appwrite Database...\n');
  
  try {
    // Test 1: Connection
    console.log('1️⃣ Testing connection...');
    await databases.get(DATABASE_ID);
    console.log('✅ Connected to database\n');

    // Test 2: Users CRUD
    console.log('2️⃣ Testing Users collection...');
    const userId = ID.unique();
    
    // Create user
    const user = await databases.createDocument(DATABASE_ID, 'users', userId, {
      email: 'test@example.com',
      role: 'client',
      status: 'active'
    });
    console.log('✅ Created user:', user.$id);

    // Read user
    const readUser = await databases.getDocument(DATABASE_ID, 'users', userId);
    console.log('✅ Read user:', readUser.email);

    // Update user
    await databases.updateDocument(DATABASE_ID, 'users', userId, {
      phoneNumber: '+1234567890'
    });
    console.log('✅ Updated user');

    // Delete user
    await databases.deleteDocument(DATABASE_ID, 'users', userId);
    console.log('✅ Deleted user\n');

    // Test 3: Orders CRUD
    console.log('3️⃣ Testing Orders collection...');
    const orderId = ID.unique();
    
    const order = await databases.createDocument(DATABASE_ID, 'orders', orderId, {
      orderNumber: 'ORD-' + Date.now(),
      userId: 'test-user-id',
      type: 'custom',
      status: 'pending',
      totalAmount: 100.0,
      orderDate: new Date().toISOString()
    });
    console.log('✅ Created order:', order.orderNumber);

    await databases.deleteDocument(DATABASE_ID, 'orders', orderId);
    console.log('✅ Deleted order\n');

    // Test 4: Businesses CRUD
    console.log('4️⃣ Testing Businesses collection...');
    const businessId = ID.unique();
    
    const business = await databases.createDocument(DATABASE_ID, 'businesses', businessId, {
      name: 'Test Tailoring Shop',
      type: 'single',
      currency: 'USD'
    });
    console.log('✅ Created business:', business.name);

    await databases.deleteDocument(DATABASE_ID, 'businesses', businessId);
    console.log('✅ Deleted business\n');

    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();