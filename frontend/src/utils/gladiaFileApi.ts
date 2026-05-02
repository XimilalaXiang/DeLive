const GLADIA_API_BASE = 'https://api.gladia.io'

export interface GladiaUploadResponse {
  audio_url: string
  audio_metadata: {
    id: string
    filename: string
    extension: string
    size: number
    audio_duration: number
    number_of_channels: number
  }
}

export interface GladiaWord {
  word: string
  start: number
  end: number
  confidence: number
}

export interface GladiaUtterance {
  text: string
  language: string
  start: number
  end: number
  confidence: number
  channel: number
  speaker?: number
  words: GladiaWord[]
}

export interface GladiaTranscriptionResult {
  full_transcript: string
  languages: string[]
  utterances: GladiaUtterance[]
}

export interface GladiaJobResult {
  id: string
  status: 'queued' | 'processing' | 'done' | 'error'
  result?: {
    metadata?: {
      audio_duration?: number
      number_of_distinct_channels?: number
      transcription_time?: number
      billing_time?: number
    }
    transcription?: GladiaTranscriptionResult
  }
  error?: { message?: string }
}

export interface GladiaTranscribeParams {
  languages?: string[]
  diarization?: boolean
  diarizationConfig?: {
    numberOfSpeakers?: number
    minSpeakers?: number
    maxSpeakers?: number
  }
}

export async function uploadFile(
  apiKey: string,
  file: File,
  signal?: AbortSignal,
): Promise<GladiaUploadResponse> {
  const formData = new FormData()
  formData.append('audio', file, file.name)

  const res = await fetch(`${GLADIA_API_BASE}/v2/upload`, {
    method: 'POST',
    headers: { 'x-gladia-key': apiKey },
    body: formData,
    signal,
  })

  if (!res.ok) {
    let errorMsg = `Gladia upload error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.message || errorMsg
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  return res.json()
}

export async function createTranscription(
  apiKey: string,
  audioUrl: string,
  params: GladiaTranscribeParams = {},
  signal?: AbortSignal,
): Promise<{ id: string; result_url: string }> {
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
  }

  if (params.languages?.length) {
    body.language_config = {
      languages: params.languages,
      code_switching: false,
    }
  }

  if (params.diarization) {
    body.diarization = true
    if (params.diarizationConfig) {
      const dc: Record<string, unknown> = {}
      if (params.diarizationConfig.numberOfSpeakers != null) {
        dc.number_of_speakers = params.diarizationConfig.numberOfSpeakers
      }
      if (params.diarizationConfig.minSpeakers != null) {
        dc.min_speakers = params.diarizationConfig.minSpeakers
      }
      if (params.diarizationConfig.maxSpeakers != null) {
        dc.max_speakers = params.diarizationConfig.maxSpeakers
      }
      body.diarization_config = dc
    }
  }

  const res = await fetch(`${GLADIA_API_BASE}/v2/pre-recorded`, {
    method: 'POST',
    headers: {
      'x-gladia-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    let errorMsg = `Gladia transcription error ${res.status}`
    try {
      const errBody = await res.json()
      errorMsg = errBody.message || errorMsg
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  return res.json()
}

export async function getTranscriptionResult(
  apiKey: string,
  transcriptionId: string,
  signal?: AbortSignal,
): Promise<GladiaJobResult> {
  const res = await fetch(`${GLADIA_API_BASE}/v2/pre-recorded/${transcriptionId}`, {
    method: 'GET',
    headers: { 'x-gladia-key': apiKey },
    signal,
  })

  if (!res.ok) {
    let errorMsg = `Gladia result error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.message || errorMsg
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  return res.json()
}

export async function waitForCompletion(
  apiKey: string,
  transcriptionId: string,
  onProgress?: (status: string, audioDurationMs?: number) => void,
  signal?: AbortSignal,
): Promise<GladiaJobResult> {
  const pollIntervalMs = 3000
  const maxAttempts = 200

  for (let i = 0; i < maxAttempts; i++) {
    if (signal?.aborted) {
      throw new Error('Transcription cancelled')
    }

    const result = await getTranscriptionResult(apiKey, transcriptionId, signal)
    console.debug(`[Gladia] Poll #${i + 1} status=${result.status}`)

    if (result.status === 'done') {
      const audioDurationMs = result.result?.metadata?.audio_duration
        ? result.result.metadata.audio_duration * 1000
        : undefined
      onProgress?.('completed', audioDurationMs)
      return result
    }

    if (result.status === 'error') {
      const errDetail = result.error?.message || JSON.stringify(result.error) || 'unknown error'
      throw new Error(`Gladia transcription failed: ${errDetail}`)
    }

    onProgress?.(result.status)

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error('Gladia transcription timed out')
}
