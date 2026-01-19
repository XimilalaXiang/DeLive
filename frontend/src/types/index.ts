// Soniox API 相关类型
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

export interface SonioxResponse {
  tokens?: SonioxToken[]
  final_audio_proc_ms?: number
  total_audio_proc_ms?: number
  finished?: boolean
  error_code?: string
  error_message?: string
}

export interface SonioxConfig {
  api_key: string
  model: string
  audio_format: string
  language_hints?: string[]
  enable_language_identification?: boolean
  enable_speaker_diarization?: boolean
  enable_endpoint_detection?: boolean
}

// 转录会话类型
export interface TranscriptSession {
  id: string
  title: string
  date: string // YYYY-MM-DD 格式
  time: string // HH:mm 格式
  createdAt: number // 时间戳
  updatedAt: number
  transcript: string
  duration?: number // 毫秒
}

// 应用状态类型
export type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping'

export interface AppSettings {
  apiKey: string
  languageHints: string[]
}
