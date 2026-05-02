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
  uploadFile,
  createTranscription,
  waitForCompletion,
  deleteTranscription,
  deleteFile,
  type SonioxTranscriptToken,
} from '../utils/sonioxAsyncApi'

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

export function useFileTranscription() {
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const { addJob, updateJob } = useFileTranscriptionStore()
  const jobs = useFileTranscriptionStore((s) => s.jobs)

  const submitFile = useCallback(async (file: File, config: FileTranscriptionConfig) => {
    const providerConfig = useSettingsStore.getState().getProviderConfig('soniox')
    const apiKey = providerConfig?.apiKey
    if (!apiKey) {
      throw new Error('Soniox API Key not configured')
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
      let sonioxFileId: string | undefined
      let sonioxTranscriptionId: string | undefined

      try {
        updateJob(jobId, { status: 'uploading', progress: 10 })
        const fileInfo = await uploadFile(apiKey, file)
        sonioxFileId = fileInfo.id
        updateJob(jobId, {
          sonioxFileId: fileInfo.id,
          status: 'uploading',
          progress: 30,
        })

        updateJob(jobId, { status: 'transcribing', progress: 40 })
        const transcription = await createTranscription(apiKey, {
          fileId: fileInfo.id,
          model: config.model || 'stt-async-v4',
          languageHints: config.languageHints,
          enableSpeakerDiarization: config.enableSpeakerDiarization,
          translation: config.translationEnabled && config.translationTargetLanguage
            ? { type: 'one_way', target_language: config.translationTargetLanguage }
            : undefined,
        })
        sonioxTranscriptionId = transcription.id
        updateJob(jobId, { sonioxTranscriptionId: transcription.id, progress: 50 })

        const result = await waitForCompletion(
          apiKey,
          transcription.id,
          (status, audioDurationMs) => {
            const progressMap: Record<string, number> = {
              queued: 50,
              processing: 70,
              completed: 100,
            }
            updateJob(jobId, {
              progress: progressMap[status] ?? 60,
              audioDurationMs,
            })
          },
          controller.signal,
        )

        const storedTokens = result.tokens.map(sonioxTokenToStoredToken)
        const transcript = storedTokens.map((t) => t.text).join('')
        const segments = buildSegmentsFromTokens(storedTokens)
        const speakers = extractSpeakers(storedTokens)
        const durationMs = storedTokens.length > 0
          ? (storedTokens[storedTokens.length - 1].endMs ?? 0)
          : 0

        const now = Date.now()
        const session = createDraftSession({
          now,
          title: file.name.replace(/\.[^.]+$/, ''),
          providerId: 'soniox',
          sourceMeta: {
            captureMode: 'file',
            providerMode: 'unknown',
            platform: (window.electronAPI?.platform as 'win32' | 'darwin' | 'linux') || 'unknown',
          },
        })

        const completedSession = {
          ...session,
          transcript,
          tokens: storedTokens,
          segments,
          speakers,
          duration: durationMs,
          status: 'completed' as const,
          updatedAt: now,
        }

        const currentSessions = useSessionStore.getState().sessions
        sessionRepository.replaceAllSessions([completedSession, ...currentSessions])
        useSessionStore.setState({
          sessions: [completedSession, ...currentSessions],
        })

        updateJob(jobId, {
          status: 'completed',
          progress: 100,
          sessionId: session.id,
          completedAt: Date.now(),
        })

        // Cleanup remote resources
        try {
          if (sonioxTranscriptionId) await deleteTranscription(apiKey, sonioxTranscriptionId)
          if (sonioxFileId) await deleteFile(apiKey, sonioxFileId)
        } catch (cleanupErr) {
          console.warn('[FileTranscription] Cleanup failed:', cleanupErr)
        }
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
