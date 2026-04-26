import { create } from 'zustand'
import type {
  CorrectionIssue,
  RecordingState,
  TranscriptAskTurn,
  TranscriptCorrection,
  TranscriptMindMap,
  TranscriptPostProcess,
  TranscriptSegment,
  TranscriptSession,
  TranscriptSpeaker,
} from '../types'
import type { TranscriptToken } from '../types/asr'
import {
  askQuestionForSession,
  generateSessionBriefing,
  generateSessionMindMap as generateMindMapForSession,
  resolveModelForFeature,
} from '../services/aiPostProcess'
import {
  correctTranscriptQuick,
  correctTranscriptWithReview,
  detectCorrectionIssues,
} from '../services/aiCorrection'
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
import { generateId } from '../utils/storageUtils'

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

  transcriptPrefix: string
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
  updateSessionMindMap: (sessionId: string, patch: Partial<TranscriptMindMap>) => void
  generateSessionMindMap: (sessionId: string) => Promise<TranscriptMindMap>
  askSessionQuestion: (
    sessionId: string,
    question: string,
    options?: { conversationId?: string },
  ) => Promise<TranscriptAskTurn>
  generateSessionPostProcess: (
    sessionId: string,
    options?: { overwrite?: boolean },
  ) => Promise<TranscriptPostProcess>
  deleteSession: (id: string) => void
  deleteSessionConversation: (sessionId: string, conversationId: string) => void
  updateSessionTags: (sessionId: string, tagIds: string[]) => void
  updateSessionTopic: (sessionId: string, topicId: string | undefined) => void
  replaceAllSessions: (sessions: TranscriptSession[]) => TranscriptSession[]

  updateSessionCorrection: (sessionId: string, patch: Partial<TranscriptCorrection>) => void
  detectSessionCorrectionIssues: (sessionId: string) => Promise<CorrectionIssue[]>
  startSessionQuickCorrection: (
    sessionId: string,
    onChunk?: (text: string) => void,
  ) => Promise<string>
  startSessionReviewCorrection: (
    sessionId: string,
    acceptedIssues: CorrectionIssue[],
    onChunk?: (text: string) => void,
  ) => Promise<string>

  correctionStreamingText: Record<string, string>
  clearCorrectionStreamingText: (sessionId: string) => void

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

  const replaceSessionPostProcess = (
    sessionId: string,
    nextPostProcess: TranscriptPostProcess,
  ) => {
    const { currentSessionId, currentPostProcess, recoverySession } = get()
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
  }

  const replaceSessionAskHistory = (
    sessionId: string,
    askHistory: TranscriptAskTurn[],
  ) => {
    const { recoverySession } = get()
    const sessions = sessionRepository.updateMetadata(sessionId, { askHistory })
    set({
      sessions,
      recoverySession: recoverySession?.id === sessionId
        ? { ...recoverySession, askHistory }
        : recoverySession,
    })
  }

  const replaceSessionMindMap = (
    sessionId: string,
    mindMap: TranscriptMindMap,
  ) => {
    const { recoverySession } = get()
    const sessions = sessionRepository.updateMetadata(sessionId, { mindMap })
    set({
      sessions,
      recoverySession: recoverySession?.id === sessionId
        ? { ...recoverySession, mindMap }
        : recoverySession,
    })
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
    updateSessionMindMap: (sessionId, patch) => {
      const session = get().sessions.find((item) => item.id === sessionId)
      if (!session) return

      const nextMindMap: TranscriptMindMap = {
        markdown: '',
        ...(session.mindMap || {}),
        ...patch,
        updatedAt: patch.updatedAt ?? Date.now(),
      }
      replaceSessionMindMap(sessionId, nextMindMap)
    },
    generateSessionMindMap: async (sessionId) => {
      const session = get().sessions.find((item) => item.id === sessionId)
      if (!session) {
        throw new Error('未找到要生成思维导图的会话')
      }

      const requestedAt = Date.now()
      get().updateSessionMindMap(sessionId, {
        status: 'pending',
        error: undefined,
        requestedAt,
      })

      try {
        const { mindMap } = await generateMindMapForSession(
          session,
          useSettingsStore.getState().settings,
        )
        const nextMindMap: TranscriptMindMap = {
          ...(session.mindMap || {}),
          ...mindMap,
          requestedAt,
          status: 'success',
          error: undefined,
          updatedAt: Date.now(),
        }
        replaceSessionMindMap(sessionId, nextMindMap)
        return nextMindMap
      } catch (error) {
        const message = error instanceof Error ? error.message : '思维导图生成失败'
        get().updateSessionMindMap(sessionId, {
          status: 'error',
          error: message,
          requestedAt,
          updatedAt: Date.now(),
        })
        throw error
      }
    },
    askSessionQuestion: async (sessionId, question, options) => {
      const normalizedQuestion = question.trim()
      if (!normalizedQuestion) {
        throw new Error('请输入问题')
      }

      const session = get().sessions.find((item) => item.id === sessionId)
      if (!session) {
        throw new Error('未找到要提问的会话')
      }

      const conversationId = options?.conversationId?.trim() || 'default'
      const pendingTurn: TranscriptAskTurn = {
        id: generateId(),
        conversationId,
        question: normalizedQuestion,
        createdAt: Date.now(),
        status: 'pending',
      }

      replaceSessionAskHistory(sessionId, [...(session.askHistory || []), pendingTurn])

      try {
        const result = await askQuestionForSession(
          {
            ...session,
            askHistory: [...(session.askHistory || []), pendingTurn],
          },
          normalizedQuestion,
          useSettingsStore.getState().settings,
          { conversationId },
        )

        const latestSession = get().sessions.find((item) => item.id === sessionId)
        const nextTurn: TranscriptAskTurn = {
          ...pendingTurn,
          answer: result.answer,
          citations: result.citations,
          answeredAt: Date.now(),
          model: result.model,
          status: 'success',
          error: undefined,
        }
        const nextHistory = (latestSession?.askHistory || [pendingTurn]).map((turn) => (
          turn.id === pendingTurn.id ? nextTurn : turn
        ))
        replaceSessionAskHistory(sessionId, nextHistory)
        return nextTurn
      } catch (error) {
        const latestSession = get().sessions.find((item) => item.id === sessionId)
        const message = error instanceof Error ? error.message : '会话问答失败'
        const nextTurn: TranscriptAskTurn = {
          ...pendingTurn,
          answeredAt: Date.now(),
          status: 'error',
          error: message,
        }
        const nextHistory = (latestSession?.askHistory || [pendingTurn]).map((turn) => (
          turn.id === pendingTurn.id ? nextTurn : turn
        ))
        replaceSessionAskHistory(sessionId, nextHistory)
        throw error
      }
    },
    generateSessionPostProcess: async (sessionId, options) => {
      const session = get().sessions.find((item) => item.id === sessionId)
      if (!session) {
        throw new Error('未找到要分析的会话')
      }

      const requestedAt = Date.now()
      get().updateSessionPostProcess(sessionId, {
        status: 'pending',
        error: undefined,
        requestedAt,
      })

      try {
        const { postProcess } = await generateSessionBriefing(
          session,
          useSettingsStore.getState().settings,
        )
        const nextPostProcess = options?.overwrite === false
          ? mergeSessionPostProcess(session.postProcess, {
            ...postProcess,
            status: 'success',
            error: undefined,
            requestedAt,
          })
          : {
            ...postProcess,
            status: 'success' as const,
            error: undefined,
            requestedAt,
          }

        replaceSessionPostProcess(sessionId, nextPostProcess)
        return nextPostProcess
      } catch (error) {
        const message = error instanceof Error ? error.message : 'AI 后处理失败'
        get().updateSessionPostProcess(sessionId, {
          status: 'error',
          error: message,
          requestedAt,
        })
        throw error
      }
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
    deleteSessionConversation: (sessionId, conversationId) => {
      const session = get().sessions.find((s) => s.id === sessionId)
      if (!session) return
      const nextHistory = (session.askHistory || []).filter(
        (turn) => (turn.conversationId || 'default') !== conversationId,
      )
      replaceSessionAskHistory(sessionId, nextHistory)
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
    updateSessionTopic: (sessionId, topicId) => {
      const { sessions, recoverySession, currentSessionId, currentSpeakers, currentPostProcess } = get()
      const nextState = applySessionMetadataUpdate(
        sessions,
        sessionId,
        { topicId },
        {
          currentSessionId,
          recoverySession,
          currentSpeakers,
          currentPostProcess,
        },
      )
      const nextSessions = sessionRepository.updateMetadata(sessionId, { topicId })
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

    correctionStreamingText: {},
    clearCorrectionStreamingText: (sessionId) => {
      const { correctionStreamingText } = get()
      if (sessionId in correctionStreamingText) {
        const next = { ...correctionStreamingText }
        delete next[sessionId]
        set({ correctionStreamingText: next })
      }
    },

    updateSessionCorrection: (sessionId, patch) => {
      const session = get().sessions.find((s) => s.id === sessionId)
      if (!session) return
      const nextCorrection: TranscriptCorrection = {
        status: 'idle',
        mode: 'quick',
        ...(session.correction || {}),
        ...patch,
      }
      const { recoverySession } = get()
      const sessions = sessionRepository.updateMetadata(sessionId, { correction: nextCorrection })
      set({
        sessions,
        recoverySession: recoverySession?.id === sessionId
          ? { ...recoverySession, correction: nextCorrection }
          : recoverySession,
      })
    },

    detectSessionCorrectionIssues: async (sessionId) => {
      const session = get().sessions.find((s) => s.id === sessionId)
      if (!session) throw new Error('未找到要纠错的会话')

      get().updateSessionCorrection(sessionId, {
        status: 'detecting',
        error: undefined,
        requestedAt: Date.now(),
        mode: 'review',
      })

      try {
        const { issues, model } = await detectCorrectionIssues(
          session,
          useSettingsStore.getState().settings,
        )
        get().updateSessionCorrection(sessionId, {
          status: 'reviewing',
          issues,
          model,
        })
        return issues
      } catch (error) {
        const message = error instanceof Error ? error.message : '检测失败'
        get().updateSessionCorrection(sessionId, {
          status: 'error',
          error: message,
        })
        throw error
      }
    },

    startSessionQuickCorrection: async (sessionId, onChunk) => {
      const session = get().sessions.find((s) => s.id === sessionId)
      if (!session) throw new Error('未找到要纠错的会话')

      const model = resolveModelForFeature(
        { ...useSettingsStore.getState().settings.aiPostProcess } as import('../types').AiPostProcessConfig,
        'correction',
      )

      set({ correctionStreamingText: { ...get().correctionStreamingText, [sessionId]: '' } })
      get().updateSessionCorrection(sessionId, {
        status: 'correcting',
        error: undefined,
        requestedAt: Date.now(),
        mode: 'quick',
        model,
      })

      return new Promise<string>((resolve, reject) => {
        correctTranscriptQuick(
          session,
          useSettingsStore.getState().settings,
          {
            onChunk: (chunk) => {
              const prev = get().correctionStreamingText[sessionId] || ''
              set({ correctionStreamingText: { ...get().correctionStreamingText, [sessionId]: prev + chunk } })
              onChunk?.(chunk)
            },
            onDone: (fullText) => {
              get().clearCorrectionStreamingText(sessionId)
              get().updateSessionCorrection(sessionId, {
                status: 'done',
                correctedText: fullText,
                completedAt: Date.now(),
              })
              resolve(fullText)
            },
            onError: (err) => {
              get().clearCorrectionStreamingText(sessionId)
              get().updateSessionCorrection(sessionId, {
                status: 'error',
                error: err.message,
              })
              reject(err)
            },
          },
        ).catch((err) => {
          get().clearCorrectionStreamingText(sessionId)
          get().updateSessionCorrection(sessionId, {
            status: 'error',
            error: err instanceof Error ? err.message : '纠错失败',
          })
          reject(err)
        })
      })
    },

    startSessionReviewCorrection: async (sessionId, acceptedIssues, onChunk) => {
      const session = get().sessions.find((s) => s.id === sessionId)
      if (!session) throw new Error('未找到要纠错的会话')

      const model = resolveModelForFeature(
        { ...useSettingsStore.getState().settings.aiPostProcess } as import('../types').AiPostProcessConfig,
        'correction',
      )

      set({ correctionStreamingText: { ...get().correctionStreamingText, [sessionId]: '' } })
      get().updateSessionCorrection(sessionId, {
        status: 'correcting',
        error: undefined,
        requestedAt: Date.now(),
        mode: 'review',
        model,
        issues: session.correction?.issues?.map((issue) => ({
          ...issue,
          accepted: acceptedIssues.some((a) => a.id === issue.id),
        })),
      })

      return new Promise<string>((resolve, reject) => {
        correctTranscriptWithReview(
          session,
          acceptedIssues,
          useSettingsStore.getState().settings,
          {
            onChunk: (chunk) => {
              const prev = get().correctionStreamingText[sessionId] || ''
              set({ correctionStreamingText: { ...get().correctionStreamingText, [sessionId]: prev + chunk } })
              onChunk?.(chunk)
            },
            onDone: (fullText) => {
              get().clearCorrectionStreamingText(sessionId)
              get().updateSessionCorrection(sessionId, {
                status: 'done',
                correctedText: fullText,
                completedAt: Date.now(),
              })
              resolve(fullText)
            },
            onError: (err) => {
              get().clearCorrectionStreamingText(sessionId)
              get().updateSessionCorrection(sessionId, {
                status: 'error',
                error: err.message,
              })
              reject(err)
            },
          },
        ).catch((err) => {
          get().clearCorrectionStreamingText(sessionId)
          get().updateSessionCorrection(sessionId, {
            status: 'error',
            error: err instanceof Error ? err.message : '纠错失败',
          })
          reject(err)
        })
      })
    },
  }
})
