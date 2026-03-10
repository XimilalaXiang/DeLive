import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TranscriptSession } from '../types'

const sessionStorageMock = vi.hoisted(() => ({
  getSessions: vi.fn<() => Promise<TranscriptSession[]>>(),
  saveSessions: vi.fn<(sessions: TranscriptSession[]) => Promise<void>>(),
  upsertSession: vi.fn<(session: TranscriptSession) => Promise<void>>(),
  upsertSessions: vi.fn<(sessions: TranscriptSession[]) => Promise<void>>(),
  deleteSessionById: vi.fn<(sessionId: string) => Promise<void>>(),
}))

vi.mock('./sessionStorage', () => sessionStorageMock)

function makeSession(overrides: Partial<TranscriptSession> = {}): TranscriptSession {
  return {
    id: 'session-1',
    title: 'Test Session',
    date: '2026-03-09',
    time: '12:00',
    createdAt: 1,
    updatedAt: 1,
    transcript: '',
    ...overrides,
  }
}

describe('sessionRepository persistence strategy', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    sessionStorageMock.getSessions.mockResolvedValue([])
    sessionStorageMock.saveSessions.mockResolvedValue(undefined)
    sessionStorageMock.upsertSession.mockResolvedValue(undefined)
    sessionStorageMock.upsertSessions.mockResolvedValue(undefined)
    sessionStorageMock.deleteSessionById.mockResolvedValue(undefined)
  })

  it('persists draft creation via single-session upsert', async () => {
    const { sessionRepository } = await import('./sessionRepository')
    const draft = makeSession({ id: 'draft-1' })

    const sessions = sessionRepository.createDraft(draft)

    expect(sessions[0].id).toBe('draft-1')
    expect(sessionStorageMock.upsertSession).toHaveBeenCalledTimes(1)
    expect(sessionStorageMock.upsertSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'draft-1' }),
    )
    expect(sessionStorageMock.saveSessions).not.toHaveBeenCalled()
  })

  it('persists progress updates via single-session upsert', async () => {
    const { sessionRepository } = await import('./sessionRepository')
    const draft = makeSession({ id: 'draft-2' })

    sessionRepository.createDraft(draft)
    sessionStorageMock.upsertSession.mockClear()

    const sessions = sessionRepository.saveProgress('draft-2', {
      transcript: 'hello world',
    })

    expect(sessions[0].transcript).toBe('hello world')
    expect(sessionStorageMock.upsertSession).toHaveBeenCalledTimes(1)
    expect(sessionStorageMock.upsertSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'draft-2',
        transcript: 'hello world',
        status: 'recording',
      }),
    )
    expect(sessionStorageMock.saveSessions).not.toHaveBeenCalled()
  })

  it('marks interrupted sessions in batch on launch recovery', async () => {
    sessionStorageMock.getSessions.mockResolvedValue([
      makeSession({ id: 'recording-1', status: 'recording', transcript: 'alpha' }),
      makeSession({ id: 'completed-1', status: 'completed', transcript: 'beta' }),
      makeSession({ id: 'recording-2', status: 'recording', transcript: 'gamma' }),
    ])

    const { sessionRepository } = await import('./sessionRepository')
    const result = await sessionRepository.loadForLaunch()

    expect(result.sessions.filter((session) => session.status === 'interrupted')).toHaveLength(2)
    expect(sessionStorageMock.upsertSessions).toHaveBeenCalledTimes(1)
    const persistedSessions = sessionStorageMock.upsertSessions.mock.calls[0]?.[0] ?? []
    expect(persistedSessions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'recording-1', status: 'interrupted' }),
      expect.objectContaining({ id: 'recording-2', status: 'interrupted' }),
    ]))
    expect(sessionStorageMock.saveSessions).not.toHaveBeenCalled()
  })

  it('persists upgraded sessions on launch even without interruption', async () => {
    sessionStorageMock.getSessions.mockResolvedValue([
      makeSession({ id: 'legacy-1', schemaVersion: 1, tagIds: undefined }),
    ])

    const { sessionRepository } = await import('./sessionRepository')
    const result = await sessionRepository.loadForLaunch()

    expect(result.sessions[0]).toEqual(expect.objectContaining({
      id: 'legacy-1',
      schemaVersion: 3,
      tagIds: [],
    }))
    expect(sessionStorageMock.upsertSessions).toHaveBeenCalledTimes(1)
    expect(sessionStorageMock.upsertSessions).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'legacy-1', schemaVersion: 3 }),
    ])
  })

  it('uses full replace only for replaceAllSessions', async () => {
    const { sessionRepository } = await import('./sessionRepository')
    const sessions = [
      makeSession({ id: 'session-a' }),
      makeSession({ id: 'session-b', createdAt: 2, updatedAt: 2 }),
    ]

    sessionRepository.replaceAllSessions(sessions)

    expect(sessionStorageMock.saveSessions).toHaveBeenCalledTimes(1)
    expect(sessionStorageMock.upsertSession).not.toHaveBeenCalled()
    expect(sessionStorageMock.upsertSessions).not.toHaveBeenCalled()
  })
})
