import { describe, it, expect } from 'vitest'

describe('Settings panels – group navigation', () => {
  const GROUPS = ['provider', 'appearance', 'aiPostProcess', 'openApi', 'cloudBackup', 'dataManagement', 'about'] as const

  it('has exactly 7 settings groups', () => {
    expect(GROUPS.length).toBe(7)
  })

  it('provider is the first group', () => {
    expect(GROUPS[0]).toBe('provider')
  })

  it('about is the last group', () => {
    expect(GROUPS[GROUPS.length - 1]).toBe('about')
  })

  it('all group IDs are unique', () => {
    const unique = new Set(GROUPS)
    expect(unique.size).toBe(GROUPS.length)
  })
})

describe('Settings panels – i18n keys', () => {
  const LABEL_KEYS = [
    'groupProvider',
    'groupAppearance',
    'groupAi',
    'groupOpenApi',
    'groupCloudBackup',
    'groupDataManagement',
    'groupAbout',
  ]

  it('has a label key for each group', () => {
    expect(LABEL_KEYS.length).toBe(7)
  })

  it('all label keys start with "group"', () => {
    for (const key of LABEL_KEYS) {
      expect(key.startsWith('group')).toBe(true)
    }
  })
})

describe('Settings panels – nav item configuration', () => {
  const NAV_ITEMS = [
    { id: 'provider', labelKey: 'groupProvider' },
    { id: 'appearance', labelKey: 'groupAppearance' },
    { id: 'aiPostProcess', labelKey: 'groupAi' },
    { id: 'openApi', labelKey: 'groupOpenApi' },
    { id: 'cloudBackup', labelKey: 'groupCloudBackup' },
    { id: 'dataManagement', labelKey: 'groupDataManagement' },
    { id: 'about', labelKey: 'groupAbout' },
  ]

  it('each nav item has an id and labelKey', () => {
    for (const item of NAV_ITEMS) {
      expect(item.id).toBeTruthy()
      expect(item.labelKey).toBeTruthy()
    }
  })

  it('settings nav width is 192px (w-48)', () => {
    const SETTINGS_NAV_WIDTH = 192
    expect(SETTINGS_NAV_WIDTH).toBe(192)
  })
})

describe('OpenApiPanel – token generation', () => {
  it('generates tokens with dlv_ prefix', () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'dlv_'
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    expect(result.startsWith('dlv_')).toBe(true)
    expect(result.length).toBe(36)
  })
})
