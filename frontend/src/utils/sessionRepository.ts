import type {
  TranscriptSession,
  TranscriptSessionStatus,
  TranscriptTokenData,
} from '../types'
import { getSessions, saveSessions } from './storage'

export interface SessionProgressSnapshot {
  transcript: string
  tokens?: TranscriptTokenData[]
  providerId?: string
}

export interface SessionLaunchState {
  sessions: TranscriptSession[]
  recoverableSession: TranscriptSession | null
}

const DEFAULT_STATUS: TranscriptSessionStatus = 'completed'
const CURRENT_SESSION_SCHEMA_VERSION = 2
let cachedSessions: TranscriptSession[] = []
let cacheReady = false

function normalizeSession(session: TranscriptSession): TranscriptSession {
  return {
    ...session,
    schemaVersion: session.schemaVersion ?? CURRENT_SESSION_SCHEMA_VERSION,
    status: session.status ?? DEFAULT_STATUS,
    tagIds: session.tagIds ?? [],
    speakers: session.speakers ?? [],
    segments: session.segments ?? [],
    lastPersistedAt: session.lastPersistedAt ?? session.updatedAt ?? session.createdAt,
  }
}

function getCachedSessions(): TranscriptSession[] {
  return cachedSessions.map(normalizeSession)
}

function persistSessions(sessions: TranscriptSession[]): TranscriptSession[] {
  cachedSessions = sessions.map(normalizeSession)
  cacheReady = true

  void saveSessions(cachedSessions).catch((error) => {
    console.error('[sessionRepository] Failed to persist sessions:', error)
  })

  return cachedSessions
}

function updateSessionCollection(
  sessions: TranscriptSession[],
  sessionId: string,
  updates: Partial<TranscriptSession>
): TranscriptSession[] {
  const now = Date.now()

  return sessions.map((session) => {
    if (session.id !== sessionId) {
      return session
    }

    return {
      ...session,
      ...updates,
      updatedAt: now,
      lastPersistedAt: updates.lastPersistedAt ?? session.lastPersistedAt ?? now,
    }
  })
}

export const sessionRepository = {
  async loadForLaunch(): Promise<SessionLaunchState> {
    let sessions = (await getSessions()).map(normalizeSession)
    cachedSessions = sessions
    cacheReady = true
    let mutated = false
    const now = Date.now()

    sessions = sessions.map((session) => {
      if (session.status !== 'recording') {
        return session
      }

      mutated = true
      return {
        ...session,
        status: 'interrupted',
        wasInterrupted: true,
        updatedAt: now,
        lastPersistedAt: session.lastPersistedAt ?? now,
      }
    })

    if (mutated) {
      persistSessions(sessions)
    }

    const recoverableSession = sessions.find((session) => {
      if (session.status !== 'interrupted') {
        return false
      }

      return Boolean(session.transcript || session.tokens?.length)
    }) || null

    return { sessions, recoverableSession }
  },

  createDraft(session: TranscriptSession): TranscriptSession[] {
    const now = Date.now()
    const draftSession = normalizeSession({
      ...session,
      status: 'recording',
      lastPersistedAt: now,
      updatedAt: now,
    })

    const baseSessions = cacheReady ? getCachedSessions() : []
    const sessions = [draftSession, ...baseSessions]
    return persistSessions(sessions)
  },

  updateMetadata(sessionId: string, updates: Partial<TranscriptSession>): TranscriptSession[] {
    const sessions = updateSessionCollection(getCachedSessions(), sessionId, updates)
    return persistSessions(sessions)
  },

  saveProgress(sessionId: string, snapshot: SessionProgressSnapshot): TranscriptSession[] {
    const now = Date.now()
    const sessions = updateSessionCollection(getCachedSessions(), sessionId, {
      transcript: snapshot.transcript,
      tokens: snapshot.tokens,
      providerId: snapshot.providerId,
      status: 'recording',
      lastPersistedAt: now,
    })

    return persistSessions(sessions)
  },

  completeSession(sessionId: string, snapshot: SessionProgressSnapshot): TranscriptSession[] {
    const now = Date.now()
    const sessions = updateSessionCollection(getCachedSessions(), sessionId, {
      transcript: snapshot.transcript,
      tokens: snapshot.tokens,
      providerId: snapshot.providerId,
      status: 'completed',
      lastPersistedAt: now,
    })

    return persistSessions(sessions)
  },

  acknowledgeInterrupted(sessionId: string): TranscriptSession[] {
    const sessions = updateSessionCollection(getCachedSessions(), sessionId, {
      status: 'completed',
    })

    return persistSessions(sessions)
  },

  replaceAllSessions(sessions: TranscriptSession[]): TranscriptSession[] {
    return persistSessions(sessions)
  },

  deleteSession(sessionId: string): TranscriptSession[] {
    const sessions = getCachedSessions().filter((session) => session.id !== sessionId)
    return persistSessions(sessions)
  },
}
