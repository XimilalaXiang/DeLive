import type { AppSettings, CaptionStyle } from '../types'

export const STORAGE_KEYS = {
  SESSIONS: 'desktoplive_sessions',
  SETTINGS: 'desktoplive_settings',
  TAGS: 'desktoplive_tags',
  TOPICS: 'desktoplive_topics',
} as const

export const DB_NAME = 'delive-app'
export const DB_VERSION = 3
export const SESSION_STORE = 'sessions'
export const SESSION_UPDATED_AT_INDEX = 'updatedAt'
export const META_STORE = 'meta'
export const SETTINGS_STORE = 'settings'
export const TAGS_STORE = 'tags'
export const META_KEY_SESSIONS_MIGRATED = 'sessions_migrated'
export const META_KEY_SETTINGS_MIGRATED = 'settings_tags_migrated'
export const SETTINGS_SINGLETON_KEY = 'app_settings'
export const TAGS_SINGLETON_KEY = 'all_tags'

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontSize: 24,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif',
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  textShadow: true,
  maxLines: 2,
  width: 800,
  displayMode: 'source',
}

let dbPromise: Promise<IDBDatabase> | null = null

export function supportsIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

export function readJsonFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) as T : fallback
  } catch {
    return fallback
  }
}

export function writeJsonToLocalStorage(key: string, value: unknown, errorMessage: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(errorMessage, error)
  }
}

export function removeLocalStorageItem(key: string, errorMessage: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(errorMessage, error)
  }
}

export function openAppDatabase(): Promise<IDBDatabase> {
  if (!supportsIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is not supported in the current environment'))
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = () => {
        const db = request.result

        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          const sessionStore = db.createObjectStore(SESSION_STORE, { keyPath: 'id' })
          sessionStore.createIndex(SESSION_UPDATED_AT_INDEX, 'updatedAt', { unique: false })
        } else {
          const sessionStore = request.transaction?.objectStore(SESSION_STORE)
          if (sessionStore && !sessionStore.indexNames.contains(SESSION_UPDATED_AT_INDEX)) {
            sessionStore.createIndex(SESSION_UPDATED_AT_INDEX, 'updatedAt', { unique: false })
          }
        }

        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(TAGS_STORE)) {
          db.createObjectStore(TAGS_STORE, { keyPath: 'id' })
        }
      }
    })
  }

  return dbPromise
}

export function createTransaction<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  executor: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
  ) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)

    transaction.onerror = () => reject(transaction.error ?? new Error(`IndexedDB transaction failed for ${storeName}`))
    executor(store, resolve, reject)
  })
}

export async function getMetaValue<T>(key: string): Promise<T | undefined> {
  const db = await openAppDatabase()
  return createTransaction<T | undefined>(db, META_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.get(key)
    request.onerror = () => reject(request.error ?? new Error(`Failed to read meta key ${key}`))
    request.onsuccess = () => {
      const result = request.result as { key: string; value: T } | undefined
      resolve(result?.value)
    }
  })
}

export async function setMetaValue<T>(key: string, value: T): Promise<void> {
  const db = await openAppDatabase()
  await createTransaction<void>(db, META_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.put({ key, value })
    request.onerror = () => reject(request.error ?? new Error(`Failed to write meta key ${key}`))
    request.onsuccess = () => resolve()
  })
}

export function getDefaultSettings(): AppSettings {
  return {
    apiKey: '',
    languageHints: ['zh', 'en'],
    captionStyle: DEFAULT_CAPTION_STYLE,
    aiPostProcess: {
      enabled: false,
      provider: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: '',
      apiKey: '',
      promptLanguage: 'zh',
    },
  }
}
