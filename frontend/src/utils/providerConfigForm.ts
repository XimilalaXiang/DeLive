import type { AppSettings, ProviderConfigData } from '../types'
import type { ASRProviderInfo, ProviderConfigField } from '../types/asr'
import { buildProviderConnectConfig } from './providerConfig'

export type ProviderFormValue = string | boolean
export type ProviderFormState = Record<string, ProviderFormValue>

const DEFAULT_LANGUAGE_HINTS = ['zh', 'en']

function cloneDefaultValue(value: ProviderConfigField['defaultValue']): ProviderConfigField['defaultValue'] {
  return Array.isArray(value) ? [...value] : value
}

function serializeFieldValue(field: ProviderConfigField, value: unknown): ProviderFormValue {
  if (field.type === 'boolean') {
    return Boolean(value)
  }

  if (field.type === 'multiselect') {
    if (Array.isArray(value)) {
      return value.map(item => String(item).trim()).filter(Boolean).join(', ')
    }
    if (typeof value === 'string') {
      return value
    }
    return ''
  }

  if (value === undefined || value === null) {
    return ''
  }

  return String(value)
}

function parseCommaSeparatedValues(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export function formatStringArrayValue(value: unknown, fallback: string[] = DEFAULT_LANGUAGE_HINTS): string {
  const normalized = Array.isArray(value)
    ? value.map(item => String(item).trim()).filter(Boolean)
    : fallback
  return normalized.join(', ')
}

export function buildProviderFormState(
  provider: ASRProviderInfo | undefined,
  providerConfig: ProviderConfigData | undefined,
  settings: Pick<AppSettings, 'apiKey' | 'languageHints'>
): ProviderFormState {
  const config = buildProviderConnectConfig(provider, providerConfig, settings) as ProviderConfigData
  const state: ProviderFormState = {}

  if (!provider) {
    return state
  }

  for (const field of provider.configFields) {
    let value = config[field.key]
    if (value === undefined && field.defaultValue !== undefined) {
      value = cloneDefaultValue(field.defaultValue)
    }
    state[field.key] = serializeFieldValue(field, value)
  }

  return state
}

export function buildProviderConfigFromFormState(
  provider: ASRProviderInfo | undefined,
  formState: ProviderFormState,
  languageHintsText: string
): ProviderConfigData {
  const config: ProviderConfigData = {
    languageHints: parseCommaSeparatedValues(languageHintsText),
  }

  if (!provider) {
    return config
  }

  for (const field of provider.configFields) {
    if (field.key === 'languageHints') {
      continue
    }

    const rawValue = formState[field.key]

    switch (field.type) {
      case 'boolean':
        config[field.key] = Boolean(rawValue)
        break
      case 'number': {
        const textValue = String(rawValue ?? '').trim()
        if (textValue.length === 0) {
          if (field.defaultValue !== undefined) {
            config[field.key] = field.defaultValue
          }
          break
        }

        const numericValue = Number(textValue)
        config[field.key] = Number.isFinite(numericValue) ? numericValue : textValue
        break
      }
      case 'multiselect': {
        const textValue = String(rawValue ?? '').trim()
        const values = parseCommaSeparatedValues(textValue)
        config[field.key] = values
        break
      }
      default: {
        const textValue = String(rawValue ?? '').trim()
        if (textValue.length > 0) {
          config[field.key] = textValue
        } else if (typeof field.defaultValue === 'string') {
          config[field.key] = field.defaultValue
        } else if (field.defaultValue !== undefined) {
          config[field.key] = field.defaultValue
        } else {
          config[field.key] = ''
        }
        break
      }
    }
  }

  if ((config.languageHints as string[]).length === 0) {
    config.languageHints = [...DEFAULT_LANGUAGE_HINTS]
  }

  return config
}
