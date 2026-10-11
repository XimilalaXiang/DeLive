import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPendingRequests } from '../../../../shared/pendingRequests'

afterEach(() => {
  vi.useRealTimers()
})

describe('createPendingRequests', () => {
  it('gives concurrent requests of the same kind their own replies', async () => {
    const pending = createPendingRequests(5000)
    const a = pending.create<string | null>(null)
    const b = pending.create<string | null>(null)

    // Replies arrive in request order, as the renderer sends them.
    pending.resolve(a.id, 'session A')
    pending.resolve(b.id, 'session B')

    await expect(a.promise).resolves.toBe('session A')
    await expect(b.promise).resolves.toBe('session B')
    expect(pending.size()).toBe(0)
  })

  it('handles replies that arrive out of order', async () => {
    const pending = createPendingRequests(5000)
    const a = pending.create(0)
    const b = pending.create(0)
    pending.resolve(b.id, 2)
    pending.resolve(a.id, 1)
    await expect(Promise.all([a.promise, b.promise])).resolves.toEqual([1, 2])
  })

  it('resolves with the fallback after the timeout and ignores late replies', async () => {
    vi.useFakeTimers()
    const pending = createPendingRequests(5000)
    const request = pending.create<string[]>([])
    vi.advanceTimersByTime(5000)
    await expect(request.promise).resolves.toEqual([])
    pending.resolve(request.id, ['late'])
    expect(pending.size()).toBe(0)
  })

  it('ignores replies for unknown ids', () => {
    const pending = createPendingRequests(5000)
    expect(() => pending.resolve(999, 'x')).not.toThrow()
  })
})
