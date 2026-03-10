import type {
  CaptionDisplayMode,
  TranscriptPostProcess,
  TranscriptSourceMeta,
  TranscriptSpeaker,
  TranscriptTokenData,
  TranscriptTranslationData,
  TranscriptSegment,
} from '../types'
import type { TranscriptToken } from '../types/asr'
import { hasPostProcessContent, type TranscriptRuntimeState } from './transcriptState'

export interface TranscriptPersistenceSnapshot {
  transcript: string
  tokens?: TranscriptTokenData[]
  providerId?: string
  speakers?: TranscriptSpeaker[]
  segments?: TranscriptSegment[]
  sourceMeta?: TranscriptSourceMeta
  translatedTranscript?: TranscriptTranslationData
  postProcess?: TranscriptPostProcess
}

export function hasPersistenceSnapshotContent(snapshot: TranscriptPersistenceSnapshot): boolean {
  return Boolean(
    snapshot.transcript
    || snapshot.tokens?.length
    || snapshot.translatedTranscript?.text
    || hasPostProcessContent(snapshot.postProcess),
  )
}

export function mapTokensForStorage(tokens: TranscriptToken[]): TranscriptTokenData[] {
  return tokens.map((token) => ({
    text: token.text,
    isFinal: token.isFinal,
    startMs: token.startMs,
    endMs: token.endMs,
    speaker: token.speaker,
    language: token.language,
    confidence: token.confidence,
  }))
}

export function restoreStoredTokens(tokens: TranscriptTokenData[]): TranscriptToken[] {
  return tokens.map((token) => ({
    text: token.text,
    isFinal: token.isFinal !== false,
    startMs: token.startMs,
    endMs: token.endMs,
    speaker: token.speaker,
    language: token.language,
    confidence: token.confidence,
  }))
}

export function buildTranscriptFromState(
  finalTranscript: string,
  nonFinalTranscript: string,
  currentTranscript: string,
): string {
  return currentTranscript || finalTranscript || nonFinalTranscript
}

export function buildTranslatedTranscript(
  text: string,
  options: {
    displayMode: CaptionDisplayMode
    targetLanguage?: string
    updatedAt?: number
  },
): TranscriptTranslationData | undefined {
  const normalized = text.trim()
  if (!normalized) {
    return undefined
  }

  const mode: TranscriptTranslationData['mode'] = options.displayMode === 'dual'
    ? 'dual-line'
    : options.displayMode === 'translated'
      ? 'output-only'
      : 'inline'

  return {
    text: normalized,
    targetLanguage: options.targetLanguage,
    mode,
    updatedAt: options.updatedAt ?? Date.now(),
  }
}

export function buildSourceMeta(options: {
  providerId?: string
  providerMode?: TranscriptSourceMeta['providerMode']
  platform?: TranscriptSourceMeta['platform']
  captureMode?: TranscriptSourceMeta['captureMode']
}): TranscriptSourceMeta | undefined {
  if (!options.providerId) {
    return undefined
  }

  return {
    captureMode: options.captureMode ?? 'system-audio',
    platform: options.platform ?? 'unknown',
    providerMode: options.providerMode ?? 'unknown',
  }
}

export function buildSessionSnapshot(options: {
  runtimeState: TranscriptRuntimeState
  providerId?: string
  providerMode?: TranscriptSourceMeta['providerMode']
  platform?: TranscriptSourceMeta['platform']
  captureMode?: TranscriptSourceMeta['captureMode']
  translationTargetLanguage?: string
  captionDisplayMode?: CaptionDisplayMode
}): TranscriptPersistenceSnapshot {
  const {
    runtimeState,
    providerId,
    providerMode,
    platform,
    captureMode,
    translationTargetLanguage,
    captionDisplayMode = 'source',
  } = options

  const transcript = buildTranscriptFromState(
    runtimeState.finalTranscript,
    runtimeState.nonFinalTranscript,
    runtimeState.currentTranscript,
  )
  const translatedText = buildTranscriptFromState(
    runtimeState.finalTranslatedTranscript,
    runtimeState.nonFinalTranslatedTranscript,
    runtimeState.currentTranslatedTranscript,
  )

  return {
    transcript,
    translatedTranscript: buildTranslatedTranscript(translatedText, {
      displayMode: captionDisplayMode,
      targetLanguage: translationTargetLanguage,
    }),
    tokens: runtimeState.finalTokens.length > 0
      ? mapTokensForStorage(runtimeState.finalTokens)
      : undefined,
    providerId,
    speakers: runtimeState.currentSpeakers,
    segments: runtimeState.currentSegments,
    sourceMeta: buildSourceMeta({
      providerId,
      providerMode,
      platform,
      captureMode,
    }),
    postProcess: runtimeState.currentPostProcess,
  }
}
