/**
 * AssemblyAI ASR 特定类型定义
 *
 * 实时流式仅支持 6 种语言 (Universal-3 Pro Streaming)
 * 文件转录支持 99+ 种语言 (Universal-2 / Best / Nano)
 */

export const ASSEMBLYAI_DEFAULT_MODEL = 'u3-rt-pro'

export const ASSEMBLYAI_SUPPORTED_LANGUAGES = [
  'en', 'en-US', 'en-GB', 'en-AU',
  'zh', 'ja', 'ko',
  'es', 'fr', 'de', 'pt', 'it',
  'ru', 'ar', 'hi', 'nl', 'pl', 'sv', 'da', 'fi', 'no',
  'tr', 'uk', 'cs', 'el', 'hu', 'ro', 'bg', 'sk', 'hr',
  'th', 'vi', 'id', 'ms', 'tl',
  'he', 'fa',
] as const

export type AssemblyAISupportedLanguage = typeof ASSEMBLYAI_SUPPORTED_LANGUAGES[number]

export interface AssemblyAIBeginEvent {
  type: 'Begin'
  id: string
  expires_at: number
}

export interface AssemblyAITurnEvent {
  type: 'Turn'
  transcript: string
  end_of_turn: boolean
  turn_order: number
}

export interface AssemblyAITerminationEvent {
  type: 'Termination'
  audio_duration_seconds: number
  session_duration_seconds: number
}

export interface AssemblyAIErrorEvent {
  type: 'Error'
  error: string
}

export type AssemblyAIServerEvent =
  | AssemblyAIBeginEvent
  | AssemblyAITurnEvent
  | AssemblyAITerminationEvent
  | AssemblyAIErrorEvent
