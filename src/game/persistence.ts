import { del, get, set } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

const KEY_PREFIX = 'motya-life:'

export const indexedDbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(KEY_PREFIX + name)) ?? null,
  setItem: async (name, value) => {
    await set(KEY_PREFIX + name, value)
  },
  removeItem: async (name) => {
    await del(KEY_PREFIX + name)
  },
}
