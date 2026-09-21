/**
 * ElevenLabs Scribe v2 Realtime ASR 特定类型定义
 */

export const ELEVENLABS_DEFAULT_MODEL = 'scribe_v2_realtime'

export const ELEVENLABS_REALTIME_MODELS = [
  {
    value: 'scribe_v2_realtime',
    label: 'Scribe v2 Realtime',
  },
  {
    value: 'scribe_v2_realtime_turbo',
    label: 'Scribe v2 Realtime Turbo',
  },
  {
    value: 'scribe_v2_realtime_lite',
    label: 'Scribe v2 Realtime Lite',
  },
] as const

const ELEVENLABS_REALTIME_MODEL_VALUES = new Set(
  ELEVENLABS_REALTIME_MODELS.map((item) => item.value),
)

export function resolveElevenLabsRealtimeModel(value: unknown): string {
  if (typeof value !== 'string') {
    return ELEVENLABS_DEFAULT_MODEL
  }
  const trimmed = value.trim()
  if (!trimmed || !ELEVENLABS_REALTIME_MODEL_VALUES.has(trimmed)) {
    return ELEVENLABS_DEFAULT_MODEL
  }
  return trimmed
}

export const ELEVENLABS_SUPPORTED_LANGUAGES = [
  'zh', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'ru',
  'hi', 'nl', 'pl', 'sv', 'tr', 'uk', 'vi',
  'ar', 'bg', 'ca', 'cs', 'da', 'el', 'et', 'fi',
  'hr', 'hu', 'id', 'lt', 'lv', 'mk', 'ms', 'no',
  'ro', 'sk', 'sl', 'sr', 'th',
  'af', 'am', 'az', 'be', 'bn', 'bs', 'cy',
  'fil', 'gl', 'gu', 'ha', 'he', 'hy', 'is',
  'jv', 'ka', 'kk', 'km', 'kn', 'ku', 'ky',
  'lo', 'ml', 'mn', 'mr', 'my', 'ne', 'or',
  'pa', 'ps', 'sd', 'sn', 'so', 'sw', 'ta',
  'te', 'tg', 'ur', 'uz',
  'multi',
] as const

export type ElevenLabsSupportedLanguage = typeof ELEVENLABS_SUPPORTED_LANGUAGES[number]

export interface ElevenLabsPartialTranscript {
  type: 'partial_transcript'
  text: string
}

export interface ElevenLabsCommittedTranscript {
  type: 'committed_transcript'
  text: string
}

export interface ElevenLabsCommittedTranscriptWithTimestamps {
  type: 'committed_transcript_with_timestamps'
  text: string
  language_code?: string
  words?: Array<{
    text: string
    start: number
    end: number
    type: 'word' | 'spacing' | 'audio_event'
    speaker_id?: string
  }>
}

export type ElevenLabsServerEvent =
  | ElevenLabsPartialTranscript
  | ElevenLabsCommittedTranscript
  | ElevenLabsCommittedTranscriptWithTimestamps
