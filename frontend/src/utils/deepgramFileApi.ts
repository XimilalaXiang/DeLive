import { DEEPGRAM_DEFAULT_MODEL } from '../types/asr/vendors/deepgram'

const DEEPGRAM_API_BASE = 'https://api.deepgram.com'

export interface DeepgramFileWord {
  word: string
  start: number
  end: number
  confidence: number
  speaker?: number
  punctuated_word?: string
}

export interface DeepgramFileChannel {
  alternatives: Array<{
    transcript: string
    confidence: number
    words?: DeepgramFileWord[]
  }>
}

export interface DeepgramFileUtterance {
  start: number
  end: number
  confidence: number
  channel: number
  transcript: string
  words: DeepgramFileWord[]
  speaker?: number
  id: string
}

export interface DeepgramFileTranscriptionResponse {
  metadata: {
    request_id: string
    created: string
    duration: number
    channels: number
    models: string[]
    sha256: string
  }
  results: {
    channels: DeepgramFileChannel[]
    utterances?: DeepgramFileUtterance[]
  }
}

export interface DeepgramFileTranscribeParams {
  model?: string
  language?: string
  diarize?: boolean
  punctuate?: boolean
  utterances?: boolean
  smartFormat?: boolean
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const mimeMap: Record<string, string> = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    webm: 'audio/webm',
    aac: 'audio/aac',
    wma: 'audio/x-ms-wma',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
  }
  return mimeMap[ext ?? ''] ?? 'audio/wav'
}

export async function transcribeFile(
  apiKey: string,
  file: File,
  params: DeepgramFileTranscribeParams = {},
  signal?: AbortSignal,
): Promise<DeepgramFileTranscriptionResponse> {
  const queryParams = new URLSearchParams()
  queryParams.set('model', params.model || DEEPGRAM_DEFAULT_MODEL)
  queryParams.set('punctuate', String(params.punctuate ?? true))
  queryParams.set('utterances', String(params.utterances ?? true))
  queryParams.set('smart_format', String(params.smartFormat ?? true))

  if (params.language) {
    queryParams.set('language', params.language)
  } else {
    queryParams.set('detect_language', 'true')
  }

  if (params.diarize) {
    queryParams.set('diarize', 'true')
  }

  const arrayBuffer = await file.arrayBuffer()

  const res = await fetch(`${DEEPGRAM_API_BASE}/v1/listen?${queryParams.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': getMimeType(file.name),
    },
    body: arrayBuffer,
    signal,
  })

  if (!res.ok) {
    let errorMsg = `Deepgram API error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.err_msg || body.error || body.message || errorMsg
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  return res.json()
}
