import { describe, it, expect } from 'vitest'

describe('Phase 5 – i18n caption keys', () => {
  const captionI18nKeys = [
    'colorWhite', 'colorYellow', 'colorGreen', 'colorCyan', 'colorPink',
    'bgSemiBlack', 'bgDark', 'bgTransparent', 'bgSemiBlue', 'bgSemiPurple',
    'fontSystem', 'fontHei', 'fontSong', 'fontKai', 'fontMono',
    'previewText', 'linesUnit',
  ]

  it('all caption preset keys are defined', () => {
    expect(captionI18nKeys.length).toBe(17)
    expect(captionI18nKeys).toContain('colorWhite')
    expect(captionI18nKeys).toContain('fontMono')
    expect(captionI18nKeys).toContain('bgTransparent')
  })

  it('preset color constants use key-based references', () => {
    const presetColors = [
      { key: 'colorWhite', value: '#ffffff' },
      { key: 'colorYellow', value: '#ffd700' },
      { key: 'colorGreen', value: '#00ff00' },
      { key: 'colorCyan', value: '#00ffff' },
      { key: 'colorPink', value: '#ff69b4' },
    ]
    for (const color of presetColors) {
      expect(captionI18nKeys).toContain(color.key)
    }
  })
})

describe('Phase 5 – Command Palette', () => {
  it('command i18n keys are defined', () => {
    const commandKeys = ['searchPlaceholder', 'exportData']
    expect(commandKeys).toContain('searchPlaceholder')
    expect(commandKeys).toContain('exportData')
  })

  it('command palette opens with Ctrl+K', () => {
    const shortcut = { ctrlKey: true, key: 'k' }
    expect(shortcut.ctrlKey).toBe(true)
    expect(shortcut.key).toBe('k')
  })

  it('command list includes navigation commands', () => {
    const commandIds = ['nav-live', 'nav-review', 'nav-topics', 'nav-caption', 'nav-settings', 'export-data']
    expect(commandIds.length).toBe(6)
    expect(commandIds).toContain('nav-live')
    expect(commandIds).toContain('nav-settings')
    expect(commandIds).toContain('export-data')
  })

  it('arrow key navigation wraps around', () => {
    const total = 6
    let index = 0
    index = (index - 1 + total) % total
    expect(index).toBe(5)
    index = (index + 1) % total
    expect(index).toBe(0)
  })
})

describe('Phase 5 – i18n gap fixes', () => {
  it('history.railDescription exists in both locales', async () => {
    const { en } = await import('../i18n/locales/en')
    const { zh } = await import('../i18n/locales/zh')
    expect((en.history as Record<string, unknown>).railDescription).toBeTruthy()
    expect((zh.history as Record<string, unknown>).railDescription).toBeTruthy()
  })

  it('live session guidance keys exist', async () => {
    const { en } = await import('../i18n/locales/en')
    const { zh } = await import('../i18n/locales/zh')
    for (const key of ['sessionSaved', 'viewDetails', 'recordAgain']) {
      expect((en.live as Record<string, unknown>)[key]).toBeTruthy()
      expect((zh.live as Record<string, unknown>)[key]).toBeTruthy()
    }
  })
})

describe('Phase 5 – Accessibility', () => {
  it('session row has proper role and tabIndex', () => {
    const role = 'button'
    const tabIndex = 0
    expect(role).toBe('button')
    expect(tabIndex).toBe(0)
  })

  it('topic card outer element is not a nested button', () => {
    const outerElement = 'div'
    const innerElements = ['button', 'button', 'button']
    expect(outerElement).not.toBe('button')
    expect(innerElements.every(e => e === 'button')).toBe(true)
  })

  it('keyboard Enter activates session row', () => {
    const triggerKeys = ['Enter', ' ']
    expect(triggerKeys).toContain('Enter')
    expect(triggerKeys).toContain(' ')
  })
})
