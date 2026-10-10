import { describe, expect, it } from 'vitest'
import { providerRegistry } from '../../providers/registry'
import { supportsProviderWorkload } from '../../types/asr/common'
import {
  getFileTranscriptionConfigError,
  hasFileTranscriptionExecutor,
} from '../fileTranscriptionRouting'

describe('file transcription routing', () => {
  it('has an executor for every provider that declares file transcription', () => {
    const declared = providerRegistry.getAllProviders()
      .filter((p) => supportsProviderWorkload(p.capabilities, 'file-transcription'))
      .map((p) => p.id)
    expect(declared.length).toBeGreaterThan(0)
    for (const id of declared) {
      expect(hasFileTranscriptionExecutor(id), `${id} declares file transcription but has no executor`).toBe(true)
    }
  })

  it('does not offer 60db for file transcription (#17)', () => {
    const sixtydb = providerRegistry.getInfo('sixtydb' as never)
    expect(sixtydb).toBeDefined()
    expect(supportsProviderWorkload(sixtydb!.capabilities, 'file-transcription')).toBe(false)
  })

  it('rejects providers without an executor instead of falling back to Soniox', () => {
    expect(getFileTranscriptionConfigError('sixtydb', { apiKey: 'sk_live_x' }, { isElectron: true }))
      .toEqual({ key: 'fileTranscriptionUnsupported', args: ['sixtydb'] })
  })

  it('does not require an API key for local whisper.cpp (#26)', () => {
    expect(getFileTranscriptionConfigError(
      'local_whisper_cpp',
      { modelPath: '/models/ggml-base.bin' },
      { isElectron: true },
    )).toBeNull()
  })

  it('requires a model path and the desktop app for whisper.cpp', () => {
    expect(getFileTranscriptionConfigError('local_whisper_cpp', {}, { isElectron: true })?.key)
      .toBe('whisperCppModelPathNotConfigured')
    expect(getFileTranscriptionConfigError('local_whisper_cpp', { modelPath: '/m.bin' }, { isElectron: false })?.key)
      .toBe('whisperCppFileNeedsElectron')
  })

  it('keeps the existing credential checks', () => {
    expect(getFileTranscriptionConfigError('soniox', {}, { isElectron: true }))
      .toEqual({ key: 'providerApiKeyNotConfigured', args: ['soniox'] })
    expect(getFileTranscriptionConfigError('soniox', { apiKey: 'k' }, { isElectron: true })).toBeNull()
    expect(getFileTranscriptionConfigError('cloudflare', { apiToken: 't' }, { isElectron: true })?.key)
      .toBe('cloudflareCredentialsNotConfigured')
    expect(getFileTranscriptionConfigError('volc', { appKey: 'a', accessKey: 'b' }, { isElectron: true })).toBeNull()
    expect(getFileTranscriptionConfigError('sensevoice', { baseUrl: ' ' }, { isElectron: true })?.key)
      .toBe('configureBaseUrlFirst')
    expect(getFileTranscriptionConfigError('local_openai', { baseUrl: 'http://127.0.0.1:1234' }, { isElectron: true }))
      .toBeNull()
  })
})
