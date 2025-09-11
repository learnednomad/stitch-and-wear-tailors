#!/usr/bin/env node

/**
 * Sync Authentication Users to Database Collection
 * Creates user profile documents for existing authenticated users
 */

require('dotenv').config();
const sdk = require('node-appwrite');

const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || 'stitch-and-wear-db',
};

console.log('🔄 Syncing Authentication Users to Database Collection\n');

async function syncUsersToDatabase() {
  try {
    // Initialize admin client
    const adminClient = new sdk.Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId)
      .setKey(config.apiKey);

    const users = new sdk.Users(adminClient);
    const databases = new sdk.Databases(adminClient);

    // Get all authenticated users
    console.log('📥 Fetching authenticated users...');
    const authUsers = await users.list();
    console.log(`Found ${authUsers.total} authenticated users`);

    // Get existing user profile documents
    console.log('\n📥 Fetching existing user profiles...');
    const userProfiles = await databases.listDocuments(config.databaseId, 'users');
    console.log(`Found ${userProfiles.total} user profile documents`);

    // Create map of existing profiles by auth user ID
    const existingProfiles = new Set(userProfiles.documents.map(doc => doc.$id));

    let created = 0;
    let skipped = 0;

    // Process each authenticated user
    console.log('\n🔄 Processing users...\n');
    
    for (const authUser of authUsers.users) {
      const userId = authUser.$id;
      
      if (existingProfiles.has(userId)) {
        console.log(`⏭️  ${authUser.email}: Profile already exists`);
        skipped++;
        continue;
      }

      try {
        // Parse user name
        const nameParts = authUser.name ? authUser.name.split(' ') : ['Unknown', 'User'];
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        // Determine user role based on email
        let role = 'client';
        if (authUser.email.includes('admin@')) role = 'admin';
        else if (authUser.email.includes('tailor@')) role = 'tailor';

        // Create user profile document matching the actual collection structure
        const profileData = {
          email: authUser.email,
          role: role,
          profile: JSON.stringify({
            firstName: firstName,
            lastName: lastName,
            avatar: null,
            bio: null
          }),
          phoneNumber: authUser.phone || null,
          businessId: null,
          preferredLanguage: 'en',
          twoFactorEnabled: false,
          lastLoginAt: new Date().toISOString(),
          loginCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Create the document with the same ID as the auth user
        await databases.createDocument(
          config.databaseId,
          'users',
          userId, // Use auth user ID as document ID
          profileData
        );

        console.log(`✅ ${authUser.email}: Profile created (${role})`);
        created++;

      } catch (error) {
        console.log(`❌ ${authUser.email}: Failed to create profile - ${error.message}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  Created: ${created} profiles`);
    console.log(`  Skipped: ${skipped} existing profiles`);
    console.log(`  Total users: ${authUsers.total}`);
    
    console.log('\n✅ User sync completed!');

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

syncUsersToDatabase();