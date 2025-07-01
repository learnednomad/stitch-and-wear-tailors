/**
 * Appwrite Database Setup Script
 * 
 * This script creates the comprehensive database schema for Stitch and Wear Tailors
 * using the Appwrite SDK directly.
 */

import { Client, Databases, Permission, Role } from "appwrite"
import { COMPREHENSIVE_DATABASE_SCHEMA, type AttributeDefinition } from "../app/services/appwrite/database-schema-comprehensive"

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || ""
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || ""
const DATABASE_ID = "stitch-and-wear-db"

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY)

const databases = new Databases(client)

/**
 * Create attributes for a collection based on schema definition
 */
async function createAttributes(collectionId: string, attributes: AttributeDefinition[]) {
  console.log(`Creating attributes for collection: ${collectionId}`)
  
  for (const attr of attributes) {
    try {
      console.log(`  Creating attribute: ${attr.key} (${attr.type})`)
      
      switch (attr.type) {
        case "string":
          await databases.createStringAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.size || 255,
            attr.required,
            attr.default,
            attr.array
          )
          break
          
        case "email":
          await databases.createEmailAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required,
            attr.default,
            attr.array
          )
          break
          
        case "url":
          await databases.createUrlAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required,
            attr.default,
            attr.array
          )
          break
          
        case "ip":
          await databases.createIpAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required,
            attr.default,
            attr.array
          )
          break
          
        case "integer":
          await databases.createIntegerAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default,
            attr.array
          )
          break
          
        case "float":
          await databases.createFloatAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default,
            attr.array
          )
          break
          
        case "boolean":
          await databases.createBooleanAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required,
            attr.default,
            attr.array
          )
          break
          
        case "datetime":
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.required,
            attr.default,
            attr.array
          )
          break
          
        case "enum":
          await databases.createEnumAttribute(
            DATABASE_ID,
            collectionId,
            attr.key,
            attr.elements || [],
            attr.required,
            attr.default,
            attr.array
          )
          break
          
        case "relationship":
          if (attr.relatedCollection && attr.relationType) {
            await databases.createRelationshipAttribute(
              DATABASE_ID,
              collectionId,
              attr.relatedCollection,
              attr.relationType,
              attr.twoWay,
              attr.key,
              attr.twoWayKey,
              attr.onDelete
            )
          }
          break
          
        default:
          console.warn(`Unknown attribute type: ${attr.type}`)
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Failed to create attribute ${attr.key}:`, error)
    }
  }
}

/**
 * Create indexes for a collection
 */
async function createIndexes(collectionId: string, indexes: any[]) {
  console.log(`Creating indexes for collection: ${collectionId}`)
  
  for (const index of indexes) {
    try {
      console.log(`  Creating index: ${index.key}`)
      
      await databases.createIndex(
        DATABASE_ID,
        collectionId,
        index.key,
        index.type,
        index.attributes,
        index.orders
      )
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Failed to create index ${index.key}:`, error)
    }
  }
}

/**
 * Setup the complete database schema
 */
async function setupDatabase() {
  console.log("Setting up Stitch and Wear Tailors database...")
  
  try {
    // Check if database exists, create if it doesn't
    try {
      await databases.get(DATABASE_ID)
      console.log("Database already exists")
    } catch {
      console.log("Creating database...")
      await databases.create(DATABASE_ID, "Stitch and Wear Tailors Database")
    }
    
    // Process collections in order (core collections first)
    const collections = Object.entries(COMPREHENSIVE_DATABASE_SCHEMA)
    
    for (const [collectionId, schema] of collections) {
      console.log(`\nProcessing collection: ${collectionId}`)
      
      try {
        // Check if collection exists
        await databases.getCollection(DATABASE_ID, collectionId)
        console.log(`Collection ${collectionId} already exists`)
      } catch {
        console.log(`Creating collection: ${collectionId}`)
        await databases.createCollection(
          DATABASE_ID,
          collectionId,
          schema.name,
          schema.permissions,
          schema.documentSecurity,
          schema.enabled
        )
        
        // Wait for collection to be ready
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Create attributes
      await createAttributes(collectionId, schema.attributes)
      
      // Wait before creating indexes
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create indexes
      await createIndexes(collectionId, schema.indexes)
      
      console.log(`Completed collection: ${collectionId}`)
    }
    
    console.log("\n✅ Database setup completed successfully!")
    
  } catch (error) {
    console.error("❌ Database setup failed:", error)
    process.exit(1)
  }
}

/**
 * Main execution
 */
if (require.main === module) {
  setupDatabase()
}

export { setupDatabase }