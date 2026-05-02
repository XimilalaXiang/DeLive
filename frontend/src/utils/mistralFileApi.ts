const MISTRAL_API_BASE = 'https://api.mistral.ai/v1'
const DEFAULT_TRANSCRIPTION_MODEL = 'voxtral-mini-latest'

export interface MistralTranscriptionSegment {
  text: string
  start: number
  end: number
  speaker_id?: string
  type: string
}

export interface MistralTranscriptionResponse {
  model: string
  text: string
  language: string | null
  segments: MistralTranscriptionSegment[]
  usage: {
    prompt_audio_seconds: number
    prompt_tokens: number
    total_tokens: number
    completion_tokens: number
  }
}

export interface MistralTranscribeParams {
  model?: string
  language?: string
  diarize?: boolean
  timestampGranularities?: ('segment' | 'word')[]
  contextBias?: string[]
}

async function apiFetch<T>(
  apiKey: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${MISTRAL_API_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    let errorMsg = `Mistral API error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.message || body.detail || errorMsg
    } catch { /* ignore parse errors */ }
    throw new Error(errorMsg)
  }

  return res.json()
}

export async function transcribeFile(
  apiKey: string,
  file: File,
  params: MistralTranscribeParams = {},
  signal?: AbortSignal,
): Promise<MistralTranscriptionResponse> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('model', params.model || DEFAULT_TRANSCRIPTION_MODEL)

  if (params.language) {
    formData.append('language', params.language)
  }
  if (params.diarize) {
    formData.append('diarize', 'true')
  }
  if (params.timestampGranularities?.length) {
    for (const g of params.timestampGranularities) {
      formData.append('timestamp_granularities', g)
    }
  }
  if (params.contextBias?.length) {
    formData.append('context_bias', params.contextBias.join(','))
  }

  const url = `${MISTRAL_API_BASE}/audio/transcriptions`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal,
  })

  if (!res.ok) {
    let errorMsg = `Mistral API error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.message || body.detail || errorMsg
    } catch { /* ignore parse errors */ }
    throw new Error(errorMsg)
  }

  return res.json()
}

export async function uploadFileToMistral(
  apiKey: string,
  file: File,
): Promise<{ id: string; filename: string }> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('purpose', 'audio')

  return apiFetch<{ id: string; filename: string }>(apiKey, '/files', {
    method: 'POST',
    body: formData,
  })
}

export async function transcribeByFileId(
  apiKey: string,
  fileId: string,
  params: MistralTranscribeParams = {},
  signal?: AbortSignal,
): Promise<MistralTranscriptionResponse> {
  const body: Record<string, unknown> = {
    model: params.model || DEFAULT_TRANSCRIPTION_MODEL,
    file_id: fileId,
  }

  if (params.language) body.language = params.language
  if (params.diarize) body.diarize = true
  if (params.timestampGranularities?.length) {
    body.timestamp_granularities = params.timestampGranularities
  }
  if (params.contextBias?.length) {
    body.context_bias = params.contextBias
  }

  const url = `${MISTRAL_API_BASE}/audio/transcriptions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    let errorMsg = `Mistral API error ${res.status}`
    try {
      const errBody = await res.json()
      errorMsg = errBody.message || errBody.detail || errorMsg
    } catch { /* ignore parse errors */ }
    throw new Error(errorMsg)
  }

  return res.json()
}

export async function deleteFileFromMistral(
  apiKey: string,
  fileId: string,
): Promise<void> {
  await apiFetch<unknown>(apiKey, `/files/${fileId}`, { method: 'DELETE' })
}
