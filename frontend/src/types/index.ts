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

// 标签类型
export interface Tag {
  id: string
  name: string
  color: string // 标签颜色 (tailwind color class)
}

// 预设标签颜色
export const TAG_COLORS = [
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  { name: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
] as const

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
  tagIds?: string[] // 关联的标签ID列表
}

// 应用状态类型
export type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping'

export interface AppSettings {
  apiKey: string
  languageHints: string[]
}
