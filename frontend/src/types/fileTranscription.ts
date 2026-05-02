import type { ASRVendor } from './asr/common'

export type FileTranscriptionJobStatus =
  | 'queued'
  | 'uploading'
  | 'transcribing'
  | 'completed'
  | 'error'
  | 'cancelled'

export interface FileTranscriptionJob {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  status: FileTranscriptionJobStatus
  progress: number
  provider: ASRVendor
  /** Soniox-specific remote file ID */
  sonioxFileId?: string
  /** Soniox-specific remote transcription ID */
  sonioxTranscriptionId?: string
  /** Mistral-specific uploaded file ID (for large-file workflow) */
  mistralFileId?: string
  sessionId?: string
  error?: string
  createdAt: number
  completedAt?: number
  audioDurationMs?: number
}

export interface FileTranscriptionConfig {
  provider: ASRVendor
  languageHints?: string[]
  translationEnabled?: boolean
  translationTargetLanguage?: string
  enableSpeakerDiarization?: boolean
  model?: string
}

export const ACCEPTED_AUDIO_EXTENSIONS = [
  '.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm', '.opus',
  '.mp4', '.mpeg', '.mpga', '.aac', '.wma',
] as const

export const ACCEPTED_AUDIO_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/flac',
  'audio/ogg', 'audio/webm', 'audio/opus', 'audio/aac',
  'audio/x-aac', 'audio/wma', 'audio/x-ms-wma',
  'video/mp4', 'video/mpeg', 'video/webm',
] as const

export function isAcceptedAudioFile(file: File): boolean {
  if (ACCEPTED_AUDIO_MIME_TYPES.includes(file.type as typeof ACCEPTED_AUDIO_MIME_TYPES[number])) {
    return true
  }
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_AUDIO_EXTENSIONS.includes(ext as typeof ACCEPTED_AUDIO_EXTENSIONS[number])
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
