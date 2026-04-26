/**
 * Mistral AI ASR 特定类型定义
 */

export const MISTRAL_REALTIME_MODEL = 'voxtral-mini-transcribe-realtime-2602'

export const MISTRAL_SUPPORTED_LANGUAGES = [
  'en', 'zh', 'hi', 'es', 'ar', 'fr', 'pt', 'ru', 'de', 'ja', 'ko', 'it', 'nl',
] as const

export type MistralSupportedLanguage = typeof MISTRAL_SUPPORTED_LANGUAGES[number]

export interface MistralSessionCreated {
  type: 'session.created'
  session: {
    requestId: string
    audioFormat: string
  }
}

export interface MistralTextDelta {
  type: 'transcription.text.delta'
  text: string
}

export interface MistralTranscriptionDone {
  type: 'transcription.done'
  text?: string
}

export interface MistralRealtimeError {
  type: 'error'
  error: {
    code?: string
    message: string
  }
}

export type MistralRealtimeEvent =
  | MistralSessionCreated
  | MistralTextDelta
  | MistralTranscriptionDone
  | MistralRealtimeError
