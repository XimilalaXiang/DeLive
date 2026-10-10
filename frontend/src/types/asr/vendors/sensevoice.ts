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
  { value: 'fun-asr-nano', label: 'Fun-ASR-Nano — 31 语言 LLM-based ASR' },
] as const

/**
 * funasr-server only accepts the model names above (plus "custom" when it is
 * started with --model-path). Earlier versions offered "paraformer-en", which
 * the server rejects with HTTP 400; map it to the multilingual default.
 */
const SENSEVOICE_LEGACY_MODEL_ALIASES: Record<string, string> = {
  'paraformer-en': SENSEVOICE_DEFAULT_MODEL,
}

export function resolveSenseVoiceModel(value: unknown): string {
  if (typeof value !== 'string') return SENSEVOICE_DEFAULT_MODEL
  const trimmed = value.trim()
  if (!trimmed) return SENSEVOICE_DEFAULT_MODEL
  return SENSEVOICE_LEGACY_MODEL_ALIASES[trimmed] ?? trimmed
}

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
