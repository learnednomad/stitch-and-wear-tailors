/**
 * Database Setup Utilities
 *
 * NOTE: The Appwrite client SDK (used in React Native) does not support
 * creating collections, attributes, or indexes. These operations must be
 * performed using the Appwrite Console, CLI, or Server SDK.
 *
 * See database-setup-instructions.md for manual setup instructions
 * or use scripts/setup-appwrite-database.js with the server SDK.
 */

import { DATABASE_SCHEMA, CollectionSchema } from "./database-schema"

/**
 * Result of setup operation
 */
export interface SetupResult {
  collection: string
  success: boolean
  message: string
  details?: any
}

/**
 * Database Setup Instructions Generator
 *
 * This class generates setup instructions instead of performing the setup
 * since the client SDK doesn't support these operations.
 */
export class DatabaseSetup {
  /**
   * Generate setup instructions for all collections
   */
  generateSetupInstructions(): string {
    const instructions: string[] = [
      "# Appwrite Database Setup Instructions",
      "",
      "## Collections to Create:",
      "",
    ]

    for (const [collectionId, schema] of Object.entries(DATABASE_SCHEMA)) {
      instructions.push(`### ${schema.name} (ID: ${collectionId})`)
      instructions.push("")

      // Attributes
      instructions.push("**Attributes:**")
      schema.attributes.forEach((attr) => {
        let attrDesc = `- ${attr.key} (${attr.type}`
        if (attr.size) attrDesc += `, size: ${attr.size}`
        if (attr.required) attrDesc += ", required"
        if (attr.array) attrDesc += ", array"
        if (attr.default !== undefined) attrDesc += `, default: ${attr.default}`
        if (attr.elements) attrDesc += `, options: [${attr.elements.join(", ")}]`
        attrDesc += ")"
        instructions.push(attrDesc)
      })
      instructions.push("")

      // Indexes
      if (schema.indexes.length > 0) {
        instructions.push("**Indexes:**")
        schema.indexes.forEach((index) => {
          instructions.push(`- ${index.key} (${index.type}) on [${index.attributes.join(", ")}]`)
        })
        instructions.push("")
      }

      // Permissions
      instructions.push("**Permissions:**")
      schema.permissions.forEach((perm) => {
        instructions.push(`- ${perm}`)
      })
      instructions.push("")
    }

    return instructions.join("\n")
  }

  /**
   * Validate that all required environment variables are set
   */
  validateEnvironment(): { valid: boolean; missing: string[] } {
    const required = ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_DATABASE_ID"]

    const missing = required.filter((key) => !process.env[key])

    return {
      valid: missing.length === 0,
      missing,
    }
  }

  /**
   * Get collection IDs that should exist
   */
  getRequiredCollections(): string[] {
    return Object.keys(DATABASE_SCHEMA)
  }

  /**
   * Get schema for a specific collection
   */
  getCollectionSchema(collectionId: string): CollectionSchema | undefined {
    return DATABASE_SCHEMA[collectionId]
  }

  /**
   * Export schema as JSON for external tools
   */
  exportSchemaAsJSON(): string {
    return JSON.stringify(DATABASE_SCHEMA, null, 2)
  }
}

/**
 * Create database setup instructions
 */
export function generateDatabaseSetupInstructions(): string {
  const setup = new DatabaseSetup()
  return setup.generateSetupInstructions()
}

/**
 * Note about database setup
 */
export const SETUP_NOTE = `
The Appwrite client SDK does not support database schema operations.
To set up your database:

1. Use the Appwrite Console to manually create collections
2. Run scripts/setup-appwrite-database.js with the server SDK
3. Use the Appwrite CLI

See app/services/appwrite/database-setup-instructions.md for details.
`
