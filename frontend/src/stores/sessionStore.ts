import { create } from 'zustand'
import type {
  RecordingState,
  TranscriptPostProcess,
  TranscriptSegment,
  TranscriptSession,
  TranscriptSpeaker,
} from '../types'
import type { TranscriptToken } from '../types/asr'
import { sessionRepository } from '../utils/sessionRepository'
import { formatTime } from '../utils/storage'
import {
  buildRuntimeStateFromSession,
  createDraftSession,
  mergeSessionPostProcess,
} from '../utils/sessionLifecycle'
import {
  applySessionDeletion,
  applySessionMetadataUpdate,
  updateSessionInCollection,
} from '../utils/sessionMetadata'
import { resolveProviderMode } from '../utils/providerMetadata'
import {
  buildSessionSnapshot,
  buildSourceMeta,
  hasPersistenceSnapshotContent,
} from '../utils/sessionSnapshot'
import {
  applyTranscriptEvent as reduceTranscriptEvent,
  buildSegmentsFromTokens,
  buildSpeakersFromTokens,
  createEmptyTranscriptRuntimeState,
  resolveTranscriptRuntimeState,
  selectTranscriptRuntimeState,
  type TranscriptEvent,
} from '../utils/transcriptState'
import { useSettingsStore } from './settingsStore'
import { useUIStore } from './uiStore'

const SESSION_AUTOSAVE_DELAY_MS = 1200
let sessionAutosaveTimer: ReturnType<typeof setTimeout> | null = null

function clearSessionAutosaveTimer(): void {
  if (sessionAutosaveTimer) {
    clearTimeout(sessionAutosaveTimer)
    sessionAutosaveTimer = null
  }
}

