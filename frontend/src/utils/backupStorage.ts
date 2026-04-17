import type {
  AiPostProcessConfig,
  AppSettings,
  CaptionStyle,
  ProviderConfigData,
  Tag,
  Topic,
  TranscriptSession,
} from '../types'
import { getSessions, saveSessions } from './sessionStorage'
import { getSettings, getTags, getTopics, saveSettings, saveTags, saveTopics } from './settingsStorage'
import { normalizeTranscriptSessions } from './sessionSchema'
import { getDefaultSettings } from './storageShared'

export const CURRENT_BACKUP_VERSION = '3.0'
export const CURRENT_BACKUP_SCHEMA_VERSION = 3

export interface BackupData {
  version: string
  schemaVersion?: number
  exportedAt: string
  sessions: TranscriptSession[]
  tags: Tag[]
  settings: AppSettings
  topics?: Topic[]
}

export function getBackupValidationErrors(data: unknown): string[] {
  if (!isRecord(data)) {
    return ['Backup payload must be an object']
  }

  const errors: string[] = []

  if (typeof data.version !== 'string' || data.version.trim().length === 0) {
    errors.push('Missing or invalid "version"')
  }

  if (data.schemaVersion !== undefined && (typeof data.schemaVersion !== 'number' || !Number.isFinite(data.schemaVersion))) {
    errors.push('Invalid "schemaVersion"')
  }

  if (data.exportedAt !== undefined && typeof data.exportedAt !== 'string') {
    errors.push('Invalid "exportedAt"')
  }

  if (!Array.isArray(data.sessions)) {
    errors.push('Missing or invalid "sessions" array')
  } else {
    data.sessions.forEach((session, index) => {
      if (!isRecord(session)) {
        errors.push(`sessions[${index}] must be an object`)
      }
    })
  }

  if (!Array.isArray(data.tags)) {
    errors.push('Missing or invalid "tags" array')
  } else {
    data.tags.forEach((tag, index) => {
      if (!isRecord(tag)) {
        errors.push(`tags[${index}] must be an object`)
      }
    })
  }

  if (!isRecord(data.settings)) {
    errors.push('Missing or invalid "settings" object')
  }

  return errors
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function normalizeTag(value: unknown): Tag | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!id || !name) {
    return null
  }

  return {
    id,
    name,
    color: typeof value.color === 'string' && value.color.trim().length > 0
      ? value.color
      : 'blue',
  }
}

function normalizeProviderConfigs(value: unknown): Record<string, ProviderConfigData> | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(value).map(([providerId, config]) => [
      providerId,
      isRecord(config) ? { ...(config as ProviderConfigData) } : {},
    ]),
  )
}

function normalizeCaptionStyle(
  value: unknown,
  fallback: CaptionStyle | undefined,
): CaptionStyle | undefined {
  if (!fallback) {
    return undefined
  }

  if (!isRecord(value)) {
    return fallback
  }

  return {
    ...fallback,
    ...(value as Partial<CaptionStyle>),
  }
}

function normalizeAiPostProcessConfig(value: unknown): AiPostProcessConfig | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const provider = value.provider === 'openai-compatible'
    ? value.provider
    : 'openai-compatible'
  const promptLanguage = value.promptLanguage === 'en' || value.promptLanguage === 'zh'
    ? value.promptLanguage
    : undefined

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : undefined,
    provider,
    baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : undefined,
    model: typeof value.model === 'string' ? value.model : undefined,
    apiKey: typeof value.apiKey === 'string' ? value.apiKey : undefined,
    promptLanguage,
  }
}

