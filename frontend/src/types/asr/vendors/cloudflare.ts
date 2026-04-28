export interface CloudflareProviderConfig {
  apiToken: string
  accountId: string
  model?: string
  languageHints?: string[]
}

export interface CloudflareTranscriptionResponse {
  result: {
    text?: string
    word_count?: number
    words?: Array<{ word: string; start: number; end: number }>
    vtt?: string
  segments?: Array<{
    start: number
    end: number
    text: string
    words?: Array<{ word: string; start: number; end: number }>
  }>
    transcription_info?: {
      language?: string
      language_probability?: number
      duration?: number
    }
  }
  success: boolean
  errors: unknown[]
  messages: unknown[]
}

export const CLOUDFLARE_DEFAULT_MODEL = '@cf/openai/whisper-large-v3-turbo'

export const CLOUDFLARE_TRANSCRIPTION_MODELS = [
  {
    value: '@cf/openai/whisper-large-v3-turbo',
    label: 'Whisper Large V3 Turbo (推荐)',
  },
  {
    value: '@cf/openai/whisper',
    label: 'Whisper (经典版)',
  },
  {
    value: '@cf/openai/whisper-tiny-en',
    label: 'Whisper Tiny (仅英语)',
  },
] as const
