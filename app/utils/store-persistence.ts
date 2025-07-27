/**
 * Store Persistence Utilities with Zod Validation
 * Implements AI collaborators' recommended snapshot validation approach
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { applySnapshot, getSnapshot, Instance } from 'mobx-state-tree';
import { AppointmentStoreEnhancedModel } from '../models/stores/AppointmentStoreEnhanced';
import { AppointmentSchema } from '../models/schemas/AppointmentSchema';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  APPOINTMENT_STORE: '@StitchAndWear:AppointmentStore',
  MEASUREMENT_STORE: '@StitchAndWear:MeasurementStore',
  ORDER_STORE: '@StitchAndWear:OrderStore',
  USER_STORE: '@StitchAndWear:UserStore',
} as const;

/**
 * Snapshot validation schemas
 */
const AppointmentStoreSnapshotSchema = z.object({
  appointments: z.object({
    items: z.array(AppointmentSchema),
    hasMore: z.boolean().optional(),
  }).optional(),
  availability: z.object({
    items: z.array(z.object({
      tailorId: z.string(),
      date: z.string(),
      availableSlots: z.array(z.object({
        startTime: z.string(),
        endTime: z.string(),
        duration: z.number(),
      })),
      bookedSlots: z.array(z.object({
        startTime: z.string(),
        endTime: z.string(),
        appointmentId: z.string(),
      })),
    })),
  }).optional(),
  selectedDate: z.string(),
  selectedTailorId: z.string().nullable(),
  isLoading: z.boolean().optional(),
  error: z.string().nullable().optional(),
  lastFetched: z.string().nullable().optional(),
  bookingForm: z.object({
    clientId: z.string().nullable(),
    tailorId: z.string().nullable(),
    type: z.enum(["consultation", "measurement", "fitting", "delivery", "alteration", "design_review"]).nullable(),
    selectedSlot: z.object({
      startTime: z.string(),
      endTime: z.string(),
      duration: z.number(),
    }).nullable(),
    notes: z.string().nullable(),
  }),
});

/**
 * Generic store persistence interface
 */
interface PersistableStore {
  validateAndApplySnapshot?: (snapshot: unknown) => { success: boolean; errors?: any[] };
}

/**
 * Store persistence manager
 */
export class StorePersistenceManager {
  /**
   * Save store snapshot to AsyncStorage with validation
   */
  static async saveStore<T extends Instance<any>>(
    key: keyof typeof STORAGE_KEYS,
    store: T,
    validationSchema?: z.ZodSchema
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get MST snapshot
      const snapshot = getSnapshot(store);
      
      // Validate snapshot if schema provided
      if (validationSchema) {
        try {
          validationSchema.parse(snapshot);
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            console.error(`Store validation failed for ${key}:`, validationError.errors);
            return { 
              success: false, 
              error: `Validation failed: ${validationError.errors[0]?.message}` 
            };
          }
        }
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS[key], JSON.stringify(snapshot));
      
      console.log(`✅ Store ${key} saved successfully`);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during save';
      console.error(`❌ Failed to save store ${key}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Load store snapshot from AsyncStorage with validation
   */
  static async loadStore<T extends Instance<any> & PersistableStore>(
    key: keyof typeof STORAGE_KEYS,
    store: T,
    validationSchema?: z.ZodSchema
  ): Promise<{ success: boolean; error?: string; hasData?: boolean }> {
    try {
      // Load from AsyncStorage
      const storedData = await AsyncStorage.getItem(STORAGE_KEYS[key]);
      
      if (!storedData) {
        console.log(`📦 No stored data found for ${key}`);
        return { success: true, hasData: false };
      }

      // Parse JSON
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(storedData);
      } catch (parseError) {
        console.error(`❌ Failed to parse stored data for ${key}:`, parseError);
        return { success: false, error: 'Invalid JSON in stored data' };
      }

      // Validate with Zod schema if provided
      if (validationSchema) {
        try {
          const validatedData = validationSchema.parse(parsedData);
          parsedData = validatedData;
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            console.error(`❌ Stored data validation failed for ${key}:`, validationError.errors);
            
            // Try to apply partial data or reset store
            return await this.handleValidationFailure(key, store, validationError);
          }
        }
      }

      // Apply snapshot to MST store
      if (store.validateAndApplySnapshot) {
        // Use store's built-in validation method
        const result = store.validateAndApplySnapshot(parsedData);
        if (!result.success) {
          console.error(`❌ Store rejected snapshot for ${key}:`, result.errors);
          return { success: false, error: 'Store validation failed' };
        }
      } else {
        // Direct MST snapshot application
        applySnapshot(store, parsedData);
      }

      console.log(`✅ Store ${key} loaded successfully`);
      return { success: true, hasData: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during load';
      console.error(`❌ Failed to load store ${key}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handle validation failures with recovery strategies
   */
  private static async handleValidationFailure<T extends Instance<any>>(
    key: keyof typeof STORAGE_KEYS,
    store: T,
    validationError: z.ZodError
  ): Promise<{ success: boolean; error?: string }> {
    console.warn(`🔄 Attempting recovery for ${key} validation failure...`);

    // Strategy 1: Clear corrupted data and start fresh
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS[key]);
      console.log(`🗑️ Cleared corrupted data for ${key}`);
      
      // Keep the store in its current/default state
      return { 
        success: true, 
        error: `Data corruption detected and cleared. Starting with fresh ${key}.`
      };
    } catch (clearError) {
      console.error(`❌ Failed to clear corrupted data for ${key}:`, clearError);
      return { 
        success: false, 
        error: 'Data corruption detected but could not clear. Manual intervention required.'
      };
    }
  }

  /**
   * Clear all stored data
   */
  static async clearAllStores(): Promise<{ success: boolean; error?: string }> {
    try {
      const clearPromises = Object.values(STORAGE_KEYS).map(key => 
        AsyncStorage.removeItem(key)
      );
      
      await Promise.all(clearPromises);
      console.log('🗑️ All stores cleared successfully');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during clear';
      console.error('❌ Failed to clear stores:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    keys: string[];
    totalSize: number;
    storesSizes: Record<string, number>;
    lastModified: Record<string, string | null>;
  }> {
    const stats = {
      keys: [] as string[],
      totalSize: 0,
      storesSizes: {} as Record<string, number>,
      lastModified: {} as Record<string, string | null>,
    };

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const storeKeys = allKeys.filter(key => 
        Object.values(STORAGE_KEYS).includes(key as any)
      );

      stats.keys = storeKeys;

      // Get size information for each store
      for (const key of storeKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const sizeInBytes = new Blob([data]).size;
            stats.storesSizes[key] = sizeInBytes;
            stats.totalSize += sizeInBytes;

            // Try to get last modified from the data
            try {
              const parsed = JSON.parse(data);
              stats.lastModified[key] = parsed.lastFetched || parsed.updatedAt || null;
            } catch {
              stats.lastModified[key] = null;
            }
          }
        } catch (error) {
          console.warn(`Could not get stats for ${key}:`, error);
          stats.storesSizes[key] = 0;
          stats.lastModified[key] = null;
        }
      }

      return stats;

    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return stats;
    }
  }
}

