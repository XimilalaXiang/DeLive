import { afterEach, describe, expect, it, vi } from 'vitest'

// The store reads window/localStorage at import time; give it in-memory stand-ins.
vi.hoisted(() => {
  const memory = new Map<string, string>()
  const localStorageStub = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
    key: () => null,
    length: 0,
    clear: () => memory.clear(),
  }
  const globals = globalThis as Record<string, unknown>
  globals.localStorage = localStorageStub
  globals.window = { localStorage: localStorageStub, addEventListener() {}, removeEventListener() {} }
})

import { sessionRepository } from '../../utils/sessionRepository'
import { SESSION_AUTOSAVE_MAX_WAIT_MS, useSessionStore } from '../sessionStore'

afterEach(() => {
  useSessionStore.getState().endCurrentSession()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('current session autosave', () => {
  it('saves at least every SESSION_AUTOSAVE_MAX_WAIT_MS while events keep arriving', () => {
    vi.useFakeTimers()
    const saveProgress = vi.spyOn(sessionRepository, 'saveProgress')
    useSessionStore.getState().startNewSession()

    // 60 s of continuous speech: an event every 500 ms, never a 1.2 s pause.
    for (let i = 0; i < 120; i++) {
      useSessionStore.getState().applyTranscriptEvent({ type: 'final-text', text: `第${i}句。` })
      vi.advanceTimersByTime(500)
    }

    expect(saveProgress.mock.calls.length).toBeGreaterThanOrEqual(60_000 / SESSION_AUTOSAVE_MAX_WAIT_MS - 1)
  })

  it('still saves once shortly after speech pauses', () => {
    vi.useFakeTimers()
    const saveProgress = vi.spyOn(sessionRepository, 'saveProgress')
    useSessionStore.getState().startNewSession()

    useSessionStore.getState().applyTranscriptEvent({ type: 'final-text', text: '一句话。' })
    vi.advanceTimersByTime(1000)
    expect(saveProgress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(saveProgress).toHaveBeenCalledTimes(1)
  })
})
