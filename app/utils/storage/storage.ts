import { MMKV } from "react-native-mmkv"

// Create the MMKV instance
const mmkvStorage = new MMKV()

// Export as 'storage' object with all methods
export const storage = {
  // Direct MMKV methods
  getString: (key: string) => mmkvStorage.getString(key),
  getBoolean: (key: string) => mmkvStorage.getBoolean(key),
  getNumber: (key: string) => mmkvStorage.getNumber(key),
  set: (key: string, value: any) => {
    if (typeof value === "boolean" || typeof value === "string" || typeof value === "number") {
      mmkvStorage.set(key, value)
    } else {
      mmkvStorage.set(key, JSON.stringify(value))
    }
  },
  delete: (key: string) => mmkvStorage.delete(key),
  clearAll: () => mmkvStorage.clearAll(),
  contains: (key: string) => mmkvStorage.contains(key),

  // Additional helper methods
  getObject: <T>(key: string): T | null => {
    const str = mmkvStorage.getString(key)
    if (!str) return null
    try {
      return JSON.parse(str) as T
    } catch {
      return null
    }
  },
  remove: (key: string) => mmkvStorage.delete(key),
}

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: string): string | null {
  try {
    return mmkvStorage.getString(key) ?? null
  } catch {
    // not sure why this would fail... even reading the RN docs I'm unclear
    return null
  }
}

/**
 * Saves a string to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function saveString(key: string, value: string): boolean {
  try {
    mmkvStorage.set(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Loads something from storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export function load<T>(key: string): T | null {
  let almostThere: string | null = null
  try {
    almostThere = loadString(key)
    return JSON.parse(almostThere ?? "") as T
  } catch {
    return (almostThere as T) ?? null
  }
}

/**
 * Saves an object to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Removes something from storage.
 *
 * @param key The key to kill.
 */
export function remove(key: string): void {
  try {
    mmkvStorage.delete(key)
  } catch {}
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  try {
    mmkvStorage.clearAll()
  } catch {}
}

/**
 * Gets a boolean value from storage.
 *
 * @param key The key to fetch.
 */
export function getBoolean(key: string): boolean | undefined {
  try {
    const value = mmkvStorage.getBoolean(key)
    return value
  } catch {
    return undefined
  }
}

/**
 * Sets a value in storage (supports any type).
 *
 * @param key The key to set.
 * @param value The value to store.
 */
export function set(key: string, value: any): boolean {
  try {
    if (typeof value === "boolean") {
      mmkvStorage.set(key, value)
    } else if (typeof value === "string") {
      mmkvStorage.set(key, value)
    } else if (typeof value === "number") {
      mmkvStorage.set(key, value)
    } else {
      mmkvStorage.set(key, JSON.stringify(value))
    }
    return true
  } catch {
    return false
  }
}

/**
 * Gets an object from storage.
 *
 * @param key The key to fetch.
 */
export function getObject<T>(key: string): T | null {
  return load<T>(key)
}
