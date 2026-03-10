import type { AppSettings } from '../types'
import { getSettings, saveSettings } from './settingsStorage'

export const SAFE_STORAGE_PLACEHOLDER = '{{SAFE_STORAGE}}'

function safeStorageKeyFor(path: string): string {
  return `provider_secret_${path}`
}

export async function migrateApiKeysToSafeStorage(): Promise<void> {
  if (!window.electronAPI?.safeStorageAvailable) return
  const available = await window.electronAPI.safeStorageAvailable()
  if (!available) return

  const settings = getSettings()
  let changed = false

  if (settings.apiKey && settings.apiKey !== SAFE_STORAGE_PLACEHOLDER) {
    const stored = await window.electronAPI.safeStorageSet(
      safeStorageKeyFor('legacy_apiKey'),
      settings.apiKey,
    )
    if (stored) {
      settings.apiKey = SAFE_STORAGE_PLACEHOLDER
      changed = true
    }
  }

  if (settings.providerConfigs) {
    for (const [vendorId, config] of Object.entries(settings.providerConfigs)) {
      if (
        config.apiKey
        && typeof config.apiKey === 'string'
        && config.apiKey !== SAFE_STORAGE_PLACEHOLDER
      ) {
        const stored = await window.electronAPI.safeStorageSet(
          safeStorageKeyFor(vendorId),
          config.apiKey,
        )
        if (stored) {
          config.apiKey = SAFE_STORAGE_PLACEHOLDER
          changed = true
        }
      }
    }
  }

  if (
    settings.aiPostProcess?.apiKey
    && typeof settings.aiPostProcess.apiKey === 'string'
    && settings.aiPostProcess.apiKey !== SAFE_STORAGE_PLACEHOLDER
  ) {
    const stored = await window.electronAPI.safeStorageSet(
      safeStorageKeyFor('ai_postprocess'),
      settings.aiPostProcess.apiKey,
    )
    if (stored) {
      settings.aiPostProcess = {
        ...settings.aiPostProcess,
        apiKey: SAFE_STORAGE_PLACEHOLDER,
      }
      changed = true
    }
  }

  if (changed) {
    saveSettings(settings)
  }
}

export async function resolveApiKeysFromSafeStorage(
  settings: AppSettings,
): Promise<AppSettings> {
  if (!window.electronAPI?.safeStorageGet) return settings

  const resolved = { ...settings }

  if (resolved.apiKey === SAFE_STORAGE_PLACEHOLDER) {
    const value = await window.electronAPI.safeStorageGet(safeStorageKeyFor('legacy_apiKey'))
    if (value) {
      resolved.apiKey = value
    }
  }

  if (resolved.providerConfigs) {
    resolved.providerConfigs = { ...resolved.providerConfigs }
    for (const [vendorId, config] of Object.entries(resolved.providerConfigs)) {
      if (config.apiKey === SAFE_STORAGE_PLACEHOLDER) {
        const value = await window.electronAPI.safeStorageGet(safeStorageKeyFor(vendorId))
        if (value) {
          resolved.providerConfigs[vendorId] = { ...config, apiKey: value }
        }
      }
    }
  }

  if (resolved.aiPostProcess?.apiKey === SAFE_STORAGE_PLACEHOLDER) {
    const value = await window.electronAPI.safeStorageGet(safeStorageKeyFor('ai_postprocess'))
    if (value) {
      resolved.aiPostProcess = {
        ...resolved.aiPostProcess,
        apiKey: value,
      }
    }
  }

  return resolved
}

export async function encryptApiKeyForStorage(
  vendorId: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey || apiKey === SAFE_STORAGE_PLACEHOLDER) return apiKey
  if (!window.electronAPI?.safeStorageSet) return apiKey

  const available = await window.electronAPI.safeStorageAvailable()
  if (!available) return apiKey

  const stored = await window.electronAPI.safeStorageSet(
    safeStorageKeyFor(vendorId),
    apiKey,
  )
  return stored ? SAFE_STORAGE_PLACEHOLDER : apiKey
}