function getTranslationTargetLanguage(): string | undefined {
  const { settings } = useSettingsStore.getState()
  const currentVendor = settings.currentVendor || 'soniox'
  const providerConfig = settings.providerConfigs?.[currentVendor]
  const value = providerConfig?.translationTargetLanguage
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export interface SessionState {
  recordingState: RecordingState
  setRecordingState: (state: RecordingState) => void

  currentTranscript: string
  finalTranscript: string
  nonFinalTranscript: string
  currentTranslatedTranscript: string
  finalTranslatedTranscript: string
  nonFinalTranslatedTranscript: string
  currentSegments: TranscriptSegment[]
  currentSpeakers: TranscriptSpeaker[]
  currentPostProcess?: TranscriptPostProcess
  applyTranscriptEvent: (event: TranscriptEvent) => void
  updateCurrentSessionPostProcess: (patch: Partial<TranscriptPostProcess>) => void
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
  updateSessionSpeakers: (sessionId: string, speakers: TranscriptSpeaker[]) => void
  updateSessionPostProcess: (sessionId: string, patch: Partial<TranscriptPostProcess>) => void
  deleteSession: (id: string) => void
  updateSessionTags: (sessionId: string, tagIds: string[]) => void
  replaceAllSessions: (sessions: TranscriptSession[]) => TranscriptSession[]

  finalTokens: TranscriptToken[]
}

export const useSessionStore = create<SessionState>((set, get) => {
  const buildCurrentSessionSnapshot = (overrides?: {
    finalTokens?: TranscriptToken[]
    finalTranscript?: string
    nonFinalTranscript?: string
    currentTranscript?: string
    finalTranslatedTranscript?: string
    nonFinalTranslatedTranscript?: string
    currentTranslatedTranscript?: string
    currentPostProcess?: TranscriptPostProcess
  }) => {
    const state = resolveTranscriptRuntimeState(
      selectTranscriptRuntimeState(get()),
      overrides,
    )
    const providerId = useSettingsStore.getState().settings.currentVendor
    const captionDisplayMode = useSettingsStore.getState().settings.captionStyle?.displayMode ?? 'source'

    return buildSessionSnapshot({
      runtimeState: {
        ...state,
        currentSegments: buildSegmentsFromTokens(state.finalTokens),
        currentSpeakers: buildSpeakersFromTokens(state.finalTokens),
      },
      providerId,
      providerMode: resolveProviderMode(providerId),
      platform: window.electronAPI?.platform ?? 'unknown',
      captureMode: 'system-audio',
      translationTargetLanguage: getTranslationTargetLanguage(),
      captionDisplayMode,
    })
  }

  const syncCurrentSessionInMemory = (overrides?: {
    finalTokens?: TranscriptToken[]
    finalTranscript?: string
    nonFinalTranscript?: string
    currentTranscript?: string
    finalTranslatedTranscript?: string
    nonFinalTranslatedTranscript?: string
    currentTranslatedTranscript?: string
    currentPostProcess?: TranscriptPostProcess
  }) => {
    const state = get()
    if (!state.currentSessionId) return state.sessions

    const snapshot = buildCurrentSessionSnapshot(overrides)
    return updateSessionInCollection(state.sessions, state.currentSessionId, {
      transcript: snapshot.transcript,
      translatedTranscript: snapshot.translatedTranscript,
      tokens: snapshot.tokens,
      providerId: snapshot.providerId,
      speakers: snapshot.speakers,
      segments: snapshot.segments,
      sourceMeta: snapshot.sourceMeta,
      postProcess: snapshot.postProcess,
      status: 'recording',
    })
  }

  const scheduleCurrentSessionAutosave = () => {
    clearSessionAutosaveTimer()
    sessionAutosaveTimer = setTimeout(() => {
      const state = get()
      if (!state.currentSessionId) return

      const snapshot = buildCurrentSessionSnapshot()
      if (!hasPersistenceSnapshotContent(snapshot)) {
        return
      }

      const sessions = sessionRepository.saveProgress(state.currentSessionId, snapshot)
      set({ sessions })
    }, SESSION_AUTOSAVE_DELAY_MS)
  }

  return {
    recordingState: 'idle',
    setRecordingState: (state) => set({ recordingState: state }),

    ...createEmptyTranscriptRuntimeState(),
    applyTranscriptEvent: (event) => {
      const nextTranscriptState = reduceTranscriptEvent(
        selectTranscriptRuntimeState(get()),
        event,
      )

      const sessions = syncCurrentSessionInMemory({
        finalTokens: nextTranscriptState.finalTokens,
        finalTranscript: nextTranscriptState.finalTranscript,
        nonFinalTranscript: nextTranscriptState.nonFinalTranscript,
        currentTranscript: nextTranscriptState.currentTranscript,
        finalTranslatedTranscript: nextTranscriptState.finalTranslatedTranscript,
        nonFinalTranslatedTranscript: nextTranscriptState.nonFinalTranslatedTranscript,
        currentTranslatedTranscript: nextTranscriptState.currentTranslatedTranscript,
        currentPostProcess: nextTranscriptState.currentPostProcess,
      })

      set({
        ...nextTranscriptState,
        sessions,
      })
      scheduleCurrentSessionAutosave()
    },
    updateCurrentSessionPostProcess: (patch) => {
      get().applyTranscriptEvent({ type: 'post-process', patch })
    },
    clearTranscript: () => {
      clearSessionAutosaveTimer()
      set({
        ...createEmptyTranscriptRuntimeState(),
      })
    },

    currentSessionId: null,
    recoverySession: null,
    startNewSession: () => {
      clearSessionAutosaveTimer()
      const now = Date.now()
      const { t } = useUIStore.getState()
      const { settings } = useSettingsStore.getState()
      const providerId = settings.currentVendor

      const session = createDraftSession({
        now,
        title: t.session.defaultTitle(formatTime(now)),
        providerId,
        sourceMeta: buildSourceMeta({
          providerId,
          providerMode: resolveProviderMode(providerId),
          platform: window.electronAPI?.platform ?? 'unknown',
          captureMode: 'system-audio',
        }),
      })

      const sessions = sessionRepository.createDraft(session)
      set({
        currentSessionId: session.id,
        sessions,
        ...createEmptyTranscriptRuntimeState(),
      })
      return session.id
    },
    endCurrentSession: () => {
      clearSessionAutosaveTimer()
      const { currentSessionId } = get()
      const snapshot = buildCurrentSessionSnapshot()
      const hasContent = hasPersistenceSnapshotContent(snapshot)

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

      const sessions = sessionRepository.acknowledgeInterrupted(recoverySession.id)
      set({
        recoverySession: null,
        sessions,
        currentSessionId: null,
        ...buildRuntimeStateFromSession(recoverySession),
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
      const { sessions, recoverySession, currentSessionId, currentSpeakers, currentPostProcess } = get()
      const nextSessions = sessionRepository.updateMetadata(id, { title })
      const nextState = applySessionMetadataUpdate(
        sessions,
        id,
        { title },
        {
          currentSessionId,
          recoverySession,
          currentSpeakers,
          currentPostProcess,
        },
      )
      set({
        sessions: nextSessions,
        recoverySession: nextState.recoverySession,
      })
    },
    updateSessionSpeakers: (sessionId, speakers) => {
      const { currentSessionId, currentSpeakers, recoverySession } = get()
      const nextState = applySessionMetadataUpdate(
        get().sessions,
        sessionId,
        { speakers },
        {
          currentSessionId,
          recoverySession,
          currentSpeakers,
          currentPostProcess: get().currentPostProcess,
        },
      )
      const sessions = sessionRepository.updateMetadata(sessionId, { speakers })
      set({
        sessions,
        currentSpeakers: nextState.currentSpeakers,
        recoverySession: nextState.recoverySession,
      })
    },
    updateSessionPostProcess: (sessionId, patch) => {
      const { currentSessionId, currentPostProcess, recoverySession } = get()
      const currentSession = get().sessions.find((session) => session.id === sessionId)
      const nextPostProcess = mergeSessionPostProcess(currentSession?.postProcess, patch)

      const nextState = applySessionMetadataUpdate(
        get().sessions,
        sessionId,
        { postProcess: nextPostProcess },
        {
          currentSessionId,
          recoverySession,
          currentSpeakers: get().currentSpeakers,
          currentPostProcess,
        },
      )
      const sessions = sessionRepository.updateMetadata(sessionId, { postProcess: nextPostProcess })
      set({
        sessions,
        currentPostProcess: nextState.currentPostProcess,
        recoverySession: nextState.recoverySession,
      })
    },
    deleteSession: (id) => {
      const { sessions: currentSessions, recoverySession } = get()
      const nextState = applySessionDeletion(currentSessions, id, recoverySession)
      const sessions = sessionRepository.deleteSession(id)
      set({
        sessions,
        recoverySession: nextState.recoverySession,
      })
    },
    updateSessionTags: (sessionId, tagIds) => {
      const { sessions, recoverySession, currentSessionId, currentSpeakers, currentPostProcess } = get()
      const nextState = applySessionMetadataUpdate(
        sessions,
        sessionId,
        { tagIds },
        {
          currentSessionId,
          recoverySession,
          currentSpeakers,
          currentPostProcess,
        },
      )
      const nextSessions = sessionRepository.updateMetadata(sessionId, { tagIds })
      set({
        sessions: nextSessions,
        recoverySession: nextState.recoverySession,
      })
    },
    replaceAllSessions: (sessions) => {
      const persisted = sessionRepository.replaceAllSessions(sessions)
      set({ sessions: persisted })
      return persisted
    },
  }
})
