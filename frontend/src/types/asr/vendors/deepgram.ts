/**
 * Deepgram ASR 特定类型定义
 */

export const DEEPGRAM_DEFAULT_MODEL = 'nova-3'

export const DEEPGRAM_SUPPORTED_LANGUAGES = [
  'zh', 'zh-CN', 'zh-TW', 'zh-HK',
  'en', 'en-US', 'en-GB', 'en-AU', 'en-IN',
  'es', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'ru',
  'hi', 'nl', 'pl', 'sv', 'tr', 'uk', 'vi',
  'ar', 'bg', 'ca', 'cs', 'da', 'el', 'et', 'fi',
  'hr', 'hu', 'id', 'lt', 'lv', 'mk', 'ms', 'no',
  'ro', 'sk', 'th',
  'multi',
] as const

export type DeepgramSupportedLanguage = typeof DEEPGRAM_SUPPORTED_LANGUAGES[number]

export interface DeepgramTranscriptResult {
  type: 'Results'
  channel_index: number[]
  duration: number
  start: number
  is_final: boolean
  channel: {
    alternatives: Array<{
      transcript: string
      confidence: number
      words?: Array<{
        word: string
        start: number
        end: number
        confidence: number
        speaker?: number
      }>
    }>
  }
}

export interface DeepgramMetadata {
  type: 'Metadata'
  transaction_key: string
  request_id: string
  sha256: string
  created: string
  duration: number
  channels: number
  models: string[]
  model_info: Record<string, unknown>
}

export interface DeepgramUtteranceEnd {
  type: 'UtteranceEnd'
}

export interface DeepgramSpeechStarted {
  type: 'SpeechStarted'
}

export type DeepgramServerEvent =
  | DeepgramTranscriptResult
  | DeepgramMetadata
  | DeepgramUtteranceEnd
  | DeepgramSpeechStarted
