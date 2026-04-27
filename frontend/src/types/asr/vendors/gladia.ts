/**
 * Gladia ASR 特定类型定义
 */

export const GLADIA_DEFAULT_MODEL = 'solaria-1'

export const GLADIA_SUPPORTED_LANGUAGES = [
  'zh', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'ru',
  'hi', 'nl', 'pl', 'sv', 'tr', 'uk', 'vi',
  'ar', 'bg', 'ca', 'cs', 'da', 'el', 'et', 'fi',
  'hr', 'hu', 'id', 'lt', 'lv', 'mk', 'ms', 'no',
  'ro', 'sk', 'sl', 'sr', 'th',
  'af', 'am', 'az', 'be', 'bn', 'bs', 'br',
  'cy', 'eu', 'fo', 'gl', 'gu', 'ha',
  'he', 'hy', 'is', 'ka', 'kk', 'km', 'kn',
  'la', 'lo', 'lb', 'ln', 'ml', 'mn', 'mr', 'my',
  'ne', 'oc', 'pa', 'ps', 'fa', 'sa', 'sd',
  'si', 'sn', 'so', 'sq', 'su', 'sw',
  'ta', 'tt', 'te', 'tg', 'bo', 'tk',
  'ur', 'uz', 'wo', 'yi', 'yo',
  'multi',
] as const

export type GladiaSupportedLanguage = typeof GLADIA_SUPPORTED_LANGUAGES[number]

export interface GladiaSessionInitResponse {
  id: string
  created_at: string
  url: string
}

export interface GladiaPartialTranscript {
  type: 'transcript'
  transcription: string
  language?: string
  is_final: false
}

export interface GladiaFinalTranscript {
  type: 'transcript'
  transcription: string
  language?: string
  is_final: true
  duration?: number
  time_begin?: number
  time_end?: number
}

export type GladiaServerEvent =
  | GladiaPartialTranscript
  | GladiaFinalTranscript
