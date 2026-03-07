import { create } from 'zustand'
import type {
  TranscriptSession,
  RecordingState,
  SonioxToken,
  TranscriptTokenData,
} from '../types'
import { generateId, formatDate, formatTime } from '../utils/storage'
import { sessionRepository } from '../utils/sessionRepository'
import { useUIStore } from './uiStore'
import { useSettingsStore } from './settingsStore'

const SESSION_AUTOSAVE_DELAY_MS = 1200
let sessionAutosaveTimer: ReturnType<typeof setTimeout> | null = null

function clearSessionAutosaveTimer(): void {
  if (sessionAutosaveTimer) {
    clearTimeout(sessionAutosaveTimer)
    sessionAutosaveTimer = null
  }
}

function mapTokensForStorage(tokens: SonioxToken[]): TranscriptTokenData[] {
  return tokens.map((token) => ({
    text: token.text,
    startMs: token.start_ms,
    endMs: token.end_ms,
    speaker: token.speaker,
    language: token.language,
    confidence: token.confidence,
  }))
}

function buildTranscriptFromState(finalTranscript: string, nonFinalTranscript: string, currentTranscript: string): string {
  return currentTranscript || finalTranscript || nonFinalTranscript
}

function updateSessionInCollection(
  sessions: TranscriptSession[],
  sessionId: string | null,
  updates: Partial<TranscriptSession>
): TranscriptSession[] {
  if (!sessionId) return sessions
  const now = Date.now()
  return sessions.map((session) => (
    session.id === sessionId
      ? { ...session, ...updates, updatedAt: now }
      : session
  ))
}

export interface SessionState {
  recordingState: RecordingState
  setRecordingState: (state: RecordingState) => void

  currentTranscript: string
  finalTranscript: string
  nonFinalTranscript: string
  setTranscript: (final: string, nonFinal: string) => void
  clearTranscript: () => void

  currentSessionId: string | null
  recoverySession: TranscriptSession | null
  startNewSession: () => string
  endCurrentSession: () => void
  restoreRecoverySession: () => void
  dismissRecoverySession: () => void

  sessions: TranscriptSession[]
  loadSessions: () => Promise<void>
  updateSessionTitle: (id: string, title: string) => void
  deleteSession: (id: string) => void
  updateSessionTags: (sessionId: string, tagIds: string[]) => void
  replaceAllSessions: (sessions: TranscriptSession[]) => TranscriptSession[]

  finalTokens: SonioxToken[]
  processTokens: (tokens: SonioxToken[]) => void
}

