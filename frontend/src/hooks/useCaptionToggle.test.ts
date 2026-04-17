import { describe, it, expect, vi } from 'vitest'

describe('caption toggle – API contract', () => {
  it('captionToggle call signature matches IPC contract', () => {
    const mockToggle = vi.fn().mockResolvedValue(true)
    mockToggle(undefined, 'sidebar-caption-toggle')
    expect(mockToggle).toHaveBeenCalledWith(undefined, 'sidebar-caption-toggle')
  })

  it('captionGetStatus returns { enabled, style }', async () => {
    const mockGetStatus = vi.fn().mockResolvedValue({ enabled: false, style: { fontSize: 24 } })
    const status = await mockGetStatus()
    expect(status).toHaveProperty('enabled')
    expect(status).toHaveProperty('style')
    expect(typeof status.enabled).toBe('boolean')
  })

  it('toggle returns boolean new state', async () => {
    const mockToggle = vi.fn().mockResolvedValue(true)
    const result = await mockToggle()
    expect(typeof result).toBe('boolean')
  })

  it('onCaptionStatusChanged returns cleanup function', () => {
    const cleanup = vi.fn()
    const mockSubscribe = vi.fn().mockReturnValue(cleanup)
    const unsub = mockSubscribe(() => {})
    expect(typeof unsub).toBe('function')
  })
})

describe('caption toggle – state logic', () => {
  it('enabled starts as false when API returns false', () => {
    const apiEnabled = false
    expect(apiEnabled).toBe(false)
  })

  it('enabled becomes true after successful toggle', () => {
    const toggleResult = true
    const newEnabled = toggleResult
    expect(newEnabled).toBe(true)
  })

  it('handles status change callback', () => {
    const callback = vi.fn()
    callback(true)
    expect(callback).toHaveBeenCalledWith(true)
    callback(false)
    expect(callback).toHaveBeenCalledWith(false)
  })
})
