/**
 * Appwrite Integration Layer
 *
 * Exports all Appwrite-related modules for easy import and use
 * throughout the application.
 */

// Core client
export {
  AppwriteClient,
  AppwriteConfig,
  DEFAULT_APPWRITE_CONFIG,
  getAppwriteClient,
  initializeAppwriteClient,
  resetAppwriteClient,
  COLLECTION_IDS,
  BUCKET_IDS,
  FUNCTION_IDS,
  TEAM_IDS,
} from "./appwrite-client"

// Auth adapter
export {
  AppwriteAuthAdapter,
  AppwriteSession,
  AppwriteUser,
  getAppwriteAuthAdapter,
  resetAppwriteAuthAdapter,
} from "./appwrite-auth-adapter"

// Database adapter
export {
  AppwriteDatabaseAdapter,
  DatabaseQueryParams,
  AppwriteDocument,
  DatabaseListResponse,
  getAppwriteDatabaseAdapter,
  resetAppwriteDatabaseAdapter,
} from "./appwrite-database-adapter"

// Service bridge
export {
  AppwriteServiceBridge,
  ServiceBridgeConfig,
  getAppwriteServiceBridge,
  resetAppwriteServiceBridge,
} from "./appwrite-service-bridge"

// Database schema and setup
export {
  DATABASE_SCHEMA,
  AttributeDefinition,
  IndexDefinition,
  CollectionSchema,
  AttributeType,
  validateDocument,
  getCollectionPermissions,
} from "./database-schema"

export { DatabaseSetup, generateDatabaseSetupInstructions, SETUP_NOTE } from "./database-setup"

export {
  CollectionHelper,
  CollectionHelpers,
  UserCollectionHelper,
  OrderCollectionHelper,
  FabricCollectionHelper,
  MeasurementCollectionHelper,
  AppointmentCollectionHelper,
  NotificationCollectionHelper,
  ReviewCollectionHelper,
  collections,
} from "./collection-helpers"
