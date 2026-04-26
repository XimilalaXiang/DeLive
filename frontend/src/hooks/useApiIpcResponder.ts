import { useEffect } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { getTags, getTopics } from '../utils/settingsStorage'
import type {
  SessionSummary,
  SessionDetail,
  ApiRecordingStatus,
} from '../../../shared/electronApi'
import type { TranscriptSession } from '../types'

function toSessionSummary(session: TranscriptSession): SessionSummary {
  return {
    id: session.id,
    title: session.title,
    date: session.date,
    time: session.time,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    duration: session.duration,
    status: session.status,
    topicId: session.topicId,
    tagIds: session.tagIds,
    providerId: session.providerId,
    hasSummary: Boolean(session.postProcess?.summary),
    hasMindMap: Boolean(session.mindMap?.markdown),
    transcriptLength: session.transcript?.length ?? 0,
  }
}

function toSessionDetail(session: TranscriptSession): SessionDetail {
  return {
    id: session.id,
    title: session.title,
    date: session.date,
    time: session.time,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    duration: session.duration,
    status: session.status,
    topicId: session.topicId,
    tagIds: session.tagIds,
    providerId: session.providerId,
    transcript: session.transcript ?? '',
    translatedTranscript: session.translatedTranscript
      ? { text: session.translatedTranscript.text, targetLanguage: session.translatedTranscript.targetLanguage }
      : undefined,
    tokens: session.tokens?.map(t => ({
      text: t.text,
      isFinal: t.isFinal,
      startMs: t.startMs,
      endMs: t.endMs,
      speaker: t.speaker,
    })),
    speakers: session.speakers?.map(s => ({
      id: s.id,
      label: s.label,
      displayName: s.displayName,
    })),
    segments: session.segments?.map(s => ({
      text: s.text,
      translatedText: s.translatedText,
      startMs: s.startMs,
      endMs: s.endMs,
      speakerId: s.speakerId,
    })),
    postProcess: session.postProcess
      ? {
          summary: session.postProcess.summary,
          actionItems: session.postProcess.actionItems,
          keywords: session.postProcess.keywords,
          titleSuggestion: session.postProcess.titleSuggestion,
          tagSuggestions: session.postProcess.tagSuggestions,
          generatedAt: session.postProcess.generatedAt,
          status: session.postProcess.status,
        }
      : undefined,
    mindMap: session.mindMap
      ? {
          markdown: session.mindMap.markdown,
          title: session.mindMap.title,
          generatedAt: session.mindMap.generatedAt,
          status: session.mindMap.status,
        }
      : undefined,
    askHistory: session.askHistory?.map(turn => ({
      id: turn.id,
      question: turn.question,
      answer: turn.answer,
      createdAt: turn.createdAt,
      status: turn.status,
    })),
    correction: session.correction?.correctedText
      ? {
          correctedText: session.correction.correctedText,
          status: session.correction.status,
          mode: session.correction.mode,
        }
      : undefined,
  }
}

export function useApiIpcResponder(): void {
  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const store = useSessionStore
    let prevSessionId = store.getState().currentSessionId

    const unsubscribeStore = store.subscribe((state) => {
      const currentId = state.currentSessionId
      if (currentId !== prevSessionId) {
        if (prevSessionId && !currentId) {
          api.apiNotifySessionEnd(prevSessionId)
        } else if (currentId && !prevSessionId) {
          api.apiNotifySessionStart(currentId)
        }
        prevSessionId = currentId
      }
    })

    const cleanups: Array<() => void> = [unsubscribeStore]

    cleanups.push(
      api.onApiGetSessions(() => {
        const sessions = useSessionStore.getState().sessions
        api.apiRespondSessions(sessions.map(toSessionSummary))
      }),
    )

    cleanups.push(
      api.onApiGetSessionDetail((_event, sessionId) => {
        const session = useSessionStore.getState().sessions.find(s => s.id === sessionId)
        api.apiRespondSessionDetail(session ? toSessionDetail(session) : null)
      }),
    )

    cleanups.push(
      api.onApiSearchSessions((_event, query) => {
        const lowerQuery = query.toLowerCase()
        const sessions = useSessionStore.getState().sessions.filter(s =>
          s.title.toLowerCase().includes(lowerQuery)
          || (s.transcript ?? '').toLowerCase().includes(lowerQuery),
        )
        api.apiRespondSearchSessions(sessions.map(toSessionSummary))
      }),
    )

    cleanups.push(
      api.onApiGetTopics(() => {
        api.apiRespondTopics(getTopics())
      }),
    )

    cleanups.push(
      api.onApiGetTags(() => {
        api.apiRespondTags(getTags())
      }),
    )

    cleanups.push(
      api.onApiGetRecordingStatus(() => {
        const { recordingState, currentSessionId } = useSessionStore.getState()
        const status: ApiRecordingStatus = {
          isRecording: recordingState === 'recording',
          currentSessionId,
          recordingState,
        }
        api.apiRespondRecordingStatus(status)
      }),
    )

    return () => {
      cleanups.forEach(fn => fn())
    }
  }, [])
}
