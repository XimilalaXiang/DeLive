import { create } from 'zustand'
import type {
  AiPostProcessConfig,
  AppSettings,
  CloudBackupConfig,
  OpenApiConfig,
  ProviderConfigData,
  CaptionStyle,
} from '../types'
import {
  encryptApiKeyForStorage,
  getSettings,
  saveSettings,
  resolveApiKeysFromSafeStorage,
  migrateApiKeysToSafeStorage,
} from '../utils/storage'
import { getDefaultSettings } from '../utils/storageShared'
import { providerRegistry } from '../providers'
import type { ASRProviderInfo, ASRVendor } from '../types/asr'

const defaultCaptionStyle: CaptionStyle = {
  fontSize: 24,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif',
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  textShadow: true,
  maxLines: 2,
  width: 800,
  displayMode: 'source',
}

export interface SettingsState {
  settings: AppSettings
  loadSettings: () => void
  updateSettings: (settings: Partial<AppSettings>) => void
  updateAiPostProcessConfig: (config: Partial<AiPostProcessConfig>) => Promise<void>
  updateOpenApiConfig: (config: Partial<OpenApiConfig>) => void
  updateCloudBackupConfig: (config: Partial<CloudBackupConfig>) => Promise<void>

  availableProviders: ASRProviderInfo[]
  setCurrentVendor: (vendorId: string) => void
  updateProviderConfig: (vendorId: string, config: Partial<ProviderConfigData>) => void
  getProviderConfig: (vendorId: string) => ProviderConfigData | undefined
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    apiKey: '',
    languageHints: ['zh', 'en'],
    currentVendor: 'soniox',
    providerConfigs: {},
    captionStyle: defaultCaptionStyle,
    aiPostProcess: getDefaultSettings().aiPostProcess,
  },
  loadSettings: () => {
    const settings = getSettings()
    const defaultSettings = getDefaultSettings()
    const registeredVendors = providerRegistry.getAllProviders().map(p => p.id)

    if (settings.apiKey && (!settings.providerConfigs || !settings.providerConfigs['soniox'])) {
      settings.currentVendor = 'soniox'
      settings.providerConfigs = {
        ...settings.providerConfigs,
        soniox: {
          apiKey: settings.apiKey,
          languageHints: settings.languageHints,
        },
      }
    }

    if (!settings.currentVendor || !registeredVendors.includes(settings.currentVendor as ASRVendor)) {
      settings.currentVendor = registeredVendors[0] || 'soniox'
    }

    const merged = {
      ...settings,
      captionStyle: {
        ...defaultCaptionStyle,
        ...(settings.captionStyle || {}),
      },
      aiPostProcess: {
        ...defaultSettings.aiPostProcess,
        ...(settings.aiPostProcess || {}),
      },
      openApi: {
        ...defaultSettings.openApi,
        ...(settings.openApi || {}),
      },
      cloudBackup: {
        ...defaultSettings.cloudBackup,
        ...(settings.cloudBackup || {}),
      },
    }

    if (merged.aiPostProcess.model && !merged.aiPostProcess.defaultModel) {
      merged.aiPostProcess.defaultModel = merged.aiPostProcess.model
    }

    set({ settings: merged })

    if (window.electronAPI) {
      window.electronAPI.apiUpdateOpenApiConfig({
        enabled: !!merged.openApi?.enabled,
        token: merged.openApi?.token || '',
      })
    }

    void (async () => {
      await migrateApiKeysToSafeStorage()
      const resolved = await resolveApiKeysFromSafeStorage(get().settings)
      set({ settings: resolved })
    })()
  },
  updateSettings: (newSettings) => {
    const settings = { ...get().settings, ...newSettings }
    saveSettings(settings)
    set({ settings })
  },
  updateAiPostProcessConfig: async (config) => {
    const { settings } = get()
    const currentConfig = settings.aiPostProcess || {}
    const nextConfig = { ...currentConfig, ...config }
    const inMemorySettings = {
      ...settings,
      aiPostProcess: nextConfig,
    }

    set({ settings: inMemorySettings })

    const encryptedApiKey = typeof nextConfig.apiKey === 'string'
      ? await encryptApiKeyForStorage('ai_postprocess', nextConfig.apiKey)
      : nextConfig.apiKey

    saveSettings({
      ...inMemorySettings,
      aiPostProcess: {
        ...nextConfig,
        apiKey: encryptedApiKey,
      },
    })
  },
  updateOpenApiConfig: (config) => {
    const { settings } = get()
    const currentConfig = settings.openApi || {}
    const nextConfig = { ...currentConfig, ...config }
    const newSettings = { ...settings, openApi: nextConfig }

    saveSettings(newSettings)
    set({ settings: newSettings })

    if (window.electronAPI) {
      window.electronAPI.apiUpdateOpenApiConfig({
        enabled: !!nextConfig.enabled,
        token: nextConfig.token || '',
      })
    }
  },
  updateCloudBackupConfig: async (config) => {
    const { settings } = get()
    const currentConfig = settings.cloudBackup || {}
    const nextConfig = { ...currentConfig, ...config }

    if (config.s3) {
      nextConfig.s3 = { ...(currentConfig.s3 || {}), ...config.s3 } as typeof nextConfig.s3
    }
    if (config.webdav) {
      nextConfig.webdav = { ...(currentConfig.webdav || {}), ...config.webdav } as typeof nextConfig.webdav
    }

    const inMemorySettings = { ...settings, cloudBackup: nextConfig }
    set({ settings: inMemorySettings })

    const storageConfig = { ...nextConfig }
    if (storageConfig.s3?.secretAccessKey) {
      const encrypted = await encryptApiKeyForStorage('cloud_backup_s3', storageConfig.s3.secretAccessKey)
      storageConfig.s3 = { ...storageConfig.s3, secretAccessKey: encrypted ?? '' }
    }
    if (storageConfig.webdav?.password) {
      const encrypted = await encryptApiKeyForStorage('cloud_backup_webdav', storageConfig.webdav.password)
      storageConfig.webdav = { ...storageConfig.webdav, password: encrypted ?? '' }
    }

    saveSettings({ ...inMemorySettings, cloudBackup: storageConfig })
  },

  availableProviders: providerRegistry.getAllProviders(),
  setCurrentVendor: (vendorId) => {
    const { settings } = get()
    const newSettings = { ...settings, currentVendor: vendorId }
    saveSettings(newSettings)
    set({ settings: newSettings })
  },
  updateProviderConfig: (vendorId, config) => {
    const { settings } = get()
    const currentConfig = settings.providerConfigs?.[vendorId] || { apiKey: '' }
    const providerInfo = providerRegistry.getInfo(vendorId as ASRVendor)
    const shouldSyncLegacyApiKey = !!providerInfo?.requiredConfigKeys.includes('apiKey')
    const newProviderConfigs = {
      ...settings.providerConfigs,
      [vendorId]: { ...currentConfig, ...config },
    }
    const newApiKey = vendorId === settings.currentVendor && shouldSyncLegacyApiKey
      ? (config.apiKey ?? currentConfig.apiKey ?? settings.apiKey)
      : settings.apiKey
    const newSettings = {
      ...settings,
      providerConfigs: newProviderConfigs,
      apiKey: newApiKey,
    }
    saveSettings(newSettings)
    set({ settings: newSettings })
  },
  getProviderConfig: (vendorId) => {
    const { settings } = get()
    return settings.providerConfigs?.[vendorId]
  },
}))
