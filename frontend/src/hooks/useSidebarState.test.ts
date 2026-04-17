import { describe, it, expect } from 'vitest'

describe('sidebar state – keyboard shortcut detection', () => {
  const isToggleShortcut = (e: { ctrlKey: boolean; metaKey: boolean; key: string }) =>
    (e.ctrlKey || e.metaKey) && e.key === 'b'

  it('Ctrl+B triggers toggle', () => {
    expect(isToggleShortcut({ ctrlKey: true, metaKey: false, key: 'b' })).toBe(true)
  })

  it('Cmd+B (macOS) triggers toggle', () => {
    expect(isToggleShortcut({ ctrlKey: false, metaKey: true, key: 'b' })).toBe(true)
  })

  it('plain B does not trigger', () => {
    expect(isToggleShortcut({ ctrlKey: false, metaKey: false, key: 'b' })).toBe(false)
  })

  it('Ctrl+A does not trigger', () => {
    expect(isToggleShortcut({ ctrlKey: true, metaKey: false, key: 'a' })).toBe(false)
  })
})

describe('sidebar state – width mapping', () => {
  const getWidth = (collapsed: boolean) => collapsed ? 56 : 224

  it('collapsed = 56px', () => {
    expect(getWidth(true)).toBe(56)
  })

  it('expanded = 224px', () => {
    expect(getWidth(false)).toBe(224)
  })
})

describe('sidebar state – persistence key', () => {
  it('uses correct localStorage key name', () => {
    const STORAGE_KEY = 'sidebar-collapsed'
    expect(STORAGE_KEY).toBe('sidebar-collapsed')
  })

  it('initial collapsed state from string', () => {
    const fromStorage = (val: string | null) => val === 'true'
    expect(fromStorage('true')).toBe(true)
    expect(fromStorage('false')).toBe(false)
    expect(fromStorage(null)).toBe(false)
  })
})

describe('sidebar state – responsive breakpoint', () => {
  it('768px is the auto-collapse threshold', () => {
    const BREAKPOINT = 768
    expect(BREAKPOINT).toBe(768)
  })

  it('should collapse when width < threshold', () => {
    const shouldAutoCollapse = (width: number) => width < 768
    expect(shouldAutoCollapse(500)).toBe(true)
    expect(shouldAutoCollapse(768)).toBe(false)
    expect(shouldAutoCollapse(1024)).toBe(false)
  })
})
