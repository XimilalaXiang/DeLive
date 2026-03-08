import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, validateBackupData } from './storage'

describe('formatDate', () => {
  it('formats timestamp as YYYY-MM-DD', () => {
    const ts = new Date('2026-03-07T14:30:00Z').getTime()
    expect(formatDate(ts)).toBe('2026-03-07')
  })

  it('handles midnight correctly', () => {
    const ts = new Date('2026-01-01T00:00:00Z').getTime()
    expect(formatDate(ts)).toBe('2026-01-01')
  })

  it('pads single-digit months and days', () => {
    const ts = new Date('2026-02-05T12:00:00Z').getTime()
    expect(formatDate(ts)).toBe('2026-02-05')
  })
})

describe('formatTime', () => {
  it('formats timestamp as HH:mm', () => {
    const ts = new Date('2026-03-07T14:30:00').getTime()
    expect(formatTime(ts)).toBe('14:30')
  })

  it('pads single-digit hours', () => {
    const ts = new Date('2026-03-07T03:05:00').getTime()
    expect(formatTime(ts)).toBe('03:05')
  })
})

describe('validateBackupData', () => {
  it('returns true for valid backup data', () => {
    expect(validateBackupData({
      version: '1.0',
      exportedAt: '2026-03-07',
      sessions: [],
      tags: [],
      settings: { apiKey: '', languageHints: [] },
    })).toBe(true)
  })

  it('returns false for null', () => {
    expect(validateBackupData(null)).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(validateBackupData('string')).toBe(false)
    expect(validateBackupData(42)).toBe(false)
  })

  it('returns false when version is missing', () => {
    expect(validateBackupData({
      sessions: [],
      tags: [],
      settings: {},
    })).toBe(false)
  })

  it('returns false when sessions is not array', () => {
    expect(validateBackupData({
      version: '1.0',
      sessions: 'not-array',
      tags: [],
      settings: {},
    })).toBe(false)
  })

  it('returns false when tags is not array', () => {
    expect(validateBackupData({
      version: '1.0',
      sessions: [],
      tags: 'not-array',
      settings: {},
    })).toBe(false)
  })

  it('returns false when settings is not object', () => {
    expect(validateBackupData({
      version: '1.0',
      sessions: [],
      tags: [],
      settings: 'not-object',
    })).toBe(false)
  })

  it('returns true even with extra fields', () => {
    expect(validateBackupData({
      version: '1.0',
      exportedAt: '2026-03-07',
      sessions: [{ id: '1' }],
      tags: [{ id: '1', name: 'tag' }],
      settings: { apiKey: 'key' },
      extraField: 'allowed',
    })).toBe(true)
  })
})
