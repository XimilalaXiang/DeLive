import { useCallback, useRef } from 'react'
import { useFileTranscriptionStore } from '../stores/fileTranscriptionStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'
import { sessionRepository } from '../utils/sessionRepository'
import { createDraftSession } from '../utils/sessionLifecycle'
import { useUIStore } from '../stores/uiStore'
import type { FileTranscriptionConfig } from '../types/fileTranscription'
import type { TranscriptTokenData, TranscriptSegment, TranscriptSpeaker } from '../types'
import {
  uploadFile as sonioxUploadFile,
  createTranscription as sonioxCreateTranscription,
  waitForCompletion as sonioxWaitForCompletion,
  deleteTranscription as sonioxDeleteTranscription,
  deleteFile as sonioxDeleteFile,
  type SonioxTranscriptToken,
} from '../utils/sonioxAsyncApi'
import {
  transcribeFile as mistralTranscribeFile,
  type MistralTranscriptionSegment,
} from '../utils/mistralFileApi'
import {
  transcribeFile as groqTranscribeFile,
  type GroqTranscriptionWord,
  type GroqTranscriptionSegment as GroqSegment,
} from '../utils/groqFileApi'
import {
  transcribeFile as siliconflowTranscribeFile,
} from '../utils/siliconflowFileApi'
import {
  transcribeFile as cloudflareTranscribeFile,
} from '../utils/cloudflareFileApi'
import {
  uploadFile as gladiaUploadFile,
  createTranscription as gladiaCreateTranscription,
  waitForCompletion as gladiaWaitForCompletion,
  type GladiaUtterance,
} from '../utils/gladiaFileApi'
import {
  transcribeFile as elevenlabsTranscribeFile,
  type ElevenLabsWord,
} from '../utils/elevenlabsFileApi'
import {
  transcribeFile as deepgramTranscribeFile,
  type DeepgramFileWord,
  type DeepgramFileUtterance,
} from '../utils/deepgramFileApi'

/* ─── Soniox result conversion ──────────────────────────────── */

function sonioxTokenToStoredToken(t: SonioxTranscriptToken): TranscriptTokenData {
  return {
    text: t.text,
    isFinal: true,
    startMs: t.start_ms,
    endMs: t.end_ms,
    confidence: t.confidence,
    speaker: t.speaker,
    language: t.language,
  }
}

function buildSegmentsFromTokens(tokens: TranscriptTokenData[]): TranscriptSegment[] {
  if (tokens.length === 0) return []
  const segments: TranscriptSegment[] = []
  let currentSegment: TranscriptSegment = {
    text: '',
    startMs: tokens[0].startMs,
    speakerId: tokens[0].speaker,
    language: tokens[0].language,
    isFinal: true,
  }

  for (const token of tokens) {
    const speakerChanged = token.speaker && token.speaker !== currentSegment.speakerId
    if (speakerChanged && currentSegment.text.trim()) {
      segments.push({ ...currentSegment, text: currentSegment.text.trim() })
      currentSegment = {
        text: '',
        startMs: token.startMs,
        speakerId: token.speaker,
        language: token.language,
        isFinal: true,
      }
    }
    currentSegment.text += token.text
    currentSegment.endMs = token.endMs
  }

  if (currentSegment.text.trim()) {
    segments.push({ ...currentSegment, text: currentSegment.text.trim() })
  }
  return segments
}

function extractSpeakers(tokens: TranscriptTokenData[]): TranscriptSpeaker[] {
  const ids = new Set<string>()
  for (const t of tokens) {
    if (t.speaker) ids.add(t.speaker)
  }
  return Array.from(ids).map((id) => ({ id, label: id }))
}

/* ─── Mistral result conversion ─────────────────────────────── */

function mistralSegmentToStoredSegment(seg: MistralTranscriptionSegment): TranscriptSegment {
  return {
    text: seg.text.trim(),
    startMs: Math.round(seg.start * 1000),
    endMs: Math.round(seg.end * 1000),
    speakerId: seg.speaker_id,
    isFinal: true,
  }
}

