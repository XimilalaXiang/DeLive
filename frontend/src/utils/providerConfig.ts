import type { AppSettings, ProviderConfigData } from '../types'
import type { ASRProviderInfo, ProviderConfig } from '../types/asr'

interface LegacyProviderFallback {
  apiKey?: string
  languageHints?: string[]
}

function hasConfiguredValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return value !== undefined && value !== null
}

export function normalizeProviderConfig(
  provider: ASRProviderInfo | undefined,
  providerConfig: ProviderConfigData | undefined,
  fallback?: LegacyProviderFallback
): ProviderConfigData {
  const normalized: ProviderConfigData = { ...(providerConfig || {}) }
  const requiresApiKey = provider?.requiredConfigKeys.includes('apiKey')

  if (requiresApiKey && !hasConfiguredValue(normalized.apiKey) && hasConfiguredValue(fallback?.apiKey)) {
    normalized.apiKey = fallback?.apiKey
  }

  if (!hasConfiguredValue(normalized.languageHints) && fallback?.languageHints?.length) {
    normalized.languageHints = fallback.languageHints
  }

  return normalized
}

export function buildProviderConnectConfig(
  provider: ASRProviderInfo | undefined,
  providerConfig: ProviderConfigData | undefined,
  settings: Pick<AppSettings, 'apiKey' | 'languageHints'>
): ProviderConfig {
  const normalized = normalizeProviderConfig(provider, providerConfig, {
    apiKey: settings.apiKey,
    languageHints: settings.languageHints,
  })
  return { ...(normalized as ProviderConfig) }
}

export function getMissingRequiredConfigKeys(
  provider: ASRProviderInfo | undefined,
  providerConfig: ProviderConfigData | undefined
): string[] {
  if (!provider) return []
  return provider.requiredConfigKeys.filter((key) => !hasConfiguredValue(providerConfig?.[key]))
}

export function getMissingRequiredConfigLabels(
  provider: ASRProviderInfo | undefined,
  providerConfig: ProviderConfigData | undefined
): string[] {
  if (!provider) return []

  const missingKeys = getMissingRequiredConfigKeys(provider, providerConfig)
  return missingKeys.map((key) => {
    const field = provider.configFields.find((item) => item.key === key)
    return field?.label || key
  })
}

export function isProviderConfigured(
  provider: ASRProviderInfo | undefined,
  providerConfig: ProviderConfigData | undefined
): boolean {
  if (!provider) return false
  return getMissingRequiredConfigKeys(provider, providerConfig).length === 0
}
