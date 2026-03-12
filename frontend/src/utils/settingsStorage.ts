import type { AppSettings, Tag, Topic } from '../types'
import {
  createTransaction,
  getDefaultSettings,
  getMetaValue,
  META_KEY_SETTINGS_MIGRATED,
  openAppDatabase,
  readJsonFromLocalStorage,
  setMetaValue,
  SETTINGS_SINGLETON_KEY,
  SETTINGS_STORE,
  STORAGE_KEYS,
  supportsIndexedDb,
  TAGS_SINGLETON_KEY,
  TAGS_STORE,
  writeJsonToLocalStorage,
} from './storageShared'

async function mirrorSettingsToIdb(settings: AppSettings): Promise<void> {
  if (!supportsIndexedDb()) return

  try {
    const db = await openAppDatabase()
    await createTransaction<void>(db, SETTINGS_STORE, 'readwrite', (store, resolve, reject) => {
      const request = store.put({ id: SETTINGS_SINGLETON_KEY, data: settings })
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.warn('Failed to mirror settings to IndexedDB:', error)
  }
}

async function mirrorTagsToIdb(tags: Tag[]): Promise<void> {
  if (!supportsIndexedDb()) return

  try {
    const db = await openAppDatabase()
    await createTransaction<void>(db, TAGS_STORE, 'readwrite', (store, resolve, reject) => {
      const request = store.put({ id: TAGS_SINGLETON_KEY, data: tags })
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.warn('Failed to mirror tags to IndexedDB:', error)
  }
}

async function readSettingsFromIdb(): Promise<AppSettings | null> {
  if (!supportsIndexedDb()) return null

  try {
    const db = await openAppDatabase()
    return createTransaction<AppSettings | null>(db, SETTINGS_STORE, 'readonly', (store, resolve, reject) => {
      const request = store.get(SETTINGS_SINGLETON_KEY)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result as { id: string; data: AppSettings } | undefined
        resolve(result?.data ?? null)
      }
    })
  } catch {
    return null
  }
}

async function readTagsFromIdb(): Promise<Tag[] | null> {
  if (!supportsIndexedDb()) return null

  try {
    const db = await openAppDatabase()
    return createTransaction<Tag[] | null>(db, TAGS_STORE, 'readonly', (store, resolve, reject) => {
      const request = store.get(TAGS_SINGLETON_KEY)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result as { id: string; data: Tag[] } | undefined
        resolve(result?.data ?? null)
      }
    })
  } catch {
    return null
  }
}

async function ensureSettingsTagsMigration(): Promise<void> {
  if (!supportsIndexedDb()) return

  const migrated = await getMetaValue<boolean>(META_KEY_SETTINGS_MIGRATED)
  if (migrated) return

  try {
    const lsSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (lsSettings) {
      await mirrorSettingsToIdb(JSON.parse(lsSettings) as AppSettings)
    }
  } catch {
    // ignore parse errors
  }

  try {
    const lsTags = localStorage.getItem(STORAGE_KEYS.TAGS)
    if (lsTags) {
      await mirrorTagsToIdb(JSON.parse(lsTags) as Tag[])
    }
  } catch {
    // ignore parse errors
  }

  await setMetaValue(META_KEY_SETTINGS_MIGRATED, true)
}

export async function initStorage(): Promise<void> {
  if (!supportsIndexedDb()) return
  await ensureSettingsTagsMigration()

  const lsSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  if (!lsSettings) {
    const idbSettings = await readSettingsFromIdb()
    if (idbSettings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(idbSettings))
      console.log('[Storage] Restored settings from IndexedDB')
    }
  }

  const lsTags = localStorage.getItem(STORAGE_KEYS.TAGS)
  if (!lsTags) {
    const idbTags = await readTagsFromIdb()
    if (idbTags && idbTags.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(idbTags))
      console.log('[Storage] Restored tags from IndexedDB')
    }
  }
}

export function getTags(): Tag[] {
  return readJsonFromLocalStorage(STORAGE_KEYS.TAGS, [] as Tag[])
}

export function saveTags(tags: Tag[]): void {
  writeJsonToLocalStorage(STORAGE_KEYS.TAGS, tags, 'Failed to save tags to localStorage:')
  void mirrorTagsToIdb(tags)
}

export function getSettings(): AppSettings {
  const settings = readJsonFromLocalStorage<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)
  return settings ?? getDefaultSettings()
}

export function saveSettings(settings: AppSettings): void {
  writeJsonToLocalStorage(
    STORAGE_KEYS.SETTINGS,
    settings,
    'Failed to save settings to localStorage:',
  )
  void mirrorSettingsToIdb(settings)
}

export function getTopics(): Topic[] {
  return readJsonFromLocalStorage(STORAGE_KEYS.TOPICS, [] as Topic[])
}

export function saveTopics(topics: Topic[]): void {
  writeJsonToLocalStorage(STORAGE_KEYS.TOPICS, topics, 'Failed to save topics to localStorage:')
}
