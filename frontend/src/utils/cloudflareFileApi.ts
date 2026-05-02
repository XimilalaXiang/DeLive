import {
  CLOUDFLARE_DEFAULT_MODEL,
  type CloudflareTranscriptionResponse,
} from '../types/asr/vendors/cloudflare'

/**
 * Cloudflare Workers AI has an undocumented payload size limit.
 * Community reports indicate failures starting around 2-4 MB of raw audio,
 * and base64 encoding inflates the payload by ~33%.
 * We cap at 2 MB raw (≈2.67 MB base64) to stay safely within the limit.
 */
export const CLOUDFLARE_MAX_FILE_BYTES = 2 * 1024 * 1024

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
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function transcribeFile(
  apiToken: string,
  accountId: string,
  file: File,
  params: CloudflareFileTranscribeParams = {},
  signal?: AbortSignal,
): Promise<CloudflareFileTranscriptionResponse> {
  if (file.size > CLOUDFLARE_MAX_FILE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    const limitMB = (CLOUDFLARE_MAX_FILE_BYTES / (1024 * 1024)).toFixed(0)
    throw new Error(
      `文件过大（${sizeMB} MB），Cloudflare Workers AI 限制约 ${limitMB} MB。` +
      '请选择 Groq、Gladia 或 ElevenLabs 等支持大文件的提供商。',
    )
  }

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
        const cfErr = errBody.errors[0] as { message?: string; code?: number }
        if (cfErr.code === 3006 || cfErr.code === 3010) {
          errorMsg = `请求体过大，请减小文件体积或选择其他提供商 (code ${cfErr.code})`
        } else if (cfErr.code === 6001) {
          errorMsg = '网络连接中断，文件可能过大，请减小文件体积或选择其他提供商'
        } else {
          errorMsg = cfErr.message || JSON.stringify(cfErr)
        }
      }
    } catch { /* ignore parse errors */ }
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