function mistralSegmentsToTokens(segments: MistralTranscriptionSegment[]): TranscriptTokenData[] {
  return segments.map((seg) => ({
    text: seg.text,
    isFinal: true,
    startMs: Math.round(seg.start * 1000),
    endMs: Math.round(seg.end * 1000),
    speaker: seg.speaker_id,
  }))
}

function extractSpeakersFromMistral(segments: MistralTranscriptionSegment[]): TranscriptSpeaker[] {
  const ids = new Set<string>()
  for (const seg of segments) {
    if (seg.speaker_id) ids.add(seg.speaker_id)
  }
  return Array.from(ids).map((id) => ({ id, label: id }))
}

/* ─── Groq result conversion ───────────────────────────────── */

function groqWordsToTokens(words: GroqTranscriptionWord[]): TranscriptTokenData[] {
  return words.map((w) => ({
    text: w.word,
    isFinal: true,
    startMs: Math.round(w.start * 1000),
    endMs: Math.round(w.end * 1000),
  }))
}

function groqSegmentsToStoredSegments(segments: GroqSegment[]): TranscriptSegment[] {
  return segments.map((seg) => ({
    text: seg.text.trim(),
    startMs: Math.round(seg.start * 1000),
    endMs: Math.round(seg.end * 1000),
    isFinal: true,
  }))
}

/* ─── Provider execution pipelines ──────────────────────────── */

interface TranscriptionResult {
  transcript: string
  tokens: TranscriptTokenData[]
  segments: TranscriptSegment[]
  speakers: TranscriptSpeaker[]
  durationMs: number
}

