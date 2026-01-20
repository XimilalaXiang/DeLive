/**
 * 通用 ASR 类型定义
 * 定义了所有 ASR 提供商共享的基础类型
 */

// ASR 提供商枚举（仅流式提供商）
export enum ASRVendor {
  Soniox = 'soniox',
  Volc = 'volc',
}

// 提供商类型：云端或本地
export type ProviderType = 'cloud' | 'local'

// 提供商信息
export interface ASRProviderInfo {
  id: ASRVendor
  name: string
  description: string
  type: ProviderType
  supportsStreaming: boolean
  supportedLanguages: string[]
  website: string
  docsUrl?: string
  // 配置字段定义
  configFields: ProviderConfigField[]
}

// 配置字段类型
export interface ProviderConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'select' | 'multiselect' | 'number' | 'boolean'
  required: boolean
  placeholder?: string
  description?: string
  options?: { value: string; label: string }[]
  defaultValue?: string | number | boolean | string[]
}

// 通用转录 Token（统一格式）
export interface TranscriptToken {
  text: string
  isFinal: boolean
  startMs?: number
  endMs?: number
  confidence?: number
  language?: string
  speaker?: string
}

// 通用转录响应
export interface TranscriptResponse {
  tokens: TranscriptToken[]
  finished: boolean
  totalAudioMs?: number
  error?: ASRError
}

// ASR 错误类型
export interface ASRError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// 提供商配置（通用基础）
export interface BaseProviderConfig {
  apiKey: string
  languageHints?: string[]
}

// 提供商状态
export type ProviderState = 'idle' | 'connecting' | 'connected' | 'recording' | 'processing' | 'error'

// ASR 事件回调
export interface ASREventCallbacks {
  onToken?: (token: TranscriptToken) => void
  onTokens?: (tokens: TranscriptToken[]) => void
  onPartial?: (text: string) => void
  onFinal?: (text: string) => void
  onError?: (error: ASRError) => void
  onStateChange?: (state: ProviderState) => void
  onFinished?: () => void
}
