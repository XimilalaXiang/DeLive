import type {
  CorrectionIssue,
  TranscriptAskTurn,
  TranscriptChapter,
  TranscriptCorrection,
  TranscriptCorrectionStatus,
  TranscriptMindMap,
  TranscriptPostProcess,
  TranscriptQaCitation,
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

function normalizeQaCitation(value: unknown): TranscriptQaCitation | null {
  if (!isRecord(value)) {
    return null
  }

  const quote = getString(value.quote)?.trim()
  if (!quote) {
    return null
  }

  return {
    quote,
    speakerLabel: getString(value.speakerLabel)?.trim() || undefined,
  }
}

function normalizeAskTurn(value: unknown): TranscriptAskTurn | null {
  if (!isRecord(value)) {
    return null
  }

  const id = getString(value.id)?.trim()
  const question = getString(value.question)?.trim()
  if (!id || !question) {
    return null
  }

  const status = value.status === 'pending'
    || value.status === 'success'
    || value.status === 'error'
    ? value.status
    : 'success'
  const citations = Array.isArray(value.citations)
    ? value.citations
      .map(normalizeQaCitation)
      .filter((citation): citation is TranscriptQaCitation => citation !== null)
    : undefined

  return {
    id,
    conversationId: getString(value.conversationId)?.trim() || undefined,
    question,
    answer: getString(value.answer)?.trim() || undefined,
    citations: citations && citations.length > 0 ? citations : undefined,
    createdAt: getNumber(value.createdAt) ?? Date.now(),
    answeredAt: getNumber(value.answeredAt),
    model: getString(value.model)?.trim() || undefined,
    status,
    error: getString(value.error)?.trim() || undefined,
  }
}

function normalizeMindMap(value: unknown): TranscriptMindMap | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const markdown = getString(value.markdown)?.trim()
  const title = getString(value.title)?.trim()
  const generatedAt = getNumber(value.generatedAt)
  const requestedAt = getNumber(value.requestedAt)
  const updatedAt = getNumber(value.updatedAt)
  const model = getString(value.model)?.trim()
  const status = value.status === 'pending'
    || value.status === 'success'
    || value.status === 'error'
    ? value.status
    : undefined
  const error = getString(value.error)?.trim()

  if (!markdown && !title && !generatedAt && !requestedAt && !updatedAt && !model && !status && !error) {
    return undefined
  }

  return {
    markdown: markdown || '',
    title: title || undefined,
    generatedAt,
    requestedAt,
    updatedAt,
    model,
    status,
    error: error || undefined,
  }
}

function normalizePostProcess(value: unknown): TranscriptPostProcess | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const summary = getString(value.summary)?.trim()
  const actionItems = normalizeStringArray(value.actionItems)
  const keywords = normalizeStringArray(value.keywords)
  const titleSuggestion = getString(value.titleSuggestion)?.trim()
  const tagSuggestions = normalizeStringArray(value.tagSuggestions)
  const chapters = Array.isArray(value.chapters)
    ? value.chapters
      .map(normalizeChapter)
      .filter((chapter): chapter is TranscriptChapter => chapter !== null)
    : undefined
  const generatedAt = getNumber(value.generatedAt)
  const requestedAt = getNumber(value.requestedAt)
  const model = getString(value.model)
  const status = value.status === 'pending'
    || value.status === 'success'
    || value.status === 'error'
    ? value.status
    : undefined
  const error = getString(value.error)?.trim()

  if (
    !summary
    && actionItems.length === 0
    && keywords.length === 0
    && !titleSuggestion
    && tagSuggestions.length === 0
    && (!chapters || chapters.length === 0)
    && !model
    && !generatedAt
    && !requestedAt
    && !status
    && !error
  ) {
    return undefined
  }

  return {
    summary,
    actionItems: actionItems.length > 0 ? actionItems : undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    titleSuggestion,
    tagSuggestions: tagSuggestions.length > 0 ? tagSuggestions : undefined,
    chapters: chapters && chapters.length > 0 ? chapters : undefined,
    generatedAt,
    requestedAt,
    model,
    status,
    error,
  }
}

const VALID_CORRECTION_STATUSES = new Set<TranscriptCorrectionStatus>([
  'idle', 'detecting', 'reviewing', 'correcting', 'done', 'error',
])
const VALID_CORRECTION_CATEGORIES = new Set(['homophone', 'proper-noun', 'grammar', 'punctuation', 'other'])

function normalizeCorrectionIssue(raw: unknown): CorrectionIssue | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const id = getString(obj.id)
  const originalText = getString(obj.originalText)
  const suggestedText = getString(obj.suggestedText)
  const reason = getString(obj.reason) ?? ''
  const category = getString(obj.category)
  if (!id || !originalText || !suggestedText || !category || !VALID_CORRECTION_CATEGORIES.has(category)) return null
  return {
    id,
    segmentIndex: getNumber(obj.segmentIndex),
    originalText,
    suggestedText,
    reason,
    accepted: typeof obj.accepted === 'boolean' ? obj.accepted : undefined,
    category: category as CorrectionIssue['category'],
  }
}

function normalizeCorrection(raw: unknown): TranscriptCorrection | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  const statusStr = getString(obj.status)
  const status: TranscriptCorrectionStatus =
    statusStr && VALID_CORRECTION_STATUSES.has(statusStr as TranscriptCorrectionStatus)
      ? (statusStr as TranscriptCorrectionStatus)
      : 'idle'
  const mode = getString(obj.mode) === 'review' ? 'review' as const : 'quick' as const
  const correctedText = getString(obj.correctedText)
  const issues = Array.isArray(obj.issues)
    ? obj.issues.map(normalizeCorrectionIssue).filter((i): i is CorrectionIssue => i !== null)
    : undefined

  if (status === 'idle' && !correctedText && (!issues || issues.length === 0)) {
    return undefined
  }

  return {
    status,
    mode,
    correctedText: correctedText || undefined,
    issues: issues && issues.length > 0 ? issues : undefined,
    model: getString(obj.model) || undefined,
    requestedAt: getNumber(obj.requestedAt),
    completedAt: getNumber(obj.completedAt),
    error: getString(obj.error) || undefined,
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
  const askHistory = Array.isArray(session.askHistory)
    ? session.askHistory
      .map(normalizeAskTurn)
      .filter((turn): turn is TranscriptAskTurn => turn !== null)
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
    topicId: getString(session.topicId)?.trim() || undefined,
    tagIds: normalizeStringArray(session.tagIds),
    tokens: tokens && tokens.length > 0 ? tokens : undefined,
    speakers: speakers ?? [],
    segments: segments ?? [],
    sourceMeta: normalizeSourceMeta(session.sourceMeta),
    postProcess: normalizePostProcess(session.postProcess),
    askHistory: askHistory && askHistory.length > 0 ? askHistory : undefined,
    mindMap: normalizeMindMap(session.mindMap),
    correction: normalizeCorrection(session.correction),
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