export const useSessionStore = create<SessionState>((set, get) => {
  const buildStoredTokens = (tokens: SonioxToken[]): TranscriptTokenData[] | undefined =>
    tokens.length > 0 ? mapTokensForStorage(tokens) : undefined

  const buildCurrentSessionSnapshot = (overrides?: {
    finalTokens?: SonioxToken[]
    finalTranscript?: string
    nonFinalTranscript?: string
    currentTranscript?: string
  }) => {
    const state = get()
    const finalTokens = overrides?.finalTokens ?? state.finalTokens
    const finalTranscript = overrides?.finalTranscript ?? state.finalTranscript
    const nonFinalTranscript = overrides?.nonFinalTranscript ?? state.nonFinalTranscript
    const currentTranscript = overrides?.currentTranscript ?? state.currentTranscript
    const transcript = buildTranscriptFromState(finalTranscript, nonFinalTranscript, currentTranscript)
    const tokens = buildStoredTokens(finalTokens)

    return {
      transcript,
      tokens,
      providerId: useSettingsStore.getState().settings.currentVendor,
    }
  }

  const syncCurrentSessionInMemory = (overrides?: {
    finalTokens?: SonioxToken[]
    finalTranscript?: string
    nonFinalTranscript?: string
    currentTranscript?: string
  }) => {
    const state = get()
    if (!state.currentSessionId) return state.sessions

    const snapshot = buildCurrentSessionSnapshot(overrides)
    return updateSessionInCollection(state.sessions, state.currentSessionId, {
      transcript: snapshot.transcript,
      tokens: snapshot.tokens,
      providerId: snapshot.providerId,
      status: 'recording',
    })
  }

  const scheduleCurrentSessionAutosave = () => {
    clearSessionAutosaveTimer()
    sessionAutosaveTimer = setTimeout(() => {
      const state = get()
      if (!state.currentSessionId) return

      const snapshot = buildCurrentSessionSnapshot()
      if (!snapshot.transcript && !snapshot.tokens?.length) return

      const sessions = sessionRepository.saveProgress(state.currentSessionId, snapshot)
      set({ sessions })
    }, SESSION_AUTOSAVE_DELAY_MS)
  }

  return {
    recordingState: 'idle',
    setRecordingState: (state) => set({ recordingState: state }),

    currentTranscript: '',
    finalTranscript: '',
    nonFinalTranscript: '',
    setTranscript: (final, nonFinal) => {
      const currentTranscript = final + nonFinal
      const sessions = syncCurrentSessionInMemory({
        finalTranscript: final,
        nonFinalTranscript: nonFinal,
        currentTranscript,
      })
      set({ finalTranscript: final, nonFinalTranscript: nonFinal, currentTranscript, sessions })
      scheduleCurrentSessionAutosave()
    },
    clearTranscript: () => {
      clearSessionAutosaveTimer()
      set({ currentTranscript: '', finalTranscript: '', nonFinalTranscript: '', finalTokens: [] })
    },

    currentSessionId: null,
    recoverySession: null,
    startNewSession: () => {
      clearSessionAutosaveTimer()
      const id = generateId()
      const now = Date.now()
      const { t } = useUIStore.getState()
      const { settings } = useSettingsStore.getState()
      const session: TranscriptSession = {
        id,
        title: t.session.defaultTitle(formatTime(now)),
        date: formatDate(now),
        time: formatTime(now),
        createdAt: now,
        updatedAt: now,
        transcript: '',
        tagIds: [],
        providerId: settings.currentVendor,
        status: 'recording',
        lastPersistedAt: now,
      }
      const sessions = sessionRepository.createDraft(session)
      set({
        currentSessionId: id,
        sessions,
        finalTranscript: '',
        nonFinalTranscript: '',
        currentTranscript: '',
        finalTokens: [],
      })
      return id
    },
    endCurrentSession: () => {
      clearSessionAutosaveTimer()
      const { currentSessionId } = get()
      const snapshot = buildCurrentSessionSnapshot()
      const hasContent = Boolean(snapshot.transcript || snapshot.tokens?.length)

      if (currentSessionId && hasContent) {
        const sessions = sessionRepository.completeSession(currentSessionId, snapshot)
        set({ sessions })
        console.log('[SessionStore] 会话已保存, 文本长度:', snapshot.transcript.length)
      } else if (currentSessionId) {
        const sessions = sessionRepository.deleteSession(currentSessionId)
        set({ sessions })
        console.log('[SessionStore] 空会话已丢弃:', currentSessionId)
      } else {
        console.log('[SessionStore] 会话未保存: currentSessionId=', currentSessionId)
      }
      set({ currentSessionId: null })
    },
    restoreRecoverySession: () => {
      const { recoverySession } = get()
      if (!recoverySession) return

      const restoredTranscript = recoverySession.transcript || recoverySession.tokens?.map((t) => t.text).join('') || ''
      const restoredTokens: SonioxToken[] = (recoverySession.tokens || []).map((token) => ({
        text: token.text,
        is_final: true,
        start_ms: token.startMs,
        end_ms: token.endMs,
        speaker: token.speaker,
        language: token.language,
        confidence: token.confidence,
      }))
      const sessions = sessionRepository.acknowledgeInterrupted(recoverySession.id)
      set({
        recoverySession: null,
        sessions,
        currentSessionId: null,
        finalTokens: restoredTokens,
        finalTranscript: restoredTranscript,
        nonFinalTranscript: '',
        currentTranscript: restoredTranscript,
      })
    },
    dismissRecoverySession: () => {
      const { recoverySession } = get()
      if (!recoverySession) return
      const sessions = sessionRepository.acknowledgeInterrupted(recoverySession.id)
      set({ recoverySession: null, sessions })
    },

    sessions: [],
    loadSessions: async () => {
      const { sessions, recoverableSession } = await sessionRepository.loadForLaunch()
      set({ sessions, recoverySession: recoverableSession })
    },
    updateSessionTitle: (id, title) => {
      const sessions = sessionRepository.updateMetadata(id, { title })
      set({ sessions })
    },
    deleteSession: (id) => {
      const sessions = sessionRepository.deleteSession(id)
      const { recoverySession } = get()
      set({
        sessions,
        recoverySession: recoverySession?.id === id ? null : recoverySession,
      })
    },
    updateSessionTags: (sessionId, tagIds) => {
      const sessions = sessionRepository.updateMetadata(sessionId, { tagIds })
      set({ sessions })
    },
    replaceAllSessions: (sessions) => {
      const persisted = sessionRepository.replaceAllSessions(sessions)
      set({ sessions: persisted })
      return persisted
    },

    finalTokens: [],
    processTokens: (tokens) => {
      const { finalTokens } = get()
      const newFinalTokens = [...finalTokens]
      let nonFinalText = ''

      for (const token of tokens) {
        if (token.text) {
          if (token.is_final) {
            newFinalTokens.push(token)
          } else {
            nonFinalText += token.text
          }
        }
      }

      const finalText = newFinalTokens.map(t => t.text).join('')
      const currentTranscript = finalText + nonFinalText
      const sessions = syncCurrentSessionInMemory({
        finalTokens: newFinalTokens,
        finalTranscript: finalText,
        nonFinalTranscript: nonFinalText,
        currentTranscript,
      })
      set({
        finalTokens: newFinalTokens,
        finalTranscript: finalText,
        nonFinalTranscript: nonFinalText,
        currentTranscript,
        sessions,
      })
      scheduleCurrentSessionAutosave()
    },
  }
})
