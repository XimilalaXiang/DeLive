/**
 * Matches replies to requests by id, so concurrent requests of the same kind
 * each get their own reply. Used by the Open API, which asks the renderer for
 * data over IPC and waits for the answer.
 */
export interface PendingRequests {
  /**
   * Starts a request of the given kind; resolves with the reply, or with
   * `fallback` after the timeout.
   */
  create<T>(kind: string, fallback: T): { id: number; promise: Promise<T> }
  /**
   * Delivers a reply. Unknown or already-settled ids, and replies of a
   * different kind than the request, are ignored.
   */
  resolve(kind: string, id: number, value: unknown): void
  size(): number
}

export function createPendingRequests(timeoutMs: number): PendingRequests {
  let nextId = 1
  const pending = new Map<number, { kind: string; resolve: (value: unknown) => void; timer: ReturnType<typeof setTimeout> }>()

  return {
    create<T>(kind: string, fallback: T) {
      const id = nextId++
      const promise = new Promise<T>((resolve) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          resolve(fallback)
        }, timeoutMs)
        pending.set(id, { kind, resolve: resolve as (value: unknown) => void, timer })
      })
      return { id, promise }
    },
    resolve(kind, id, value) {
      const entry = pending.get(id)
      if (!entry || entry.kind !== kind) return
      pending.delete(id)
      clearTimeout(entry.timer)
      entry.resolve(value)
    },
    size() {
      return pending.size
    },
  }
}
