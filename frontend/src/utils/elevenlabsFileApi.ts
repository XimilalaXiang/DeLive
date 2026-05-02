const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'
const DEFAULT_MODEL = 'scribe_v2'

export interface ElevenLabsWord {
  text: string
  start: number | null
  end: number | null
  type: 'word' | 'spacing' | 'audio_event'
  speaker_id: string | null
  logprob: number
}

export interface ElevenLabsTranscriptionResponse {
  language_code: string
  language_probability: number
  text: string
  words: ElevenLabsWord[]
  audio_duration_secs?: number | null
  transcription_id?: string | null
}

export interface ElevenLabsTranscribeParams {
  modelId?: string
  languageCode?: string
  diarize?: boolean
  numSpeakers?: number
  tagAudioEvents?: boolean
  timestampsGranularity?: 'none' | 'word' | 'character'
}

export async function transcribeFile(
  apiKey: string,
  file: File,
  params: ElevenLabsTranscribeParams = {},
  signal?: AbortSignal,
): Promise<ElevenLabsTranscriptionResponse> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('model_id', params.modelId || DEFAULT_MODEL)

  if (params.languageCode) {
    formData.append('language_code', params.languageCode)
  }
  if (params.diarize) {
    formData.append('diarize', 'true')
  }
  if (params.numSpeakers != null) {
    formData.append('num_speakers', String(params.numSpeakers))
  }
  if (params.tagAudioEvents !== undefined) {
    formData.append('tag_audio_events', String(params.tagAudioEvents))
  }

  formData.append('timestamps_granularity', params.timestampsGranularity || 'word')

  const res = await fetch(`${ELEVENLABS_API_BASE}/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
    signal,
  })

  if (!res.ok) {
    let errorMsg = `ElevenLabs API error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.detail?.message || body.message || body.detail || errorMsg
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  return res.json()
}
