import type { ProviderConfigData } from '../types'
import type { UserErrorKey } from './userErrors'

/**
 * Providers that have a real file-transcription executor in
 * useFileTranscription. A provider must be listed here to be offered on the
 * file transcription page, even if its capabilities declare the workload, so
 * a missing executor can never silently fall back to another vendor (#17).
 */
export const FILE_TRANSCRIPTION_PROVIDER_IDS = [
  'soniox',
  'groq',
  'mistral',
  'siliconflow',
  'cloudflare',
  'gladia',
  'elevenlabs',
  'deepgram',
  'assemblyai',
  'volc',
  'local_openai',
  'sensevoice',
  'local_whisper_cpp',
  'sixtydb',
] as const

export type FileTranscriptionProviderId = typeof FILE_TRANSCRIPTION_PROVIDER_IDS[number]

export function hasFileTranscriptionExecutor(providerId: string): providerId is FileTranscriptionProviderId {
  return (FILE_TRANSCRIPTION_PROVIDER_IDS as readonly string[]).includes(providerId)
}

export interface FileTranscriptionConfigError {
  key: UserErrorKey
  args: unknown[]
}

function readText(config: ProviderConfigData | undefined, key: string): string {
  const value = config?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Checks that the provider can run a file transcription with the given
 * config. Returns the user-facing error to show, or null when it can run.
 */
export function getFileTranscriptionConfigError(
  providerId: string,
  providerConfig: ProviderConfigData | undefined,
  env: { isElectron: boolean },
): FileTranscriptionConfigError | null {
  if (!hasFileTranscriptionExecutor(providerId)) {
    return { key: 'fileTranscriptionUnsupported', args: [providerId] }
  }

  switch (providerId) {
    case 'cloudflare':
      return readText(providerConfig, 'apiToken') && readText(providerConfig, 'accountId')
        ? null
        : { key: 'cloudflareCredentialsNotConfigured', args: [] }
    case 'volc':
      return readText(providerConfig, 'appKey') && readText(providerConfig, 'accessKey')
        ? null
        : { key: 'volcCredentialsNotConfigured', args: [] }
    case 'local_openai':
    case 'sensevoice':
      return readText(providerConfig, 'baseUrl')
        ? null
        : { key: 'configureBaseUrlFirst', args: [] }
    case 'local_whisper_cpp':
      if (!env.isElectron) return { key: 'whisperCppFileNeedsElectron', args: [] }
      return readText(providerConfig, 'modelPath')
        ? null
        : { key: 'whisperCppModelPathNotConfigured', args: [] }
    default:
      return readText(providerConfig, 'apiKey')
        ? null
        : { key: 'providerApiKeyNotConfigured', args: [providerId] }
  }
}
