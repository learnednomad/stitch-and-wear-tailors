/**
 * MMKV-backed StateStorage adapter for Zustand's `persist` middleware.
 *
 * Wraps the shared `mmkvStorage` instance so persisted Zustand stores share the
 * same synchronous MMKV backend the rest of the app already uses.
 */

import type { StateStorage } from "zustand/middleware"
import { mmkvStorage } from "@/utils/storage/storage"

export const mmkvPersist: StateStorage = {
  getItem: (name) => mmkvStorage.getString(name) ?? null,
  setItem: (name, value) => {
    mmkvStorage.set(name, value)
  },
  removeItem: (name) => {
    mmkvStorage.delete(name)
  },
}
