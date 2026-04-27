export interface GroqProviderConfig {
  apiKey: string
  model?: string
  languageHints?: string[]
}

export interface GroqTranscriptionWord {
  word: string
  start: number
  end: number
}

export interface GroqTranscriptionResponse {
  text?: string
  words?: GroqTranscriptionWord[]
  segments?: Array<{ start: number; end: number; text: string }>
}

export const GROQ_DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1'
export const GROQ_DEFAULT_MODEL = 'whisper-large-v3-turbo'

export const GROQ_TRANSCRIPTION_MODELS = [
  {
    value: 'whisper-large-v3-turbo',
    label: 'whisper-large-v3-turbo',
  },
  {
    value: 'whisper-large-v3',
    label: 'whisper-large-v3',
  },
] as const