/**
 * Specific persistence functions for different stores
 */
export const AppointmentStorePersistence = {
  save: (store: Instance<typeof AppointmentStoreEnhancedModel>) =>
    StorePersistenceManager.saveStore('APPOINTMENT_STORE', store, AppointmentStoreSnapshotSchema),
    
  load: (store: Instance<typeof AppointmentStoreEnhancedModel>) =>
    StorePersistenceManager.loadStore('APPOINTMENT_STORE', store, AppointmentStoreSnapshotSchema),
};

/**
 * Auto-save functionality
 */
export class AutoSaveManager {
  private static timers: Map<string, NodeJS.Timeout> = new Map();
  private static readonly SAVE_DELAY = 2000; // 2 seconds debounce

  /**
   * Setup auto-save for a store
   */
  static setupAutoSave<T extends Instance<any>>(
    storeKey: keyof typeof STORAGE_KEYS,
    store: T,
    validationSchema?: z.ZodSchema
  ) {
    // Clear existing timer
    const existingTimer = this.timers.get(storeKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Setup new debounced save
    const timer = setTimeout(async () => {
      const result = await StorePersistenceManager.saveStore(storeKey, store, validationSchema);
      if (!result.success) {
        console.error(`Auto-save failed for ${storeKey}:`, result.error);
      }
      this.timers.delete(storeKey);
    }, this.SAVE_DELAY);

    this.timers.set(storeKey, timer);
  }

  /**
   * Force immediate save for all pending stores
   */
  static async flushAll(): Promise<void> {
    const pendingTimers = Array.from(this.timers.entries());
    
    // Clear all timers
    pendingTimers.forEach(([_, timer]) => clearTimeout(timer));
    this.timers.clear();

    console.log(`💾 Flushing ${pendingTimers.length} pending auto-saves...`);
  }
}

/**
 * React hook for store persistence
 */
export function useStorePersistence<T extends Instance<any> & PersistableStore>(
  storeKey: keyof typeof STORAGE_KEYS,
  store: T,
  validationSchema?: z.ZodSchema,
  autoSave: boolean = true
) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load on mount
  React.useEffect(() => {
    let isMounted = true;

    const loadStore = async () => {
      setIsLoading(true);
      setError(null);

      const result = await StorePersistenceManager.loadStore(storeKey, store, validationSchema);
      
      if (isMounted) {
        if (!result.success) {
          setError(result.error || 'Failed to load store');
        }
        setIsLoading(false);
      }
    };

    loadStore();

    return () => {
      isMounted = false;
    };
  }, [storeKey]);

  // Setup auto-save
  React.useEffect(() => {
    if (!autoSave) return;

    // Use MST onSnapshot to trigger auto-save
    const disposer = onSnapshot(store, () => {
      AutoSaveManager.setupAutoSave(storeKey, store, validationSchema);
    });

    return disposer;
  }, [storeKey, store, validationSchema, autoSave]);

  const saveManually = React.useCallback(async () => {
    setError(null);
    const result = await StorePersistenceManager.saveStore(storeKey, store, validationSchema);
    if (!result.success) {
      setError(result.error || 'Failed to save store');
    }
    return result;
  }, [storeKey, store, validationSchema]);

  return {
    isLoading,
    error,
    saveManually,
  };
}

// React import for the hook
import React from 'react';
import { onSnapshot } from 'mobx-state-tree';