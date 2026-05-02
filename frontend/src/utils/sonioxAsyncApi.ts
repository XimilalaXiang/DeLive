const SONIOX_API_BASE = 'https://api.soniox.com/v1'
const DEFAULT_ASYNC_MODEL = 'stt-async-v4'
const POLL_INTERVAL_MS = 3000

export interface SonioxFileInfo {
  id: string
  filename: string
  size: number
  created_at: string
}

export interface SonioxTranscriptionInfo {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  created_at: string
  model: string
  audio_url: string | null
  file_id: string | null
  filename: string
  audio_duration_ms: number
  error_message: string | null
}

export interface SonioxTranscriptToken {
  text: string
  start_ms: number
  end_ms: number
  confidence: number
  speaker?: string
  language?: string
  is_final?: boolean
}

export interface SonioxTranscriptResult {
  tokens: SonioxTranscriptToken[]
  text?: string
}

export interface SonioxCreateTranscriptionParams {
  fileId?: string
  audioUrl?: string
  model?: string
  languageHints?: string[]
  translation?: { type: 'one_way'; target_language: string }
  enableSpeakerDiarization?: boolean
  context?: string
}

async function apiFetch<T>(
  apiKey: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${SONIOX_API_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    let errorMsg = `Soniox API error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.error?.message || body.detail || errorMsg
    } catch { /* ignore parse errors */ }
    throw new Error(errorMsg)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export async function uploadFile(
  apiKey: string,
  file: File,
): Promise<SonioxFileInfo> {
  const formData = new FormData()
  formData.append('file', file)

  return apiFetch<SonioxFileInfo>(apiKey, '/files', {
    method: 'POST',
    body: formData,
  })
}

export async function deleteFile(
  apiKey: string,
  fileId: string,
): Promise<void> {
  await apiFetch<void>(apiKey, `/files/${fileId}`, { method: 'DELETE' })
}

export async function createTranscription(
  apiKey: string,
  params: SonioxCreateTranscriptionParams,
): Promise<SonioxTranscriptionInfo> {
  const body: Record<string, unknown> = {
    model: params.model || DEFAULT_ASYNC_MODEL,
  }

  if (params.fileId) body.file_id = params.fileId
  if (params.audioUrl) body.audio_url = params.audioUrl
  if (params.languageHints?.length) body.language_hints = params.languageHints
  if (params.enableSpeakerDiarization) body.enable_speaker_diarization = true
  if (params.translation) body.translation = params.translation
  if (params.context) body.context = params.context

  return apiFetch<SonioxTranscriptionInfo>(apiKey, '/transcriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function getTranscription(
  apiKey: string,
  transcriptionId: string,
): Promise<SonioxTranscriptionInfo> {
  return apiFetch<SonioxTranscriptionInfo>(apiKey, `/transcriptions/${transcriptionId}`)
}

export async function getTranscript(
  apiKey: string,
  transcriptionId: string,
): Promise<SonioxTranscriptResult> {
  return apiFetch<SonioxTranscriptResult>(apiKey, `/transcriptions/${transcriptionId}/transcript`)
}

export async function deleteTranscription(
  apiKey: string,
  transcriptionId: string,
): Promise<void> {
  await apiFetch<void>(apiKey, `/transcriptions/${transcriptionId}`, { method: 'DELETE' })
}

export async function waitForCompletion(
  apiKey: string,
  transcriptionId: string,
  onStatusChange?: (status: string, audioDurationMs?: number) => void,
  signal?: AbortSignal,
): Promise<SonioxTranscriptResult> {
  while (true) {
    if (signal?.aborted) throw new Error('Transcription cancelled')

    const info = await getTranscription(apiKey, transcriptionId)
    onStatusChange?.(info.status, info.audio_duration_ms)

    if (info.status === 'completed') {
      return getTranscript(apiKey, transcriptionId)
    }

    if (info.status === 'error') {
      throw new Error(info.error_message || 'Soniox transcription failed')
    }

    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, POLL_INTERVAL_MS)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new Error('Transcription cancelled'))
      }, { once: true })
    })
  }
}
