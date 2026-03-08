import type { TranscriptSession } from '../types'
import {
  createTransaction,
  getMetaValue,
  META_KEY_SESSIONS_MIGRATED,
  openAppDatabase,
  removeLocalStorageItem,
  SESSION_STORE,
  setMetaValue,
  STORAGE_KEYS,
  supportsIndexedDb,
  readJsonFromLocalStorage,
  writeJsonToLocalStorage,
} from './storageShared'

function getLegacySessionsFromLocalStorage(): TranscriptSession[] {
  return readJsonFromLocalStorage(STORAGE_KEYS.SESSIONS, [] as TranscriptSession[])
}

function saveLegacySessionsToLocalStorage(sessions: TranscriptSession[]): void {
  writeJsonToLocalStorage(
    STORAGE_KEYS.SESSIONS,
    sessions,
    'Failed to save sessions to localStorage:',
  )
}

function clearLegacySessionsFromLocalStorage(): void {
  removeLocalStorageItem(
    STORAGE_KEYS.SESSIONS,
    'Failed to clear sessions from localStorage:',
  )
}

function sortSessions(sessions: TranscriptSession[]): TranscriptSession[] {
  return [...sessions].sort((left, right) => {
    const leftTs = Math.max(left.createdAt || 0, left.updatedAt || 0)
    const rightTs = Math.max(right.createdAt || 0, right.updatedAt || 0)
    return rightTs - leftTs
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

export async function addSession(session: TranscriptSession): Promise<void> {
  const sessions = await getSessions()
  sessions.unshift(session)
  await saveSessions(sessions)
}

export async function updateSession(
  id: string,
  updates: Partial<TranscriptSession>,
): Promise<void> {
  const sessions = await getSessions()
  const index = sessions.findIndex((session) => session.id === id)
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates, updatedAt: Date.now() }
    await saveSessions(sessions)
  }
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions()
  await saveSessions(sessions.filter((session) => session.id !== id))
}
