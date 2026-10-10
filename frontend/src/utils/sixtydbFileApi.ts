import type { TranscriptSegment, TranscriptSpeaker, TranscriptTokenData } from '../types'

/**
 * 60db batch speech-to-text (REST), separate from the realtime WebSocket API.
 *
 * Docs: https://docs.60db.ai/api-reference/stt/speech-to-text
 */

export const SIXTYDB_STT_URL = 'https://api.60db.ai/stt'
/** Documented upload limit (the API also caps audio at 1 hour). */
export const SIXTYDB_MAX_FILE_BYTES = 10 * 1024 * 1024

export interface SixtydbSttWord {
  word: string
  start?: number
  end?: number
  confidence?: number
}

export interface SixtydbSttSegment {
  start: number
  end: number
  text: string
  language?: string | null
  confidence?: number
  words?: SixtydbSttWord[]
  /** Set on each segment when diarize=true. */
  speaker?: string
}

export interface SixtydbSpeakerTurn {
  speaker: string
  start: number
  end: number
}

export interface SixtydbSttResponse {
  request_id?: string
  language?: string | null
  duration_sec?: number
  text?: string
  segments?: SixtydbSttSegment[]
  words?: SixtydbSttWord[]
  /** Speaker turns for the whole file when diarize=true. */
  speakers?: SixtydbSpeakerTurn[]
  warning_codes?: string[]
}

export interface SixtydbFileOptions {
  /** Language hints; "multi" (the realtime auto-detect placeholder) is ignored. */
  languageHints?: string[]
  diarize?: boolean
}

export async function transcribeFile(
  apiKey: string,
  file: Blob,
  fileName: string,
  options: SixtydbFileOptions,
  signal?: AbortSignal,
): Promise<SixtydbSttResponse> {
  const formData = new FormData()
  formData.append('file', file, fileName)
  // Omitting language lets 60db auto-detect (recommended by its docs);
  // hints only narrow language identification.
  const languages = (options.languageHints ?? [])
    .map((lang) => lang.trim())
    .filter((lang) => lang && lang !== 'multi')
  if (languages.length > 0) {
    formData.append('languages', languages.join(','))
  }
  if (options.diarize) {
    formData.append('diarize', 'true')
  }

  const res = await fetch(SIXTYDB_STT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal,
  })

  if (!res.ok) {
    let errorMsg = `60db API error ${res.status}`
    try {
      const body = await res.json() as Record<string, unknown>
      const detail = body.detail ?? body.error ?? body.message
      if (typeof detail === 'string' && detail) {
        errorMsg = `${errorMsg}: ${detail}`
      } else if (detail && typeof detail === 'object') {
        errorMsg = `${errorMsg}: ${JSON.stringify(detail)}`
      }
    } catch { /* ignore parse errors */ }
    throw new Error(errorMsg)
  }

  return res.json() as Promise<SixtydbSttResponse>
}

function segmentSpeaker(segment: SixtydbSttSegment, turns: SixtydbSpeakerTurn[]): string | undefined {
  if (typeof segment.speaker === 'string' && segment.speaker) return segment.speaker
  // Fall back to the top-level turn that overlaps the segment the most.
  let best: { speaker: string; overlap: number } | undefined
  for (const turn of turns) {
    const overlap = Math.min(turn.end, segment.end) - Math.max(turn.start, segment.start)
    if (overlap > 0 && (!best || overlap > best.overlap)) best = { speaker: turn.speaker, overlap }
  }
  return best?.speaker
}

export function sixtydbResponseToResult(response: SixtydbSttResponse): {
  transcript: string
  tokens: TranscriptTokenData[]
  segments: TranscriptSegment[]
  speakers: TranscriptSpeaker[]
  durationMs: number
} {
  const rawSegments = (response.segments ?? []).filter((seg) => typeof seg.text === 'string' && seg.text.trim())
  const transcript = response.text?.trim() || rawSegments.map((seg) => seg.text.trim()).join(' ')
  const durationMs = Math.round((response.duration_sec ?? 0) * 1000)
    || Math.round((rawSegments[rawSegments.length - 1]?.end ?? 0) * 1000)

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
    speakerId: segmentSpeaker(seg, response.speakers ?? []),
    language: seg.language ?? response.language ?? undefined,
    isFinal: true,
  }))
  const tokens: TranscriptTokenData[] = segments.map((seg, index) => ({
    text: index === 0 ? seg.text : ` ${seg.text}`,
    isFinal: true,
    startMs: seg.startMs,
    endMs: seg.endMs,
    speaker: seg.speakerId,
    language: seg.language,
    confidence: rawSegments[index].confidence,
  }))
  const speakerIds = Array.from(new Set(segments.map((seg) => seg.speakerId).filter((id): id is string => !!id)))

  return {
    transcript,
    tokens,
    segments,
    speakers: speakerIds.map((id) => ({ id, label: id })),
    durationMs,
  }
}
