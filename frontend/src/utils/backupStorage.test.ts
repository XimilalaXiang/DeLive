import { describe, expect, it } from 'vitest'
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  CURRENT_BACKUP_VERSION,
  getBackupValidationErrors,
  upgradeBackupData,
  validateBackupData,
} from './backupStorage'

describe('backupStorage', () => {
  it('validates top-level backup structure with nested object arrays', () => {
    expect(validateBackupData({
      version: '1.1',
      exportedAt: '2026-03-09T00:00:00Z',
      sessions: [{ id: 'session-1' }],
      tags: [{ id: 'tag-1', name: 'Important' }],
      settings: { apiKey: '', languageHints: ['zh', 'en'] },
    })).toBe(true)

    expect(validateBackupData({
      version: '1.1',
      exportedAt: '2026-03-09T00:00:00Z',
      sessions: ['bad'],
      tags: [],
      settings: {},
    })).toBe(false)

    expect(validateBackupData({
      version: '1.1',
      exportedAt: '2026-03-09T00:00:00Z',
      sessions: [],
      tags: ['bad'],
      settings: {},
    })).toBe(false)

    expect(getBackupValidationErrors({
      version: '',
      sessions: ['bad'],
      tags: ['bad'],
      settings: null,
    })).toEqual([
      'Missing or invalid "version"',
      'sessions[0] must be an object',
      'tags[0] must be an object',
      'Missing or invalid "settings" object',
    ])
  })

  it('upgrades legacy backup data into current schema', () => {
    const upgraded = upgradeBackupData({
      version: '1.1',
      exportedAt: '2026-03-09T00:00:00Z',
      sessions: [
        {
          id: 'legacy-session',
          createdAt: 1000,
          updatedAt: 2000,
          transcript: 'hello world',
          tokens: [{ text: 'hello world', startMs: 0, endMs: 1000 }],
          tags: ['ignored'],
        } as never,
      ],
      tags: [
        { id: 'tag-1', name: 'Important', color: 'green' },
        { id: '', name: 'invalid' } as never,
      ],
      settings: {
        apiKey: 'legacy-key',
        languageHints: ['zh', 'en'],
      },
    })

    expect(upgraded.version).toBe(CURRENT_BACKUP_VERSION)
    expect(upgraded.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION)
    expect(upgraded.sessions).toHaveLength(1)
    expect(upgraded.sessions[0]).toEqual(expect.objectContaining({
      id: 'legacy-session',
      schemaVersion: 3,
      transcript: 'hello world',
      tagIds: [],
      speakers: [],
      segments: [],
      status: 'completed',
    }))
    expect(upgraded.tags).toEqual([
      { id: 'tag-1', name: 'Important', color: 'green' },
    ])
    expect(upgraded.settings).toEqual(expect.objectContaining({
      apiKey: 'legacy-key',
      languageHints: ['zh', 'en'],
    }))
    expect(upgraded.settings.captionStyle).toBeDefined()
  })
})
