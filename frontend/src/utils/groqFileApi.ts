import {
  GROQ_DEFAULT_BASE_URL,
  GROQ_DEFAULT_MODEL,
} from '../types/asr/vendors/groq'

export interface GroqTranscriptionWord {
  word: string
  start: number
  end: number
}

export interface GroqTranscriptionSegment {
  start: number
  end: number
  text: string
}

export interface GroqFileTranscriptionResponse {
  text: string
  language?: string
  duration?: number
  words?: GroqTranscriptionWord[]
  segments?: GroqTranscriptionSegment[]
}

export interface GroqFileTranscribeParams {
  model?: string
  language?: string
  prompt?: string
  responseFormat?: 'json' | 'verbose_json' | 'text' | 'srt' | 'vtt'
  timestampGranularities?: ('word' | 'segment')[]
  temperature?: number
}

export async function transcribeFile(
  apiKey: string,
  file: File,
  params: GroqFileTranscribeParams = {},
  signal?: AbortSignal,
): Promise<GroqFileTranscriptionResponse> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('model', params.model || GROQ_DEFAULT_MODEL)
  formData.append('response_format', params.responseFormat || 'verbose_json')

  if (params.language) {
    formData.append('language', params.language)
  }
  if (params.prompt) {
    formData.append('prompt', params.prompt)
  }
  if (params.temperature !== undefined) {
    formData.append('temperature', String(params.temperature))
  }

  const granularities = params.timestampGranularities ?? ['word', 'segment']
  for (const g of granularities) {
    formData.append('timestamp_granularities[]', g)
  }

  const url = `${GROQ_DEFAULT_BASE_URL}/audio/transcriptions`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal,
  })

  if (!res.ok) {
    let errorMsg = `Groq API error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.error?.message || body.message || body.detail || errorMsg
    } catch { /* ignore parse errors */ }
    throw new Error(errorMsg)
  }

  return res.json()
}
