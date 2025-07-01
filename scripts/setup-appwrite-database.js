#!/usr/bin/env node

/**
 * Appwrite Database Setup Script
 *
 * This script should be run with the Appwrite Server SDK
 * to set up the database schema for the Stitch and Wear Tailors app.
 *
 * Usage:
 * 1. Install dependencies: npm install node-appwrite dotenv
 * 2. Set environment variables in .env file
 * 3. Run: node scripts/setup-appwrite-database.js
 */

const sdk = require("node-appwrite")
require("dotenv").config()

// Initialize Appwrite SDK
const client = new sdk.Client()
const databases = new sdk.Databases(client)

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "stitch-and-wear-db"

// Import schema from the app (you'll need to convert the TS to JS or use a build step)
const DATABASE_SCHEMA = require("../app/services/appwrite/database-schema-js").DATABASE_SCHEMA

async function setupDatabase() {
  try {
    // Ensure database exists
    try {
      await databases.get(DATABASE_ID)
      console.log(`Database ${DATABASE_ID} already exists`)
    } catch (error) {
      if (error.code === 404) {
        await databases.create(DATABASE_ID, "Stitch and Wear Database")
        console.log(`Created database: ${DATABASE_ID}`)
      } else {
        throw error
      }
    }

    // Create collections
    for (const [collectionId, schema] of Object.entries(DATABASE_SCHEMA)) {
      await setupCollection(schema)
    }

    console.log("Database setup completed successfully!")
  } catch (error) {
    console.error("Database setup failed:", error)
    process.exit(1)
  }
}

async function setupCollection(schema) {
  console.log(`Setting up collection: ${schema.id}`)

  try {
    // Check if collection exists
    try {
      await databases.getCollection(DATABASE_ID, schema.id)
      console.log(`Collection ${schema.id} already exists`)
    } catch (error) {
      if (error.code === 404) {
        await databases.createCollection(
          DATABASE_ID,
          schema.id,
          schema.name,
          schema.permissions,
          schema.documentSecurity,
          schema.enabled,
        )
        console.log(`Created collection: ${schema.id}`)
      } else {
        throw error
      }
    }

    // Create attributes
    for (const attr of schema.attributes) {
      await createAttribute(schema.id, attr)
    }

    // Wait for attributes to be ready
    await waitForAttributes(schema.id)

    // Create indexes
    for (const index of schema.indexes) {
      await createIndex(schema.id, index)
    }
  } catch (error) {
    console.error(`Failed to setup collection ${schema.id}:`, error)
    throw error
  }
}

async function createAttribute(collectionId, attr) {
  try {
    // Check if attribute exists
    try {
      await databases.getAttribute(DATABASE_ID, collectionId, attr.key)
      console.log(`Attribute ${attr.key} already exists in ${collectionId}`)
      return
    } catch (error) {
      if (error.code !== 404) throw error
    }

    switch (attr.type) {
      case "string":
        await databases.createStringAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.size || 255,
          attr.required,
          attr.default,
          attr.array,
        )
        break

      case "integer":
        await databases.createIntegerAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.required,
          attr.default,
          attr.min,
          attr.max,
          attr.array,
        )
        break

      case "float":
        await databases.createFloatAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.required,
          attr.default,
          attr.min,
          attr.max,
          attr.array,
        )
        break

      case "boolean":
        await databases.createBooleanAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.required,
          attr.default,
          attr.array,
        )
        break

      case "datetime":
        await databases.createDatetimeAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.required,
          attr.default,
          attr.array,
        )
        break

      case "email":
        await databases.createEmailAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.required,
          attr.default,
          attr.array,
        )
        break

      case "url":
        await databases.createUrlAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.required,
          attr.default,
          attr.array,
        )
        break

      case "enum":
        await databases.createEnumAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.elements,
          attr.required,
          attr.default,
          attr.array,
        )
        break

      case "relationship":
        await databases.createRelationshipAttribute(
          DATABASE_ID,
          collectionId,
          attr.relatedCollection,
          attr.relationType,
          attr.twoWay,
          attr.key,
          attr.twoWayKey,
          attr.onDelete,
        )
        break
    }

    console.log(`Created attribute: ${attr.key} in ${collectionId}`)
  } catch (error) {
    console.error(`Failed to create attribute ${attr.key}:`, error)
    throw error
  }
}

async function waitForAttributes(collectionId) {
  console.log(`Waiting for attributes to be ready in ${collectionId}...`)
  let attempts = 0
  const maxAttempts = 30

  while (attempts < maxAttempts) {
    const attributes = await databases.listAttributes(DATABASE_ID, collectionId)
    const notReady = attributes.attributes.filter((attr) => attr.status !== "available")

    if (notReady.length === 0) {
      console.log(`All attributes ready in ${collectionId}`)
      return
    }

    attempts++
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error(`Timeout waiting for attributes in ${collectionId}`)
}

async function createIndex(collectionId, index) {
  try {
    // Check if index exists
    try {
      await databases.getIndex(DATABASE_ID, collectionId, index.key)
      console.log(`Index ${index.key} already exists in ${collectionId}`)
      return
    } catch (error) {
      if (error.code !== 404) throw error
    }

    await databases.createIndex(
      DATABASE_ID,
      collectionId,
      index.key,
      index.type,
      index.attributes,
      index.orders,
    )

    console.log(`Created index: ${index.key} in ${collectionId}`)
  } catch (error) {
    console.error(`Failed to create index ${index.key}:`, error)
    throw error
  }
}

// Run the setup
setupDatabase()
