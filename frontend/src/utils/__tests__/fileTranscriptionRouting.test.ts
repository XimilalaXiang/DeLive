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

  it('routes 60db to its own executor and requires its API key (#17)', () => {
    expect(hasFileTranscriptionExecutor('sixtydb')).toBe(true)
    expect(getFileTranscriptionConfigError('sixtydb', { apiKey: 'sk_live_x' }, { isElectron: true })).toBeNull()
    expect(getFileTranscriptionConfigError('sixtydb', {}, { isElectron: true }))
      .toEqual({ key: 'providerApiKeyNotConfigured', args: ['sixtydb'] })
  })

  it('rejects providers without an executor instead of falling back to Soniox', () => {
    expect(getFileTranscriptionConfigError('some_new_vendor', { apiKey: 'k' }, { isElectron: true }))
      .toEqual({ key: 'fileTranscriptionUnsupported', args: ['some_new_vendor'] })
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
