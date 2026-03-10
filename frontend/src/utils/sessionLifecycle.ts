import type {
  TranscriptPostProcess,
  TranscriptSession,
  TranscriptSourceMeta,
} from '../types'
import {
  buildSegmentsFromTokens,
  buildSpeakersFromTokens,
  createEmptyTranscriptRuntimeState,
  type TranscriptRuntimeState,
} from './transcriptState'
import { formatDate, formatTime, generateId } from './storageUtils'
import { restoreStoredTokens } from './sessionSnapshot'

export function createDraftSession(options: {
  now?: number
  title: string
  providerId?: string
  sourceMeta?: TranscriptSourceMeta
}): TranscriptSession {
  const now = options.now ?? Date.now()

  return {
    id: generateId(),
    title: options.title,
    date: formatDate(now),
    time: formatTime(now),
    createdAt: now,
    updatedAt: now,
    transcript: '',
    tagIds: [],
    providerId: options.providerId,
    sourceMeta: options.sourceMeta,
    status: 'recording',
    lastPersistedAt: now,
  }
}

export function buildRuntimeStateFromSession(session: TranscriptSession): TranscriptRuntimeState {
  const restoredTokens = restoreStoredTokens(session.tokens || [])
  const restoredTranscript = session.transcript
    || restoredTokens.map((token) => token.text).join('')
    || ''
  const restoredTranslatedTranscript = session.translatedTranscript?.text || ''

  return {
    ...createEmptyTranscriptRuntimeState(),
    finalTokens: restoredTokens,
    finalTranscript: restoredTranscript,
    nonFinalTranscript: '',
    currentTranscript: restoredTranscript,
    finalTranslatedTranscript: restoredTranslatedTranscript,
    nonFinalTranslatedTranscript: '',
    currentTranslatedTranscript: restoredTranslatedTranscript,
    currentSegments: session.segments ?? buildSegmentsFromTokens(restoredTokens),
    currentSpeakers: session.speakers ?? buildSpeakersFromTokens(restoredTokens),
    currentPostProcess: session.postProcess,
  }
}

export function mergeSessionPostProcess(
  currentPostProcess: TranscriptPostProcess | undefined,
  patch: Partial<TranscriptPostProcess>,
  generatedAt = Date.now(),
): TranscriptPostProcess {
  const hasStructuredContent = Boolean(
    patch.summary?.trim()
    || patch.actionItems?.length
    || patch.keywords?.length
    || patch.chapters?.length,
  )

  return {
    ...(currentPostProcess || {}),
    ...patch,
    generatedAt: patch.generatedAt
      ?? (hasStructuredContent ? generatedAt : currentPostProcess?.generatedAt),
  }
}
