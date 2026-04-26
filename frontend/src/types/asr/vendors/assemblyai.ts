/**
 * AssemblyAI Streaming ASR 特定类型定义
 */

export const ASSEMBLYAI_DEFAULT_MODEL = 'u3-rt-pro'

export const ASSEMBLYAI_SUPPORTED_LANGUAGES = [
  'en', 'en-US', 'en-GB', 'en-AU',
  'es', 'fr', 'de', 'pt', 'it',
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
