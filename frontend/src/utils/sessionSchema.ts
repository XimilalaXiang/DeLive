import type {
  TranscriptChapter,
  TranscriptPostProcess,
  TranscriptSegment,
  TranscriptSession,
  TranscriptSessionStatus,
  TranscriptSourceMeta,
  TranscriptSpeaker,
  TranscriptTokenData,
  TranscriptTranslationData,
} from '../types'
import { formatDate, formatTime, generateId } from './storageUtils'

export const CURRENT_SESSION_SCHEMA_VERSION = 3
const DEFAULT_SESSION_STATUS: TranscriptSessionStatus = 'completed'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function normalizeTranslationData(value: unknown): TranscriptTranslationData | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const text = getString(value.text)?.trim()
  if (!text) {
    return undefined
  }

  const mode = value.mode === 'inline' || value.mode === 'dual-line' || value.mode === 'output-only'
    ? value.mode
    : undefined

  return {
    text,
    targetLanguage: getString(value.targetLanguage),
    mode,
    updatedAt: getNumber(value.updatedAt),
  }
}

function normalizeSpeaker(value: unknown): TranscriptSpeaker | null {
  if (!isRecord(value)) {
    return null
  }

  const id = getString(value.id)?.trim()
  if (!id) {
    return null
  }

  return {
    id,
    label: getString(value.label)?.trim() || id,
    displayName: getString(value.displayName)?.trim() || undefined,
  }
}

function normalizeSegment(value: unknown): TranscriptSegment | null {
  if (!isRecord(value)) {
    return null
  }

  const text = getString(value.text)
  if (!text) {
    return null
  }

  return {
    text,
    translatedText: getString(value.translatedText),
    startMs: getNumber(value.startMs),
    endMs: getNumber(value.endMs),
    speakerId: getString(value.speakerId),
    language: getString(value.language),
    isFinal: typeof value.isFinal === 'boolean' ? value.isFinal : undefined,
  }
}

function normalizeToken(value: unknown): TranscriptTokenData | null {
  if (!isRecord(value)) {
    return null
  }

  const text = getString(value.text)
  if (!text) {
    return null
  }

  return {
    text,
    isFinal: typeof value.isFinal === 'boolean' ? value.isFinal : undefined,
    startMs: getNumber(value.startMs),
    endMs: getNumber(value.endMs),
    speaker: getString(value.speaker),
    language: getString(value.language),
    confidence: getNumber(value.confidence),
  }
}

function normalizeSourceMeta(value: unknown): TranscriptSourceMeta | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const captureMode = value.captureMode === 'system-audio'
    || value.captureMode === 'file'
    || value.captureMode === 'mixed'
    || value.captureMode === 'unknown'
    ? value.captureMode
    : undefined

  const platform = value.platform === 'win32'
    || value.platform === 'darwin'
    || value.platform === 'linux'
    || value.platform === 'unknown'
    ? value.platform
    : undefined

  const providerMode = value.providerMode === 'realtime'
    || value.providerMode === 'full-session-retranscription'
    || value.providerMode === 'local-runtime'
    || value.providerMode === 'unknown'
    ? value.providerMode
    : undefined

  if (!captureMode && !platform && !providerMode && !getString(value.sourceId) && !getString(value.sourceLabel)) {
    return undefined
  }

  return {
    captureMode,
    sourceId: getString(value.sourceId),
    sourceLabel: getString(value.sourceLabel),
    platform,
    providerMode,
  }
}

function normalizeChapter(value: unknown): TranscriptChapter | null {
  if (!isRecord(value)) {
    return null
  }

  const title = getString(value.title)?.trim()
  if (!title) {
    return null
  }

  return {
    title,
    startMs: getNumber(value.startMs),
    endMs: getNumber(value.endMs),
    summary: getString(value.summary),
  }
}

function normalizePostProcess(value: unknown): TranscriptPostProcess | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const summary = getString(value.summary)?.trim()
  const actionItems = normalizeStringArray(value.actionItems)
  const keywords = normalizeStringArray(value.keywords)
  const chapters = Array.isArray(value.chapters)
    ? value.chapters
      .map(normalizeChapter)
      .filter((chapter): chapter is TranscriptChapter => chapter !== null)
    : undefined
  const generatedAt = getNumber(value.generatedAt)
  const model = getString(value.model)

  if (!summary && actionItems.length === 0 && keywords.length === 0 && (!chapters || chapters.length === 0) && !model && !generatedAt) {
    return undefined
  }

  return {
    summary,
    actionItems: actionItems.length > 0 ? actionItems : undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    chapters: chapters && chapters.length > 0 ? chapters : undefined,
    generatedAt,
    model,
  }
}

export function normalizeTranscriptSession(session: Partial<TranscriptSession>): TranscriptSession {
  const createdAt = getNumber(session.createdAt) ?? Date.now()
  const updatedAt = getNumber(session.updatedAt) ?? createdAt
  const title = getString(session.title)?.trim() || `Transcript ${formatTime(createdAt)}`
  const tokens = Array.isArray(session.tokens)
    ? session.tokens
      .map(normalizeToken)
      .filter((token): token is TranscriptTokenData => token !== null)
    : undefined
  const speakers = Array.isArray(session.speakers)
    ? session.speakers
      .map(normalizeSpeaker)
      .filter((speaker): speaker is TranscriptSpeaker => speaker !== null)
    : undefined
  const segments = Array.isArray(session.segments)
    ? session.segments
      .map(normalizeSegment)
      .filter((segment): segment is TranscriptSegment => segment !== null)
    : undefined
  const status = session.status === 'recording' || session.status === 'interrupted' || session.status === 'completed'
    ? session.status
    : DEFAULT_SESSION_STATUS

  return {
    id: getString(session.id)?.trim() || generateId(),
    schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
    title,
    date: getString(session.date)?.trim() || formatDate(createdAt),
    time: getString(session.time)?.trim() || formatTime(createdAt),
    createdAt,
    updatedAt,
    transcript: getString(session.transcript) || '',
    translatedTranscript: normalizeTranslationData(session.translatedTranscript),
    duration: getNumber(session.duration),
    tagIds: normalizeStringArray(session.tagIds),
    tokens: tokens && tokens.length > 0 ? tokens : undefined,
    speakers: speakers ?? [],
    segments: segments ?? [],
    sourceMeta: normalizeSourceMeta(session.sourceMeta),
    postProcess: normalizePostProcess(session.postProcess),
    providerId: getString(session.providerId),
    status,
    lastPersistedAt: getNumber(session.lastPersistedAt) ?? updatedAt,
    wasInterrupted: typeof session.wasInterrupted === 'boolean' ? session.wasInterrupted : undefined,
  }
}

export function normalizeTranscriptSessions(sessions: TranscriptSession[]): TranscriptSession[] {
  return sessions.map(normalizeTranscriptSession)
}

export function upgradeTranscriptSessions(sessions: TranscriptSession[]): {
  sessions: TranscriptSession[]
  changed: boolean
} {
  const normalizedSessions = normalizeTranscriptSessions(sessions)
  const changed = normalizedSessions.some((session, index) => (
    JSON.stringify(session) !== JSON.stringify(sessions[index])
  ))

  return {
    sessions: normalizedSessions,
    changed,
  }
}
