/**
 * 本地 OpenAI-compatible ASR 类型定义
 */

export interface LocalOpenAIProviderConfig {
  baseUrl: string
  model: string
  apiKey?: string
  languageHints?: string[]
  prompt?: string
}

export interface OpenAITranscriptionResponse {
  text?: string
}

export const LOCAL_OPENAI_DEFAULT_BASE_URL = 'http://127.0.0.1:11434'
export const LOCAL_OPENAI_DEFAULT_MODEL = 'whisper'
