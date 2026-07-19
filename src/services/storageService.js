/**
 * storageService.js
 * Single entry point for ALL chrome.storage.local reads and writes.
 * No component or service should call chrome.storage directly.
 *
 * Future: add syncToBackend() calls here when authentication is ready.
 */

const DEFAULTS = {
  enabled: true,
  mode: 'ege',           // 'ege' | 'oge' | 'university'
  stats: {
    hint20: 0,
    hint50: 0,
    full: 0,
    total: 0,
  },
  history: [],           // array of HintHistoryEntry (max 50)
}

/**
 * Read a single key. Returns the default value if not yet set.
 */
export function get(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] !== undefined ? result[key] : DEFAULTS[key])
    })
  })
}

/**
 * Write a single key.
 */
export function set(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve)
  })
}

/**
 * Read all persisted values, merged with defaults.
 */
export function getAll() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      resolve({ ...DEFAULTS, ...result })
    })
  })
}

/**
 * Reset all stats and history (but preserve mode and enabled).
 */
export async function resetStats() {
  await set('stats', { ...DEFAULTS.stats })
  await set('history', [])
}
