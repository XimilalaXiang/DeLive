import {
  CLOUDFLARE_DEFAULT_MODEL,
  type CloudflareTranscriptionResponse,
} from '../types/asr/vendors/cloudflare'

export interface CloudflareFileTranscriptionResponse {
  text: string
  segments: { start: number; end: number; text: string }[]
  words: { word: string; start: number; end: number }[]
  language?: string
  duration?: number
}

export interface CloudflareFileTranscribeParams {
  model?: string
  language?: string
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, offset + chunkSize)
    let binary = ''
    for (const byte of slice) {
      binary += String.fromCharCode(byte)
    }
    chunks.push(binary)
  }
  return btoa(chunks.join(''))
}

export async function transcribeFile(
  apiToken: string,
  accountId: string,
  file: File,
  params: CloudflareFileTranscribeParams = {},
  signal?: AbortSignal,
): Promise<CloudflareFileTranscriptionResponse> {
  const model = params.model || CLOUDFLARE_DEFAULT_MODEL
  const arrayBuffer = await file.arrayBuffer()
  const base64 = arrayBufferToBase64(arrayBuffer)

  const body: Record<string, unknown> = {
    audio: base64,
    vad_filter: true,
    condition_on_previous_text: false,
    hallucination_silence_threshold: 1,
  }

  if (params.language) {
    body.language = params.language
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    let errorMsg = `Cloudflare API error ${res.status}`
    try {
      const errBody = await res.json()
      if (Array.isArray(errBody.errors) && errBody.errors.length > 0) {
        errorMsg = JSON.stringify(errBody.errors[0])
      }
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  const result = (await res.json()) as CloudflareTranscriptionResponse
  if (!result.success) {
    const errorMsg = Array.isArray(result.errors) && result.errors.length > 0
      ? JSON.stringify(result.errors[0])
      : 'Unknown Cloudflare API error'
    throw new Error(errorMsg)
  }

  const words: { word: string; start: number; end: number }[] = []
  const segments: { start: number; end: number; text: string }[] = []

  if (result.result?.segments && result.result.segments.length > 0) {
    for (const seg of result.result.segments) {
      segments.push({ start: seg.start, end: seg.end, text: seg.text })
      if (seg.words) {
        for (const w of seg.words) {
          words.push(w)
        }
      }
    }
  }

  if (words.length === 0 && result.result?.words) {
    for (const w of result.result.words) {
      words.push(w)
    }
  }

  return {
    text: result.result?.text ?? '',
    segments,
    words,
    language: result.result?.transcription_info?.language,
    duration: result.result?.transcription_info?.duration,
  }
}
