/**
 * 60db STT Realtime ASR vendor-specific types.
 *
 * Docs: https://docs.60db.ai/api-reference/websocket/stt
 */

export const SIXTYDB_DEFAULT_MODEL = '60db-stt-v01'

// 60db supports these languages plus auto-detect. The "multi" entry is a
// placeholder for the auto-detect/multi-language session feature (up to 5
// languages per session) — when languages is omitted in the start message,
// 60db auto-detects.
export const SIXTYDB_SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'uk',
  'cs', 'sv', 'ar',
  'hi', 'bn', 'mr', 'pa', 'gu', 'ta', 'te', 'kn', 'ml', 'or',
  'as', 'ne', 'sa',
  'multi',
] as const

export type SixtydbSupportedLanguage = typeof SIXTYDB_SUPPORTED_LANGUAGES[number]

// Server-emitted transcription event (minimal shape that the proxy parses).
// The proxy normalizes 60db's two-phase finals into a single 'partial' /
// 'final' contract before forwarding to the client, so the provider doesn't
// need to see this directly — but the type is kept here for documentation.
export interface SixtydbTranscriptionEvent {
  type: 'transcription'
  text: string
  confidence?: number
  language?: string
  is_final?: boolean
  speech_final?: boolean
  sentence_id?: number
  words?: Array<{
    word: string
    start: number
    end: number
    confidence?: number
  }>
  speakers?: Array<{ speaker: string; start: number; end: number }>
}

export interface SixtydbSessionStartedEvent {
  type: 'session_started'
  session_id: string
  language?: string
  model?: string
}

export interface SixtydbErrorEvent {
  type: 'error'
  error: string
  error_code?: string
}

export type SixtydbServerEvent =
  | SixtydbTranscriptionEvent
  | SixtydbSessionStartedEvent
  | SixtydbErrorEvent
