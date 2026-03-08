import type { TranscriptSession, AppSettings, Tag, CaptionStyle } from '../types'

const STORAGE_KEYS = {
  SESSIONS: 'desktoplive_sessions',
  SETTINGS: 'desktoplive_settings',
  TAGS: 'desktoplive_tags',
} as const

const DB_NAME = 'delive-app'
const DB_VERSION = 2
const SESSION_STORE = 'sessions'
const META_STORE = 'meta'
const SETTINGS_STORE = 'settings'
const TAGS_STORE = 'tags'
const META_KEY_SESSIONS_MIGRATED = 'sessions_migrated'
const META_KEY_SETTINGS_MIGRATED = 'settings_tags_migrated'
const SETTINGS_SINGLETON_KEY = 'app_settings'
const TAGS_SINGLETON_KEY = 'all_tags'

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontSize: 24,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif',
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  textShadow: true,
  maxLines: 2,
  width: 800,
}

// ==================== 会话相关 ====================

function getLegacySessionsFromLocalStorage(): TranscriptSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS)
    return data ? JSON.parse(data) : []
  } catch {
    console.error('Failed to parse sessions from localStorage')
    return []
  }
}

function saveLegacySessionsToLocalStorage(sessions: TranscriptSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions))
  } catch (error) {
    console.error('Failed to save sessions to localStorage:', error)
  }
}

function clearLegacySessionsFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS)
  } catch (error) {
    console.error('Failed to clear sessions from localStorage:', error)
  }
}

function supportsIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

let dbPromise: Promise<IDBDatabase> | null = null

function openAppDatabase(): Promise<IDBDatabase> {
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
          db.createObjectStore(SESSION_STORE, { keyPath: 'id' })
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

function createTransaction<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)

    transaction.onerror = () => reject(transaction.error ?? new Error(`IndexedDB transaction failed for ${storeName}`))
    executor(store, resolve, reject)
  })
}

async function getMetaValue<T>(key: string): Promise<T | undefined> {
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

async function setMetaValue<T>(key: string, value: T): Promise<void> {
  const db = await openAppDatabase()
  await createTransaction<void>(db, META_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.put({ key, value })
    request.onerror = () => reject(request.error ?? new Error(`Failed to write meta key ${key}`))
    request.onsuccess = () => resolve()
  })
}

function sortSessions(sessions: TranscriptSession[]): TranscriptSession[] {
  return [...sessions].sort((a, b) => {
    const left = Math.max(a.createdAt || 0, a.updatedAt || 0)
    const right = Math.max(b.createdAt || 0, b.updatedAt || 0)
    return right - left
  })
}

async function readSessionsFromIndexedDb(): Promise<TranscriptSession[]> {
  const db = await openAppDatabase()
  const sessions = await createTransaction<TranscriptSession[]>(db, SESSION_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.getAll()
    request.onerror = () => reject(request.error ?? new Error('Failed to read sessions from IndexedDB'))
    request.onsuccess = () => resolve((request.result as TranscriptSession[]) || [])
  })

  return sortSessions(sessions)
}

async function replaceSessionsInIndexedDb(sessions: TranscriptSession[]): Promise<void> {
  const db = await openAppDatabase()
  const sortedSessions = sortSessions(sessions)

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE, 'readwrite')
    const store = transaction.objectStore(SESSION_STORE)
    const clearRequest = store.clear()

    clearRequest.onerror = () => reject(clearRequest.error ?? new Error('Failed to clear IndexedDB sessions'))
    clearRequest.onsuccess = () => {
      for (const session of sortedSessions) {
        store.put(session)
      }
    }

    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to replace IndexedDB sessions'))
    transaction.oncomplete = () => resolve()
  })
}

async function ensureSessionMigration(): Promise<void> {
  if (!supportsIndexedDb()) {
    return
  }

  const migrated = await getMetaValue<boolean>(META_KEY_SESSIONS_MIGRATED)
  if (migrated) {
    return
  }

  const legacySessions = getLegacySessionsFromLocalStorage()
  if (legacySessions.length > 0) {
    await replaceSessionsInIndexedDb(legacySessions)
    clearLegacySessionsFromLocalStorage()
  }

  await setMetaValue(META_KEY_SESSIONS_MIGRATED, true)
}

