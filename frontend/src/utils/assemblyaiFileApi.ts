const ASSEMBLYAI_API_BASE = 'https://api.assemblyai.com/v2'

/* ─── Response types ──────────────────────────────────────── */

export interface AssemblyAIWord {
  text: string
  start: number
  end: number
  confidence: number
  speaker: string | null
}

export interface AssemblyAIUtterance {
  confidence: number
  start: number
  end: number
  text: string
  words: AssemblyAIWord[]
  speaker: string
}

export interface AssemblyAITranscriptResponse {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  text: string | null
  words: AssemblyAIWord[] | null
  utterances: AssemblyAIUtterance[] | null
  audio_duration: number | null
  language_code: string | null
  error: string | null
}

export interface AssemblyAIUploadResponse {
  upload_url: string
}

export interface AssemblyAITranscribeParams {
  language_code?: string
  language_detection?: boolean
  speaker_labels?: boolean
  speakers_expected?: number
  speech_model?: string
}

/* ─── Upload file ─────────────────────────────────────────── */

export async function uploadFile(
  apiKey: string,
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  const buffer = await file.arrayBuffer()

  const res = await fetch(`${ASSEMBLYAI_API_BASE}/upload`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
    signal,
  })

  if (!res.ok) {
    let msg = `AssemblyAI upload failed (${res.status})`
    try {
      const body = await res.json()
      msg = body.error || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const data: AssemblyAIUploadResponse = await res.json()
  return data.upload_url
}

/* ─── Create transcription ────────────────────────────────── */

export async function createTranscription(
  apiKey: string,
  audioUrl: string,
  params: AssemblyAITranscribeParams = {},
  signal?: AbortSignal,
): Promise<string> {
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    punctuate: true,
    format_text: true,
  }

  if (params.language_code) {
    body.language_code = params.language_code
  } else {
    body.language_detection = true
  }

  if (params.speaker_labels) {
    body.speaker_labels = true
    if (params.speakers_expected) {
      body.speakers_expected = params.speakers_expected
    }
  }

  if (params.speech_model) {
    body.speech_model = params.speech_model
  }

  const res = await fetch(`${ASSEMBLYAI_API_BASE}/transcript`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    let msg = `AssemblyAI transcript creation failed (${res.status})`
    try {
      const errBody = await res.json()
      msg = errBody.error || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const data = await res.json()
  return data.id as string
}

/* ─── Poll for completion ─────────────────────────────────── */

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 600

export async function waitForCompletion(
  apiKey: string,
  transcriptId: string,
  signal?: AbortSignal,
  onProgress?: (status: string) => void,
): Promise<AssemblyAITranscriptResponse> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const res = await fetch(`${ASSEMBLYAI_API_BASE}/transcript/${transcriptId}`, {
      headers: { Authorization: apiKey },
      signal,
    })

    if (!res.ok) {
      let msg = `AssemblyAI poll failed (${res.status})`
      try {
        const errBody = await res.json()
        msg = errBody.error || msg
      } catch { /* ignore */ }
      throw new Error(msg)
    }

    const data: AssemblyAITranscriptResponse = await res.json()

    if (data.status === 'completed') return data
    if (data.status === 'error') {
      throw new Error(data.error || 'AssemblyAI transcription failed')
    }

    onProgress?.(data.status)

    await new Promise((resolve) => {
      const timer = setTimeout(resolve, POLL_INTERVAL_MS)
      signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(undefined) }, { once: true })
    })
  }

  throw new Error('AssemblyAI transcription timed out (polling exceeded maximum attempts)')
}
