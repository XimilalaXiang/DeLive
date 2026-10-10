import type { TranscriptSegment, TranscriptSpeaker, TranscriptTokenData } from '../types'

/**
 * whisper.cpp server (examples/server) file transcription.
 *
 * The bundled whisper-server exposes POST /inference (multipart, field "file")
 * rather than the OpenAI /v1/audio/transcriptions route.
 */

export interface WhisperCppSegment {
  id?: number
  text: string
  start: number
  end: number
}

export interface WhisperCppVerboseResponse {
  text?: string
  language?: string
  duration?: number
  segments?: WhisperCppSegment[]
}

export interface WhisperCppFileOptions {
  /** Language code; omitted or empty means auto-detect. */
  language?: string
  prompt?: string
}

export async function transcribeFile(
  baseUrl: string,
  wav: Blob,
  options: WhisperCppFileOptions,
  signal?: AbortSignal,
): Promise<WhisperCppVerboseResponse> {
  const formData = new FormData()
  formData.append('file', wav, 'audio.wav')
  formData.append('response_format', 'verbose_json')
  // whisper-server defaults to English when no language is sent, which turns
  // other languages into translations; ask it to detect instead.
  formData.append('language', options.language?.trim() || 'auto')
  if (options.prompt) {
    formData.append('prompt', options.prompt)
  }

  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/inference`, {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`whisper.cpp error ${response.status}: ${errorText || response.statusText}`)
  }

  const result = await response.json() as WhisperCppVerboseResponse & { error?: string }
  if (typeof result.error === 'string' && result.error) {
    throw new Error(`whisper.cpp error: ${result.error}`)
  }
  return result
}

export interface WhisperCppFileResult {
  transcript: string
  tokens: TranscriptTokenData[]
  segments: TranscriptSegment[]
  speakers: TranscriptSpeaker[]
  durationMs: number
}

export function whisperCppResponseToResult(
  response: WhisperCppVerboseResponse,
  fallbackDurationMs: number,
): WhisperCppFileResult {
  const rawSegments = (response.segments ?? []).filter((seg) => typeof seg.text === 'string' && seg.text.trim())
  const transcript = (response.text ?? rawSegments.map((seg) => seg.text).join('')).trim()
  const durationMs = typeof response.duration === 'number' && response.duration > 0
    ? Math.round(response.duration * 1000)
    : fallbackDurationMs

  if (rawSegments.length === 0) {
    return {
      transcript,
      tokens: transcript ? [{ text: transcript, isFinal: true, startMs: 0, endMs: durationMs }] : [],
      segments: transcript ? [{ text: transcript, startMs: 0, endMs: durationMs, isFinal: true }] : [],
      speakers: [],
      durationMs,
    }
  }

  const segments: TranscriptSegment[] = rawSegments.map((seg) => ({
    text: seg.text.trim(),
    startMs: Math.round(seg.start * 1000),
    endMs: Math.round(seg.end * 1000),
    language: response.language,
    isFinal: true,
  }))
  const tokens: TranscriptTokenData[] = rawSegments.map((seg) => ({
    text: seg.text,
    isFinal: true,
    startMs: Math.round(seg.start * 1000),
    endMs: Math.round(seg.end * 1000),
    language: response.language,
  }))

  return { transcript, tokens, segments, speakers: [], durationMs }
}