// 获取所有转录会话
export async function getSessions(): Promise<TranscriptSession[]> {
  if (!supportsIndexedDb()) {
    return getLegacySessionsFromLocalStorage()
  }

  try {
    await ensureSessionMigration()
    return await readSessionsFromIndexedDb()
  } catch (error) {
    console.error('Failed to load sessions from IndexedDB, falling back to localStorage:', error)
    return getLegacySessionsFromLocalStorage()
  }
}

// 保存所有转录会话
export async function saveSessions(sessions: TranscriptSession[]): Promise<void> {
  const sortedSessions = sortSessions(sessions)

  if (!supportsIndexedDb()) {
    saveLegacySessionsToLocalStorage(sortedSessions)
    return
  }

  try {
    await ensureSessionMigration()
    await replaceSessionsInIndexedDb(sortedSessions)
  } catch (error) {
    console.error('Failed to save sessions to IndexedDB, falling back to localStorage:', error)
    saveLegacySessionsToLocalStorage(sortedSessions)
  }
}

// 添加新会话
export async function addSession(session: TranscriptSession): Promise<void> {
  const sessions = await getSessions()
  sessions.unshift(session) // 新会话放在最前面
  await saveSessions(sessions)
}

// 更新会话
export async function updateSession(id: string, updates: Partial<TranscriptSession>): Promise<void> {
  const sessions = await getSessions()
  const index = sessions.findIndex(s => s.id === id)
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates, updatedAt: Date.now() }
    await saveSessions(sessions)
  }
}

// 删除会话
export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions()
  const filtered = sessions.filter(s => s.id !== id)
  await saveSessions(filtered)
}

// ==================== IndexedDB 镜像（settings / tags） ====================

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
      const parsed = JSON.parse(lsSettings) as AppSettings
      await mirrorSettingsToIdb(parsed)
    }
  } catch { /* ignore parse errors */ }

  try {
    const lsTags = localStorage.getItem(STORAGE_KEYS.TAGS)
    if (lsTags) {
      const parsed = JSON.parse(lsTags) as Tag[]
      await mirrorTagsToIdb(parsed)
    }
  } catch { /* ignore parse errors */ }

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

// ==================== 标签相关 ====================

export function getTags(): Tag[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TAGS)
    return data ? JSON.parse(data) : []
  } catch {
    console.error('Failed to parse tags from localStorage')
    return []
  }
}

export function saveTags(tags: Tag[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags))
  } catch (error) {
    console.error('Failed to save tags to localStorage:', error)
  }
  void mirrorTagsToIdb(tags)
}

// ==================== 设置相关 ====================

export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (data) {
      return JSON.parse(data)
    }
  } catch {
    console.error('Failed to parse settings from localStorage')
  }
  return {
    apiKey: '',
    languageHints: ['zh', 'en'],
    captionStyle: DEFAULT_CAPTION_STYLE,
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error)
  }
  void mirrorSettingsToIdb(settings)
}

// ==================== safeStorage 集成 ====================

const SAFE_STORAGE_PLACEHOLDER = '{{SAFE_STORAGE}}'

function safeStorageKeyFor(path: string): string {
  return `provider_secret_${path}`
}

export async function migrateApiKeysToSafeStorage(): Promise<void> {
  if (!window.electronAPI?.safeStorageAvailable) return
  const available = await window.electronAPI.safeStorageAvailable()
  if (!available) return

  const settings = getSettings()
  let changed = false

  if (settings.apiKey && settings.apiKey !== SAFE_STORAGE_PLACEHOLDER) {
    const stored = await window.electronAPI.safeStorageSet(safeStorageKeyFor('legacy_apiKey'), settings.apiKey)
    if (stored) {
      settings.apiKey = SAFE_STORAGE_PLACEHOLDER
      changed = true
    }
  }

  if (settings.providerConfigs) {
    for (const [vendorId, config] of Object.entries(settings.providerConfigs)) {
      if (config.apiKey && typeof config.apiKey === 'string' && config.apiKey !== SAFE_STORAGE_PLACEHOLDER) {
        const stored = await window.electronAPI.safeStorageSet(safeStorageKeyFor(vendorId), config.apiKey)
        if (stored) {
          config.apiKey = SAFE_STORAGE_PLACEHOLDER
          changed = true
        }
      }
    }
  }

  if (changed) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
    } catch { /* ignore */ }
    void mirrorSettingsToIdb(settings)
  }
}