function normalizeSettings(value: unknown): AppSettings {
  const defaults = getDefaultSettings()
  const record = isRecord(value) ? value : {}

  return {
    ...defaults,
    apiKey: typeof record.apiKey === 'string' ? record.apiKey : defaults.apiKey,
    languageHints: Array.isArray(record.languageHints)
      ? normalizeStringArray(record.languageHints)
      : defaults.languageHints,
    currentVendor: typeof record.currentVendor === 'string' ? record.currentVendor : undefined,
    providerConfigs: normalizeProviderConfigs(record.providerConfigs),
    autoCheckUpdate: typeof record.autoCheckUpdate === 'boolean' ? record.autoCheckUpdate : undefined,
    captionStyle: normalizeCaptionStyle(record.captionStyle, defaults.captionStyle),
    colorTheme: typeof record.colorTheme === 'string' ? record.colorTheme : undefined,
    aiPostProcess: {
      ...defaults.aiPostProcess,
      ...(normalizeAiPostProcessConfig(record.aiPostProcess) || {}),
    },
    openApi: {
      ...defaults.openApi,
      ...(isRecord(record.openApi) ? {
        enabled: typeof record.openApi.enabled === 'boolean' ? record.openApi.enabled : false,
        token: typeof record.openApi.token === 'string' ? record.openApi.token : '',
      } : {}),
    },
    cloudBackup: {
      ...defaults.cloudBackup,
      ...(isRecord(record.cloudBackup) ? {
        enabled: typeof record.cloudBackup.enabled === 'boolean' ? record.cloudBackup.enabled : false,
        provider: record.cloudBackup.provider === 's3' || record.cloudBackup.provider === 'webdav'
          ? record.cloudBackup.provider : 's3',
        autoBackupOnComplete: typeof record.cloudBackup.autoBackupOnComplete === 'boolean'
          ? record.cloudBackup.autoBackupOnComplete : false,
      } : {}),
    },
  }
}

export async function exportAllData(): Promise<void> {
  const data: BackupData = {
    version: CURRENT_BACKUP_VERSION,
    schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sessions: normalizeTranscriptSessions(await getSessions()),
    tags: getTags(),
    settings: getSettings(),
    topics: getTopics(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `desktoplive_backup_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function validateBackupData(data: unknown): data is BackupData {
  return getBackupValidationErrors(data).length === 0
}

export function upgradeBackupData(data: BackupData): BackupData {
  return {
    version: CURRENT_BACKUP_VERSION,
    schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    exportedAt: data.exportedAt || new Date().toISOString(),
    sessions: normalizeTranscriptSessions(data.sessions),
    tags: data.tags
      .map(normalizeTag)
      .filter((tag): tag is Tag => tag !== null),
    settings: normalizeSettings(data.settings),
    topics: Array.isArray(data.topics)
      ? data.topics.filter((t): t is Topic => isRecord(t) && typeof (t as Record<string, unknown>).id === 'string' && typeof (t as Record<string, unknown>).name === 'string')
      : [],
  }
}

export async function importDataOverwrite(
  data: BackupData,
): Promise<{ sessions: number; tags: number; topics: number }> {
  const normalized = upgradeBackupData(data)
  await saveSessions(normalized.sessions)
  saveTags(normalized.tags)
  if (normalized.topics?.length) {
    saveTopics(normalized.topics)
  }

  const currentSettings = getSettings()
  saveSettings({
    ...normalized.settings,
    apiKey: currentSettings.apiKey || normalized.settings.apiKey,
  })

  return {
    sessions: normalized.sessions.length,
    tags: normalized.tags.length,
    topics: normalized.topics?.length ?? 0,
  }
}

export async function importDataMerge(
  data: BackupData,
): Promise<{ sessions: number; tags: number; topics: number; newSessions: number; newTags: number; newTopics: number }> {
  const normalized = upgradeBackupData(data)
  const existingSessions = await getSessions()
  const existingTags = getTags()
  const existingTopics = getTopics()

  const existingSessionIds = new Set(existingSessions.map((session) => session.id))
  const newSessions = normalized.sessions.filter((session) => !existingSessionIds.has(session.id))
  const mergedSessions = [...existingSessions, ...newSessions]
  await saveSessions(mergedSessions)

  const existingTagIds = new Set(existingTags.map((tag) => tag.id))
  const newTags = normalized.tags.filter((tag) => !existingTagIds.has(tag.id))
  const mergedTags = [...existingTags, ...newTags]
  saveTags(mergedTags)

  const existingTopicIds = new Set(existingTopics.map((topic) => topic.id))
  const incomingTopics = normalized.topics ?? []
  const newTopicsArr = incomingTopics.filter((topic) => !existingTopicIds.has(topic.id))
  const mergedTopics = [...existingTopics, ...newTopicsArr]
  saveTopics(mergedTopics)

  return {
    sessions: mergedSessions.length,
    tags: mergedTags.length,
    topics: mergedTopics.length,
    newSessions: newSessions.length,
    newTags: newTags.length,
    newTopics: newTopicsArr.length,
  }
}