async function executeSoniox(
  file: File,
  config: FileTranscriptionConfig,
  apiKey: string,
  jobId: string,
  updateJob: (id: string, u: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<TranscriptionResult> {
  updateJob(jobId, { status: 'uploading', progress: 10 })
  const fileInfo = await sonioxUploadFile(apiKey, file)
  const sonioxFileId = fileInfo.id
  updateJob(jobId, { sonioxFileId, status: 'uploading', progress: 30 })

  updateJob(jobId, { status: 'transcribing', progress: 40 })
  const transcription = await sonioxCreateTranscription(apiKey, {
    fileId: fileInfo.id,
    model: config.model || 'stt-async-v4',
    languageHints: config.languageHints,
    enableSpeakerDiarization: config.enableSpeakerDiarization,
    translation: config.translationEnabled && config.translationTargetLanguage
      ? { type: 'one_way', target_language: config.translationTargetLanguage }
      : undefined,
  })
  const sonioxTranscriptionId = transcription.id
  updateJob(jobId, { sonioxTranscriptionId, progress: 50 })

  const result = await sonioxWaitForCompletion(
    apiKey,
    transcription.id,
    (status, audioDurationMs) => {
      const progressMap: Record<string, number> = { queued: 50, processing: 70, completed: 100 }
      updateJob(jobId, { progress: progressMap[status] ?? 60, audioDurationMs })
    },
    signal,
  )

  const storedTokens = result.tokens.map(sonioxTokenToStoredToken)
  const transcript = storedTokens.map((t) => t.text).join('')
  const segments = buildSegmentsFromTokens(storedTokens)
  const speakers = extractSpeakers(storedTokens)
  const durationMs = storedTokens.length > 0 ? (storedTokens[storedTokens.length - 1].endMs ?? 0) : 0

  // Cleanup remote resources
  try {
    if (sonioxTranscriptionId) await sonioxDeleteTranscription(apiKey, sonioxTranscriptionId)
    if (sonioxFileId) await sonioxDeleteFile(apiKey, sonioxFileId)
  } catch (cleanupErr) {
    console.warn('[FileTranscription] Soniox cleanup failed:', cleanupErr)
  }

  return { transcript, tokens: storedTokens, segments, speakers, durationMs }
}

async function executeMistral(
  file: File,
  config: FileTranscriptionConfig,
  apiKey: string,
  jobId: string,
  updateJob: (id: string, u: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<TranscriptionResult> {
  updateJob(jobId, { status: 'uploading', progress: 20 })

  updateJob(jobId, { status: 'transcribing', progress: 40 })
  const response = await mistralTranscribeFile(
    apiKey,
    file,
    {
      model: config.model || 'voxtral-mini-latest',
      language: config.languageHints?.[0],
      diarize: config.enableSpeakerDiarization,
      timestampGranularities: ['segment'],
    },
    signal,
  )

  updateJob(jobId, { progress: 90 })

  const hasSegments = response.segments && response.segments.length > 0

  let tokens: TranscriptTokenData[]
  let segments: TranscriptSegment[]
  let speakers: TranscriptSpeaker[]

  if (hasSegments) {
    tokens = mistralSegmentsToTokens(response.segments)
    segments = response.segments.map(mistralSegmentToStoredSegment)
    speakers = extractSpeakersFromMistral(response.segments)
  } else {
    tokens = [{
      text: response.text,
      isFinal: true,
      startMs: 0,
      endMs: (response.usage?.prompt_audio_seconds ?? 0) * 1000,
    }]
    segments = [{
      text: response.text.trim(),
      startMs: 0,
      endMs: (response.usage?.prompt_audio_seconds ?? 0) * 1000,
      isFinal: true,
    }]
    speakers = []
  }

  const durationMs = (response.usage?.prompt_audio_seconds ?? 0) * 1000

  return {
    transcript: response.text,
    tokens,
    segments,
    speakers,
    durationMs,
  }
}

async function executeGroq(
  file: File,
  config: FileTranscriptionConfig,
  apiKey: string,
  jobId: string,
  updateJob: (id: string, u: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<TranscriptionResult> {
  updateJob(jobId, { status: 'uploading', progress: 20 })

  updateJob(jobId, { status: 'transcribing', progress: 40 })
  const response = await groqTranscribeFile(
    apiKey,
    file,
    {
      model: config.model || 'whisper-large-v3-turbo',
      language: config.languageHints?.[0],
      timestampGranularities: ['word', 'segment'],
    },
    signal,
  )

  updateJob(jobId, { progress: 90 })

  let tokens: TranscriptTokenData[]
  let segments: TranscriptSegment[]

  if (response.words && response.words.length > 0) {
    tokens = groqWordsToTokens(response.words)
  } else if (response.segments && response.segments.length > 0) {
    tokens = response.segments.map((seg) => ({
      text: seg.text,
      isFinal: true,
      startMs: Math.round(seg.start * 1000),
      endMs: Math.round(seg.end * 1000),
    }))
  } else {
    tokens = [{
      text: response.text,
      isFinal: true,
      startMs: 0,
      endMs: (response.duration ?? 0) * 1000,
    }]
  }

  if (response.segments && response.segments.length > 0) {
    segments = groqSegmentsToStoredSegments(response.segments)
  } else {
    segments = [{
      text: response.text.trim(),
      startMs: 0,
      endMs: (response.duration ?? 0) * 1000,
      isFinal: true,
    }]
  }

  const durationMs = (response.duration ?? 0) * 1000

  return {
    transcript: response.text,
    tokens,
    segments,
    speakers: [],
    durationMs,
  }
}

/* ─── ElevenLabs result conversion ─────────────────────────── */

function elevenlabsWordsToTokens(words: ElevenLabsWord[]): TranscriptTokenData[] {
  return words
    .filter((w) => w.type === 'word')
    .map((w) => ({
      text: w.text,
      isFinal: true,
      startMs: w.start != null ? Math.round(w.start * 1000) : 0,
      endMs: w.end != null ? Math.round(w.end * 1000) : 0,
      speaker: w.speaker_id ?? undefined,
    }))
}

function elevenlabsWordsToSegments(words: ElevenLabsWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  let current: TranscriptSegment | null = null

  for (const w of words) {
    if (w.type !== 'word') continue

    const speakerId = w.speaker_id ?? undefined
    const speakerChanged = current && speakerId !== current.speakerId

    if (!current || speakerChanged) {
      if (current && current.text.trim()) {
        segments.push({ ...current, text: current.text.trim() })
      }
      current = {
        text: '',
        startMs: w.start != null ? Math.round(w.start * 1000) : 0,
        speakerId,
        isFinal: true,
      }
    }

    current.text += w.text
    current.endMs = w.end != null ? Math.round(w.end * 1000) : undefined
  }

  if (current && current.text.trim()) {
    segments.push({ ...current, text: current.text.trim() })
  }

  return segments
}

function elevenlabsExtractSpeakers(words: ElevenLabsWord[]): TranscriptSpeaker[] {
  const ids = new Set<string>()
  for (const w of words) {
    if (w.speaker_id) ids.add(w.speaker_id)
  }
  return Array.from(ids).map((id) => ({ id, label: id }))
}

async function executeElevenLabs(
  file: File,
  config: FileTranscriptionConfig,
  apiKey: string,
  jobId: string,
  updateJob: (id: string, u: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<TranscriptionResult> {
  updateJob(jobId, { status: 'uploading', progress: 20 })

  updateJob(jobId, { status: 'transcribing', progress: 40 })
  const response = await elevenlabsTranscribeFile(
    apiKey,
    file,
    {
      modelId: 'scribe_v2',
      languageCode: config.languageHints?.[0],
      diarize: config.enableSpeakerDiarization,
      timestampsGranularity: 'word',
    },
    signal,
  )

  updateJob(jobId, { progress: 90 })

  const tokens = elevenlabsWordsToTokens(response.words)
  const segments = elevenlabsWordsToSegments(response.words)
  const speakers = elevenlabsExtractSpeakers(response.words)
  const durationMs = (response.audio_duration_secs ?? 0) * 1000

  return {
    transcript: response.text,
    tokens,
    segments,
    speakers,
    durationMs,
  }
}

async function executeSiliconFlow(
  file: File,
  config: FileTranscriptionConfig,
  apiKey: string,
  jobId: string,
  updateJob: (id: string, u: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<TranscriptionResult> {
  updateJob(jobId, { status: 'uploading', progress: 20 })

  updateJob(jobId, { status: 'transcribing', progress: 40 })
  const response = await siliconflowTranscribeFile(
    apiKey,
    file,
    {
      model: config.model || 'FunAudioLLM/SenseVoiceSmall',
      language: config.languageHints?.[0],
    },
    signal,
  )

  updateJob(jobId, { progress: 90 })

  const tokens: TranscriptTokenData[] = [{
    text: response.text,
    isFinal: true,
    startMs: 0,
    endMs: 0,
  }]

  const segments: TranscriptSegment[] = [{
    text: response.text.trim(),
    startMs: 0,
    endMs: 0,
    isFinal: true,
  }]

  return {
    transcript: response.text,
    tokens,
    segments,
    speakers: [],
    durationMs: 0,
  }
}

/* ─── Gladia result conversion ─────────────────────────────── */

function gladiaUtterancesToTokens(utterances: GladiaUtterance[]): TranscriptTokenData[] {
  const tokens: TranscriptTokenData[] = []
  for (const u of utterances) {
    if (u.words && u.words.length > 0) {
      for (const w of u.words) {
        tokens.push({
          text: w.word,
          isFinal: true,
          startMs: Math.round(w.start * 1000),
          endMs: Math.round(w.end * 1000),
          confidence: w.confidence,
          speaker: u.speaker != null ? `speaker_${u.speaker}` : undefined,
          language: u.language,
        })
      }
    } else {
      tokens.push({
        text: u.text,
        isFinal: true,
        startMs: Math.round(u.start * 1000),
        endMs: Math.round(u.end * 1000),
        confidence: u.confidence,
        speaker: u.speaker != null ? `speaker_${u.speaker}` : undefined,
        language: u.language,
      })
    }
  }
  return tokens
}

function gladiaUtterancesToSegments(utterances: GladiaUtterance[]): TranscriptSegment[] {
  return utterances.map((u) => ({
    text: u.text.trim(),
    startMs: Math.round(u.start * 1000),
    endMs: Math.round(u.end * 1000),
    speakerId: u.speaker != null ? `speaker_${u.speaker}` : undefined,
    language: u.language,
    isFinal: true,
  }))
}

function gladiaExtractSpeakers(utterances: GladiaUtterance[]): TranscriptSpeaker[] {
  const ids = new Set<string>()
  for (const u of utterances) {
    if (u.speaker != null) ids.add(`speaker_${u.speaker}`)
  }
  return Array.from(ids).map((id) => ({ id, label: id }))
}

async function executeGladia(
  file: File,
  config: FileTranscriptionConfig,
  apiKey: string,
  jobId: string,
  updateJob: (id: string, u: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<TranscriptionResult> {
  updateJob(jobId, { status: 'uploading', progress: 10 })
  const uploadResult = await gladiaUploadFile(apiKey, file, signal)
  updateJob(jobId, { progress: 30 })

  updateJob(jobId, { status: 'transcribing', progress: 40 })
  const job = await gladiaCreateTranscription(
    apiKey,
    uploadResult.audio_url,
    {
      languages: config.languageHints,
      diarization: config.enableSpeakerDiarization,
    },
    signal,
  )
  updateJob(jobId, { gladiaTranscriptionId: job.id, progress: 50 })

  const result = await gladiaWaitForCompletion(
    apiKey,
    job.id,
    (status, audioDurationMs) => {
      const progressMap: Record<string, number> = { queued: 50, processing: 70, completed: 100 }
      updateJob(jobId, { progress: progressMap[status] ?? 60, audioDurationMs })
    },
    signal,
  )

  console.debug('[FileTranscription] Gladia raw result:', JSON.stringify(result, null, 2))

  const utterances = result.result?.transcription?.utterances ?? []
  const fullTranscript = result.result?.transcription?.full_transcript ?? ''

  if (!fullTranscript && utterances.length === 0) {
    const debugInfo = result.result
      ? `metadata: ${JSON.stringify(result.result.metadata)}`
      : `result is ${result.result === null ? 'null' : 'undefined'}`
    throw new Error(`Gladia 返回了空的转录结果 (${debugInfo})。请检查音频文件是否包含可识别的语音。`)
  }

  const tokens = gladiaUtterancesToTokens(utterances)
  const segments = gladiaUtterancesToSegments(utterances)
  const speakers = gladiaExtractSpeakers(utterances)
  const durationMs = result.result?.metadata?.audio_duration
    ? result.result.metadata.audio_duration * 1000
    : (tokens.length > 0 ? (tokens[tokens.length - 1].endMs ?? 0) : 0)

  return {
    transcript: fullTranscript,
    tokens,
    segments,
    speakers,
    durationMs,
  }
}

async function executeCloudflare(
  file: File,
  config: FileTranscriptionConfig,
  apiToken: string,
  accountId: string,
  jobId: string,
  updateJob: (id: string, u: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<TranscriptionResult> {
  updateJob(jobId, { status: 'uploading', progress: 20 })

  updateJob(jobId, { status: 'transcribing', progress: 40 })
  const response = await cloudflareTranscribeFile(
    apiToken,
    accountId,
    file,
    {
      model: config.model,
      language: config.languageHints?.[0],
    },
    signal,
  )

  updateJob(jobId, { progress: 90 })

  let tokens: TranscriptTokenData[]
  let segments: TranscriptSegment[]

  if (response.words.length > 0) {
    tokens = response.words.map((w) => ({
      text: w.word,
      isFinal: true,
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
    }))
  } else {
    tokens = [{
      text: response.text,
      isFinal: true,
      startMs: 0,
      endMs: (response.duration ?? 0) * 1000,
    }]
  }

  if (response.segments.length > 0) {
    segments = response.segments.map((seg) => ({
      text: seg.text.trim(),
      startMs: Math.round(seg.start * 1000),
      endMs: Math.round(seg.end * 1000),
      isFinal: true,
    }))
  } else {
    segments = [{
      text: response.text.trim(),
      startMs: 0,
      endMs: (response.duration ?? 0) * 1000,
      isFinal: true,
    }]
  }

  const durationMs = (response.duration ?? 0) * 1000

  return {
    transcript: response.text,
    tokens,
    segments,
    speakers: [],
    durationMs,
  }
}

/* ─── Deepgram result conversion ───────────────────────────── */

function deepgramWordsToTokens(words: DeepgramFileWord[]): TranscriptTokenData[] {
  return words.map((w) => ({
    text: w.punctuated_word || w.word,
    isFinal: true,
    startMs: Math.round(w.start * 1000),
    endMs: Math.round(w.end * 1000),
    confidence: w.confidence,
    speaker: w.speaker != null ? String(w.speaker) : undefined,
  }))
}

function deepgramUtterancesToSegments(utterances: DeepgramFileUtterance[]): TranscriptSegment[] {
  return utterances.map((u) => ({
    text: u.transcript.trim(),
    startMs: Math.round(u.start * 1000),
    endMs: Math.round(u.end * 1000),
    isFinal: true,
    speaker: u.speaker != null ? String(u.speaker) : undefined,
  }))
}

function deepgramExtractSpeakers(utterances: DeepgramFileUtterance[]): TranscriptSpeaker[] {
  const ids = new Set<number>()
  for (const u of utterances) {
    if (u.speaker != null) ids.add(u.speaker)
  }
  return Array.from(ids)
    .sort((a, b) => a - b)
    .map((id) => ({ id: String(id), label: `Speaker ${id}` }))
}

async function executeDeepgram(
  file: File,
  config: FileTranscriptionConfig,
  apiKey: string,
  jobId: string,
  updateJob: (id: string, u: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<TranscriptionResult> {
  updateJob(jobId, { status: 'uploading', progress: 20 })

  updateJob(jobId, { status: 'transcribing', progress: 40 })
  const singleLang = config.languageHints?.length === 1 ? config.languageHints[0] : undefined
  const response = await deepgramTranscribeFile(
    apiKey,
    file,
    {
      model: config.model || 'nova-3',
      language: singleLang,
      diarize: config.enableSpeakerDiarization,
      punctuate: true,
      utterances: true,
      smartFormat: true,
    },
    signal,
  )

  updateJob(jobId, { progress: 90 })

  const channel = response.results.channels[0]
  const alt = channel?.alternatives[0]
  const transcript = alt?.transcript ?? ''
  const words = alt?.words ?? []
  const utterances = response.results.utterances ?? []

  const tokens = words.length > 0
    ? deepgramWordsToTokens(words)
    : [{ text: transcript, isFinal: true, startMs: 0, endMs: (response.metadata.duration ?? 0) * 1000 }]

  const segments = utterances.length > 0
    ? deepgramUtterancesToSegments(utterances)
    : [{ text: transcript.trim(), startMs: 0, endMs: (response.metadata.duration ?? 0) * 1000, isFinal: true }]

  const speakers = deepgramExtractSpeakers(utterances)
  const durationMs = (response.metadata.duration ?? 0) * 1000

  return {
    transcript,
    tokens,
    segments,
    speakers,
    durationMs,
  }
}

/* ─── Main hook ─────────────────────────────────────────────── */

export function useFileTranscription() {
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const { addJob, updateJob } = useFileTranscriptionStore()
  const jobs = useFileTranscriptionStore((s) => s.jobs)

  const submitFile = useCallback(async (file: File, config: FileTranscriptionConfig) => {
    const providerId = config.provider
    const providerConfig = useSettingsStore.getState().getProviderConfig(providerId)
    const apiKey = providerConfig?.apiKey as string | undefined

    if (providerId === 'cloudflare') {
      const apiToken = providerConfig?.apiToken as string | undefined
      const accountId = providerConfig?.accountId as string | undefined
      if (!apiToken || !accountId) {
        throw new Error('Cloudflare API Token 或 Account ID 未配置')
      }
    } else if (!apiKey) {
      throw new Error(`${providerId} API Key not configured`)
    }

    const jobId = addJob({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'audio/mpeg',
      provider: config.provider,
    })

    const controller = new AbortController()
    abortControllers.current.set(jobId, controller)

    ;(async () => {
      try {
        let result: TranscriptionResult

        if (providerId === 'groq') {
          result = await executeGroq(file, config, apiKey!, jobId, updateJob, controller.signal)
        } else if (providerId === 'mistral') {
          result = await executeMistral(file, config, apiKey!, jobId, updateJob, controller.signal)
        } else if (providerId === 'siliconflow') {
          result = await executeSiliconFlow(file, config, apiKey!, jobId, updateJob, controller.signal)
        } else if (providerId === 'cloudflare') {
          const apiToken = providerConfig?.apiToken as string
          const accountId = providerConfig?.accountId as string
          result = await executeCloudflare(file, config, apiToken, accountId, jobId, updateJob, controller.signal)
        } else if (providerId === 'gladia') {
          result = await executeGladia(file, config, apiKey!, jobId, updateJob, controller.signal)
        } else if (providerId === 'elevenlabs') {
          result = await executeElevenLabs(file, config, apiKey!, jobId, updateJob, controller.signal)
        } else if (providerId === 'deepgram') {
          result = await executeDeepgram(file, config, apiKey!, jobId, updateJob, controller.signal)
        } else {
          result = await executeSoniox(file, config, apiKey!, jobId, updateJob, controller.signal)
        }

        const now = Date.now()
        const session = createDraftSession({
          now,
          title: file.name.replace(/\.[^.]+$/, ''),
          providerId,
          sourceMeta: {
            captureMode: 'file',
            providerMode: 'unknown',
            platform: (window.electronAPI?.platform as 'win32' | 'darwin' | 'linux') || 'unknown',
          },
        })

        const completedSession = {
          ...session,
          transcript: result.transcript,
          tokens: result.tokens,
          segments: result.segments,
          speakers: result.speakers,
          duration: result.durationMs,
          status: 'completed' as const,
          updatedAt: now,
        }

        const currentSessions = useSessionStore.getState().sessions
        sessionRepository.replaceAllSessions([completedSession, ...currentSessions])
        useSessionStore.setState({ sessions: [completedSession, ...currentSessions] })

        updateJob(jobId, {
          status: 'completed',
          progress: 100,
          sessionId: session.id,
          completedAt: Date.now(),
          audioDurationMs: result.durationMs,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        if (message !== 'Transcription cancelled') {
          updateJob(jobId, { status: 'error', error: message })
        }
      } finally {
        abortControllers.current.delete(jobId)
      }
    })()

    return jobId
  }, [addJob, updateJob])

  const cancelJob = useCallback((jobId: string) => {
    const controller = abortControllers.current.get(jobId)
    if (controller) {
      controller.abort()
      abortControllers.current.delete(jobId)
    }
    updateJob(jobId, { status: 'cancelled' })
  }, [updateJob])

  const openResult = useCallback((jobId: string) => {
    const job = useFileTranscriptionStore.getState().getJob(jobId)
    if (job?.sessionId) {
      useUIStore.getState().openReview(job.sessionId)
    }
  }, [])

  return { jobs, submitFile, cancelJob, openResult }
}
