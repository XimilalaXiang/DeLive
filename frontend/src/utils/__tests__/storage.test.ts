import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, validateBackupData } from '../storage'

describe('formatDate', () => {
  it('formats a timestamp as YYYY-MM-DD', () => {
    // 2026-03-07 UTC
    const ts = new Date('2026-03-07T00:00:00Z').getTime()
    expect(formatDate(ts)).toBe('2026-03-07')
  })

  it('handles epoch zero', () => {
    expect(formatDate(0)).toBe('1970-01-01')
  })

  it('pads single-digit months and days', () => {
    const ts = new Date('2026-01-05T00:00:00Z').getTime()
    expect(formatDate(ts)).toBe('2026-01-05')
  })
})

describe('formatTime', () => {
  it('formats a timestamp as HH:mm', () => {
    const ts = new Date('2026-03-07T14:30:00').getTime()
    expect(formatTime(ts)).toBe('14:30')
  })

  it('pads single-digit hours', () => {
    const ts = new Date('2026-03-07T09:05:00').getTime()
    expect(formatTime(ts)).toBe('09:05')
  })
})

describe('validateBackupData', () => {
  it('returns true for valid backup data', () => {
    const data = {
      version: '1.0',
      exportedAt: '2026-03-07T00:00:00Z',
      sessions: [],
      tags: [],
      settings: { apiKey: '', languageHints: [] },
    }
    expect(validateBackupData(data)).toBe(true)
  })

  it('returns false for null', () => {
    expect(validateBackupData(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(validateBackupData(undefined)).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(validateBackupData('string')).toBe(false)
    expect(validateBackupData(42)).toBe(false)
  })

  it('returns false when version is missing', () => {
    expect(validateBackupData({ sessions: [], tags: [], settings: {} })).toBe(false)
  })

  it('returns false when sessions is not an array', () => {
    expect(validateBackupData({ version: '1.0', sessions: 'not-array', tags: [], settings: {} })).toBe(false)
  })

  it('returns false when tags is not an array', () => {
    expect(validateBackupData({ version: '1.0', sessions: [], tags: 'bad', settings: {} })).toBe(false)
  })

  it('returns false when settings is missing entirely', () => {
    expect(validateBackupData({ version: '1.0', sessions: [], tags: [] })).toBe(false)
  })

  it('returns false when settings is a primitive', () => {
    expect(validateBackupData({ version: '1.0', sessions: [], tags: [], settings: 'bad' })).toBe(false)
    expect(validateBackupData({ version: '1.0', sessions: [], tags: [], settings: 42 })).toBe(false)
  })

  it('accepts backup data with extra fields', () => {
    const data = {
      version: '2.0',
      exportedAt: '2026-01-01',
      sessions: [{ id: '1' }],
      tags: [{ id: 't1' }],
      settings: { apiKey: 'key' },
      extraField: true,
    }
    expect(validateBackupData(data)).toBe(true)
  })
})
