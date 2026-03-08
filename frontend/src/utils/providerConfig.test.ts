import { describe, it, expect } from 'vitest'
import {
  normalizeProviderConfig,
  buildProviderConnectConfig,
  getMissingRequiredConfigKeys,
  getMissingRequiredConfigLabels,
  isProviderConfigured,
} from './providerConfig'
import type { ASRProviderInfo } from '../types/asr'

function makeProviderInfo(overrides: Partial<ASRProviderInfo> = {}): ASRProviderInfo {
  return {
    id: 'soniox' as ASRProviderInfo['id'],
    name: 'Soniox',
    description: '',
    type: 'cloud',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'media-recorder',
      transport: { type: 'realtime' },
    },
    requiredConfigKeys: ['apiKey'],
    supportedLanguages: ['en', 'zh'],
    website: '',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'model', label: 'Model', type: 'text', required: false },
    ],
    ...overrides,
  }
}

describe('normalizeProviderConfig', () => {
  it('returns empty object when no config or fallback provided', () => {
    const result = normalizeProviderConfig(undefined, undefined)
    expect(result).toEqual({})
  })

  it('passes through existing config unchanged when no fallback needed', () => {
    const provider = makeProviderInfo()
    const result = normalizeProviderConfig(provider, { apiKey: 'my-key' })
    expect(result.apiKey).toBe('my-key')
  })

  it('falls back apiKey from legacy settings when provider requires it and config is empty', () => {
    const provider = makeProviderInfo()
    const result = normalizeProviderConfig(provider, {}, { apiKey: 'legacy-key' })
    expect(result.apiKey).toBe('legacy-key')
  })

  it('does not override existing apiKey with fallback', () => {
    const provider = makeProviderInfo()
    const result = normalizeProviderConfig(
      provider,
      { apiKey: 'explicit-key' },
      { apiKey: 'legacy-key' },
    )
    expect(result.apiKey).toBe('explicit-key')
  })

  it('falls back languageHints when config has none', () => {
    const provider = makeProviderInfo()
    const result = normalizeProviderConfig(
      provider,
      {},
      { languageHints: ['zh', 'en'] },
    )
    expect(result.languageHints).toEqual(['zh', 'en'])
  })

  it('does not fall back apiKey when provider does not require it', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: [] })
    const result = normalizeProviderConfig(provider, {}, { apiKey: 'legacy' })
    expect(result.apiKey).toBeUndefined()
  })
})

describe('buildProviderConnectConfig', () => {
  it('merges provider config with legacy settings fallback', () => {
    const provider = makeProviderInfo()
    const result = buildProviderConnectConfig(provider, {}, {
      apiKey: 'global-key',
      languageHints: ['en'],
    })
    expect(result.apiKey).toBe('global-key')
    expect(result.languageHints).toEqual(['en'])
  })
})

describe('getMissingRequiredConfigKeys', () => {
  it('returns empty for undefined provider', () => {
    expect(getMissingRequiredConfigKeys(undefined, {})).toEqual([])
  })

  it('returns missing keys when config is empty', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: ['apiKey', 'model'] })
    expect(getMissingRequiredConfigKeys(provider, {})).toEqual(['apiKey', 'model'])
  })

  it('returns empty when all required keys are present', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: ['apiKey'] })
    expect(getMissingRequiredConfigKeys(provider, { apiKey: 'key' })).toEqual([])
  })

  it('treats empty string as missing', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: ['apiKey'] })
    expect(getMissingRequiredConfigKeys(provider, { apiKey: '  ' })).toEqual(['apiKey'])
  })
})

describe('getMissingRequiredConfigLabels', () => {
  it('returns labels for missing keys', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: ['apiKey'] })
    expect(getMissingRequiredConfigLabels(provider, {})).toEqual(['API Key'])
  })

  it('falls back to key name when label not found', () => {
    const provider = makeProviderInfo({
      requiredConfigKeys: ['unknownField'],
      configFields: [],
    })
    expect(getMissingRequiredConfigLabels(provider, {})).toEqual(['unknownField'])
  })
})

describe('isProviderConfigured', () => {
  it('returns false for undefined provider', () => {
    expect(isProviderConfigured(undefined, {})).toBe(false)
  })

  it('returns true when all required keys present', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: ['apiKey'] })
    expect(isProviderConfigured(provider, { apiKey: 'key' })).toBe(true)
  })

  it('returns false when required key missing', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: ['apiKey'] })
    expect(isProviderConfigured(provider, {})).toBe(false)
  })
})
