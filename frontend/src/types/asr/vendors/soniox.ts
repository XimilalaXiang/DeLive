/**
 * Soniox 特定类型定义
 * 保留原有的 Soniox API 类型，用于内部实现
 */

// Soniox Token 格式（原始 API 响应）
export interface SonioxToken {
  text: string
  start_ms?: number
  end_ms?: number
  confidence?: number
  is_final: boolean
  speaker?: string
  language?: string
  translation_status?: 'none' | 'original' | 'translation'
  source_language?: string
}

// Soniox API 响应格式
export interface SonioxResponse {
  tokens?: SonioxToken[]
  final_audio_proc_ms?: number
  total_audio_proc_ms?: number
  finished?: boolean
  error_code?: string
  error_message?: string
}

// Soniox WebSocket 配置
export interface SonioxConfig {
  api_key: string
  model: string
  audio_format: string
  sample_rate?: number
  num_channels?: number
  language_hints?: string[]
  language_hints_strict?: boolean
  enable_language_identification?: boolean
  enable_speaker_diarization?: boolean
  enable_endpoint_detection?: boolean
  max_endpoint_delay_ms?: number
  endpoint_sensitivity?: number
  endpoint_latency_adjustment_level?: number
  client_reference_id?: string
  context?: SonioxContext
  translation?: SonioxTranslationConfig
}

export type SonioxTranslationConfig =
  | { type: 'one_way'; target_language: string }
  | { type: 'two_way'; language_a: string; language_b: string }

export interface SonioxContext {
  general?: Array<{ key: string; value: string }>
  text?: string
  terms?: string[]
  translation_terms?: Array<{ source: string; target: string }>
}

// Soniox 提供商特定配置
export interface SonioxProviderConfig {
  apiKey: string
  languageHints?: string[]
  model?: string
  enableLanguageIdentification?: boolean
  enableSpeakerDiarization?: boolean
  enableEndpointDetection?: boolean
  endpointSensitivity?: number
  translationEnabled?: boolean
  translationMode?: 'one_way' | 'two_way'
  translationTargetLanguage?: string
  translationLanguageA?: string
  translationLanguageB?: string
}

// Soniox 常量
export const SONIOX_WEBSOCKET_URL = 'wss://stt-rt.soniox.com/transcribe-websocket'
export const SONIOX_DEFAULT_MODEL = 'stt-rt-v5'
