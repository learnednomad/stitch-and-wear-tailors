#!/usr/bin/env node

/**
 * Fix Role Enum Attribute in Users Collection
 * Recreates the role attribute with proper enum values
 */

require('dotenv').config();
const sdk = require('node-appwrite');

const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || 'stitch-and-wear-db',
};

console.log('🔧 Fixing Role Enum in Users Collection\n');

async function fixRoleEnum() {
  try {
    // Initialize admin client
    const adminClient = new sdk.Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId)
      .setKey(config.apiKey);

    const databases = new sdk.Databases(adminClient);

    console.log('📋 Current role attribute:');
    const collection = await databases.getCollection(config.databaseId, 'users');
    const roleAttr = collection.attributes.find(attr => attr.key === 'role');
    console.log(JSON.stringify(roleAttr, null, 2));

    console.log('\n🗑️  Deleting corrupted role attribute...');
    try {
      await databases.deleteAttribute(config.databaseId, 'users', 'role');
      console.log('✅ Old role attribute deleted');
    } catch (error) {
      console.log('⚠️  Could not delete attribute:', error.message);
    }

    // Wait for the attribute to be fully deleted
    console.log('\n⏳ Waiting for attribute deletion to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n➕ Creating new role enum attribute...');
    try {
      await databases.createEnumAttribute(
        config.databaseId,
        'users',
        'role',
        ['client', 'tailor', 'admin'], // Proper array of enum values
        true, // required
        null, // no default value
        false // not an array
      );
      console.log('✅ New role attribute created with proper enum values');
    } catch (error) {
      console.log('❌ Failed to create new role attribute:', error.message);
      
      if (error.message.includes('Attribute already exists')) {
        console.log('\n⏳ Attribute might still be deleting. Waiting longer...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Try again
        try {
          await databases.createEnumAttribute(
            config.databaseId,
            'users',
            'role',
            ['client', 'tailor', 'admin'],
            true,
            null,
            false
          );
          console.log('✅ New role attribute created on second attempt');
        } catch (retryError) {
          console.log('❌ Second attempt failed:', retryError.message);
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    // Wait for the new attribute to be ready
    console.log('\n⏳ Waiting for new attribute to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test the new enum
    console.log('\n🧪 Testing new role enum...');
    const testData = {
      email: 'test@example.com',
      role: 'client'
    };

    try {
      const testDoc = await databases.createDocument(
        config.databaseId,
        'users',
        sdk.ID.unique(),
        testData
      );
      console.log('✅ Test document created successfully!');
      console.log(`   Document ID: ${testDoc.$id}`);
      console.log(`   Role value: ${testDoc.role}`);

      // Clean up test document
      await databases.deleteDocument(config.databaseId, 'users', testDoc.$id);
      console.log('✅ Test document cleaned up');

    } catch (testError) {
      console.log('❌ Test failed:', testError.message);
      throw testError;
    }

    console.log('\n✅ Role enum fix completed successfully!');
    console.log('\nYou can now run the sync script to create user profiles:');
    console.log('node scripts/sync-auth-to-database.js');

  } catch (error) {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  }
}

fixRoleEnum();