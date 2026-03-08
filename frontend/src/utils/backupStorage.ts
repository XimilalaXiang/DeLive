import type { AppSettings, Tag, TranscriptSession } from '../types'
import { getSessions, saveSessions } from './sessionStorage'
import { getSettings, getTags, saveSettings, saveTags } from './settingsStorage'

export interface BackupData {
  version: string
  exportedAt: string
  sessions: TranscriptSession[]
  tags: Tag[]
  settings: AppSettings
}

export async function exportAllData(): Promise<void> {
  const data: BackupData = {
    version: '1.1',
    exportedAt: new Date().toISOString(),
    sessions: await getSessions(),
    tags: getTags(),
    settings: getSettings(),
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
  if (!data || typeof data !== 'object') return false
  const parsed = data as Record<string, unknown>
  return (
    typeof parsed.version === 'string'
    && Array.isArray(parsed.sessions)
    && Array.isArray(parsed.tags)
    && typeof parsed.settings === 'object'
  )
}

export async function importDataOverwrite(
  data: BackupData,
): Promise<{ sessions: number; tags: number }> {
  await saveSessions(data.sessions)
  saveTags(data.tags)

  const currentSettings = getSettings()
  saveSettings({
    ...data.settings,
    apiKey: currentSettings.apiKey || data.settings.apiKey,
  })

  return {
    sessions: data.sessions.length,
    tags: data.tags.length,
  }
}

export async function importDataMerge(
  data: BackupData,
): Promise<{ sessions: number; tags: number; newSessions: number; newTags: number }> {
  const existingSessions = await getSessions()
  const existingTags = getTags()

  const existingSessionIds = new Set(existingSessions.map((session) => session.id))
  const newSessions = data.sessions.filter((session) => !existingSessionIds.has(session.id))
  const mergedSessions = [...existingSessions, ...newSessions]
  await saveSessions(mergedSessions)

  const existingTagIds = new Set(existingTags.map((tag) => tag.id))
  const newTags = data.tags.filter((tag) => !existingTagIds.has(tag.id))
  const mergedTags = [...existingTags, ...newTags]
  saveTags(mergedTags)

  return {
    sessions: mergedSessions.length,
    tags: mergedTags.length,
    newSessions: newSessions.length,
    newTags: newTags.length,
  }
}
