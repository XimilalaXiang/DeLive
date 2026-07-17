/**
 * FunASR / SenseVoice 本地 ASR vendor 类型定义
 *
 * FunASR 提供 OpenAI 兼容的 /v1/audio/transcriptions 接口，
 * 支持多种模型（SenseVoice、Paraformer、Fun-ASR-Nano）。
 *
 * Docs: https://github.com/modelscope/FunASR
 */

export const SENSEVOICE_DEFAULT_BASE_URL = 'http://127.0.0.1:8000'
export const SENSEVOICE_DEFAULT_MODEL = 'sensevoice'

export const SENSEVOICE_MODEL_OPTIONS = [
  { value: 'sensevoice', label: 'SenseVoice — 多语言 + 情感/音频事件检测' },
  { value: 'paraformer', label: 'Paraformer — 中文生产级转录（含 VAD + 标点）' },
  { value: 'paraformer-en', label: 'Paraformer-EN — 英语专用' },
  { value: 'fun-asr-nano', label: 'Fun-ASR-Nano — 31 语言 LLM-based ASR' },
] as const

export const SENSEVOICE_SUPPORTED_LANGUAGES = [
  'zh', 'en', 'ja', 'ko', 'yue',
] as const

export type SenseVoiceSupportedLanguage = typeof SENSEVOICE_SUPPORTED_LANGUAGES[number]

export interface SenseVoiceTranscriptionResponse {
  text?: string
  segments?: Array<{
    text: string
    start?: number
    end?: number
    language?: string
    emotion?: string
    event?: string
  }>
}

export interface SenseVoiceHealthResponse {
  status: string
  device?: string
  models?: string[]
}

export interface SenseVoiceModelEntry {
  id: string
  ready?: boolean
}

export interface SenseVoiceModelsResponse {
  data: SenseVoiceModelEntry[]
}
