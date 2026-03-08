import { describe, it, expect } from 'vitest'
import {
  normalizeProviderConfig,
  buildProviderConnectConfig,
  getMissingRequiredConfigKeys,
  getMissingRequiredConfigLabels,
  isProviderConfigured,
} from '../providerConfig'
import type { ASRProviderInfo } from '../../types/asr'

function makeProviderInfo(overrides: Partial<ASRProviderInfo> = {}): ASRProviderInfo {
  return {
    id: 'soniox' as ASRProviderInfo['id'],
    name: 'Soniox',
    description: 'Test',
    type: 'cloud',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'media-recorder',
      transport: { type: 'realtime' },
    },
    requiredConfigKeys: ['apiKey'],
    supportedLanguages: ['en', 'zh'],
    website: 'https://example.com',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'model', label: 'Model', type: 'text', required: false },
    ],
    ...overrides,
  }
}

describe('normalizeProviderConfig', () => {
  it('returns empty object when no config or fallback', () => {
    const result = normalizeProviderConfig(undefined, undefined)
    expect(result).toEqual({})
  })

  it('preserves existing providerConfig values', () => {
    const provider = makeProviderInfo()
    const result = normalizeProviderConfig(provider, { apiKey: 'existing-key' })
    expect(result.apiKey).toBe('existing-key')
  })

  it('falls back to legacy apiKey when provider requires it and config is empty', () => {
    const provider = makeProviderInfo()
    const result = normalizeProviderConfig(provider, {}, { apiKey: 'legacy-key' })
    expect(result.apiKey).toBe('legacy-key')
  })

  it('does not overwrite existing apiKey with fallback', () => {
    const provider = makeProviderInfo()
    const result = normalizeProviderConfig(
      provider,
      { apiKey: 'provider-key' },
      { apiKey: 'legacy-key' },
    )
    expect(result.apiKey).toBe('provider-key')
  })

  it('falls back languageHints when config has none', () => {
    const provider = makeProviderInfo()
    const result = normalizeProviderConfig(provider, {}, { languageHints: ['ja'] })
    expect(result.languageHints).toEqual(['ja'])
  })

  it('does not fall back apiKey when provider does not require it', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: [] })
    const result = normalizeProviderConfig(provider, {}, { apiKey: 'legacy' })
    expect(result.apiKey).toBeUndefined()
  })
})

describe('buildProviderConnectConfig', () => {
  it('normalizes and merges settings fallback', () => {
    const provider = makeProviderInfo()
    const result = buildProviderConnectConfig(provider, undefined, {
      apiKey: 'settings-key',
      languageHints: ['en'],
    })
    expect(result.apiKey).toBe('settings-key')
    expect(result.languageHints).toEqual(['en'])
  })
})

describe('getMissingRequiredConfigKeys', () => {
  it('returns empty array when provider is undefined', () => {
    expect(getMissingRequiredConfigKeys(undefined, {})).toEqual([])
  })

  it('returns missing keys when config is empty', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: ['apiKey', 'model'] })
    expect(getMissingRequiredConfigKeys(provider, {})).toEqual(['apiKey', 'model'])
  })

  it('returns only truly missing keys', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: ['apiKey', 'model'] })
    expect(getMissingRequiredConfigKeys(provider, { apiKey: 'abc' })).toEqual(['model'])
  })

  it('treats empty string as missing', () => {
    const provider = makeProviderInfo()
    expect(getMissingRequiredConfigKeys(provider, { apiKey: '  ' })).toEqual(['apiKey'])
  })

  it('returns empty array when all required keys present', () => {
    const provider = makeProviderInfo()
    expect(getMissingRequiredConfigKeys(provider, { apiKey: 'abc' })).toEqual([])
  })
})

describe('getMissingRequiredConfigLabels', () => {
  it('returns labels instead of raw keys', () => {
    const provider = makeProviderInfo()
    const labels = getMissingRequiredConfigLabels(provider, {})
    expect(labels).toEqual(['API Key'])
  })

  it('falls back to key name if no field definition', () => {
    const provider = makeProviderInfo({
      requiredConfigKeys: ['unknownField'],
      configFields: [],
    })
    const labels = getMissingRequiredConfigLabels(provider, {})
    expect(labels).toEqual(['unknownField'])
  })
})

describe('isProviderConfigured', () => {
  it('returns false when provider is undefined', () => {
    expect(isProviderConfigured(undefined, {})).toBe(false)
  })

  it('returns false when required key is missing', () => {
    const provider = makeProviderInfo()
    expect(isProviderConfigured(provider, {})).toBe(false)
  })

  it('returns true when all required keys present', () => {
    const provider = makeProviderInfo()
    expect(isProviderConfigured(provider, { apiKey: 'key' })).toBe(true)
  })

  it('returns true when no keys are required', () => {
    const provider = makeProviderInfo({ requiredConfigKeys: [] })
    expect(isProviderConfigured(provider, {})).toBe(true)
  })
})