export async function resolveApiKeysFromSafeStorage(settings: AppSettings): Promise<AppSettings> {
  if (!window.electronAPI?.safeStorageGet) return settings

  const resolved = { ...settings }

  if (resolved.apiKey === SAFE_STORAGE_PLACEHOLDER) {
    const val = await window.electronAPI.safeStorageGet(safeStorageKeyFor('legacy_apiKey'))
    if (val) resolved.apiKey = val
  }

  if (resolved.providerConfigs) {
    resolved.providerConfigs = { ...resolved.providerConfigs }
    for (const [vendorId, config] of Object.entries(resolved.providerConfigs)) {
      if (config.apiKey === SAFE_STORAGE_PLACEHOLDER) {
        const val = await window.electronAPI.safeStorageGet(safeStorageKeyFor(vendorId))
        if (val) {
          resolved.providerConfigs[vendorId] = { ...config, apiKey: val }
        }
      }
    }
  }

  return resolved
}

export async function encryptApiKeyForStorage(vendorId: string, apiKey: string): Promise<string> {
  if (!apiKey || apiKey === SAFE_STORAGE_PLACEHOLDER) return apiKey
  if (!window.electronAPI?.safeStorageSet) return apiKey

  const available = await window.electronAPI.safeStorageAvailable()
  if (!available) return apiKey

  const stored = await window.electronAPI.safeStorageSet(safeStorageKeyFor(vendorId), apiKey)
  return stored ? SAFE_STORAGE_PLACEHOLDER : apiKey
}

// ==================== 工具函数 ====================

// 生成唯一ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 格式化日期
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

// 格式化时间
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toTimeString().slice(0, 5) // HH:mm
}

// 导出为TXT文件
export function exportToTxt(session: TranscriptSession, tags?: Tag[]): void {
  const sessionTags = tags?.filter(t => session.tagIds?.includes(t.id)) || []
  const tagNames = sessionTags.map(t => t.name).join(', ')

  const content = `标题: ${session.title}
日期: ${session.date}
时间: ${session.time}${tagNames ? `\n标签: ${tagNames}` : ''}
${'='.repeat(50)}

${session.transcript}
`

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${session.title}_${session.date}_${session.time.replace(':', '-')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ==================== 数据备份/恢复 ====================

export interface BackupData {
  version: string
  exportedAt: string
  sessions: TranscriptSession[]
  tags: Tag[]
  settings: AppSettings
}

// 导出所有数据为JSON
export async function exportAllData(): Promise<void> {
  const data: BackupData = {
    version: '1.1',
    exportedAt: new Date().toISOString(),
    sessions: await getSessions(),
    tags: getTags(),
    settings: getSettings(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const date = new Date().toISOString().split('T')[0]
  link.download = `desktoplive_backup_${date}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 验证导入数据格式
export function validateBackupData(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    typeof d.version === 'string' &&
    Array.isArray(d.sessions) &&
    Array.isArray(d.tags) &&
    typeof d.settings === 'object'
  )
}

// 导入数据（覆盖模式）
export async function importDataOverwrite(data: BackupData): Promise<{ sessions: number; tags: number }> {
  await saveSessions(data.sessions)
  saveTags(data.tags)
  // 保留当前API密钥，只更新语言设置
  const currentSettings = getSettings()
  saveSettings({
    ...data.settings,
    apiKey: currentSettings.apiKey || data.settings.apiKey, // 优先保留当前密钥
  })

  return {
    sessions: data.sessions.length,
    tags: data.tags.length,
  }
}

// 导入数据（合并模式）
export async function importDataMerge(data: BackupData): Promise<{ sessions: number; tags: number; newSessions: number; newTags: number }> {
  const existingSessions = await getSessions()
  const existingTags = getTags()

  // 合并会话（按ID去重）
  const existingSessionIds = new Set(existingSessions.map(s => s.id))
  const newSessions = data.sessions.filter(s => !existingSessionIds.has(s.id))
  const mergedSessions = [...existingSessions, ...newSessions]
  await saveSessions(mergedSessions)

  // 合并标签（按ID去重）
  const existingTagIds = new Set(existingTags.map(t => t.id))
  const newTags = data.tags.filter(t => !existingTagIds.has(t.id))
  const mergedTags = [...existingTags, ...newTags]
  saveTags(mergedTags)

  return {
    sessions: mergedSessions.length,
    tags: mergedTags.length,
    newSessions: newSessions.length,
    newTags: newTags.length,
  }
}
