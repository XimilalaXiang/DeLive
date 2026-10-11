import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPendingRequests } from '../../../../shared/pendingRequests'

afterEach(() => {
  vi.useRealTimers()
})

describe('createPendingRequests', () => {
  it('gives concurrent requests of the same kind their own replies', async () => {
    const pending = createPendingRequests(5000)
    const a = pending.create<string | null>('detail', null)
    const b = pending.create<string | null>('detail', null)

    // Replies arrive in request order, as the renderer sends them.
    pending.resolve('detail', a.id, 'session A')
    pending.resolve('detail', b.id, 'session B')

    await expect(a.promise).resolves.toBe('session A')
    await expect(b.promise).resolves.toBe('session B')
    expect(pending.size()).toBe(0)
  })

  it('handles replies that arrive out of order', async () => {
    const pending = createPendingRequests(5000)
    const a = pending.create('detail', 0)
    const b = pending.create('detail', 0)
    pending.resolve('detail', b.id, 2)
    pending.resolve('detail', a.id, 1)
    await expect(Promise.all([a.promise, b.promise])).resolves.toEqual([1, 2])
  })

  it('resolves with the fallback after the timeout and ignores late replies', async () => {
    vi.useFakeTimers()
    const pending = createPendingRequests(5000)
    const request = pending.create<string[]>('detail', [])
    vi.advanceTimersByTime(5000)
    await expect(request.promise).resolves.toEqual([])
    pending.resolve('detail', request.id, ['late'])
    expect(pending.size()).toBe(0)
  })

  it('ignores a reply of a different kind than the request', async () => {
    vi.useFakeTimers()
    const pending = createPendingRequests(5000)
    const sessions = pending.create<string[]>('sessions', [])
    pending.resolve('detail', sessions.id, { id: 'A' })
    expect(pending.size()).toBe(1)
    pending.resolve('sessions', sessions.id, ['A'])
    await expect(sessions.promise).resolves.toEqual(['A'])
  })

  it('ignores replies for unknown ids', () => {
    const pending = createPendingRequests(5000)
    expect(() => pending.resolve('detail', 999, 'x')).not.toThrow()
  })
})
