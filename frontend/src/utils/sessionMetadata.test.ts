import { describe, expect, it } from 'vitest'
import {
  applySessionDeletion,
  applySessionMetadataUpdate,
  updateSessionInCollection,
} from './sessionMetadata'
import type { TranscriptSession } from '../types'

function makeSession(overrides: Partial<TranscriptSession> = {}): TranscriptSession {
  return {
    id: 'session-1',
    title: 'Session',
    date: '2026-03-10',
    time: '12:00',
    createdAt: 1,
    updatedAt: 1,
    transcript: '',
    ...overrides,
  }
}

describe('sessionMetadata', () => {
  it('updates a session in collection with fresh updatedAt', () => {
    const updated = updateSessionInCollection(
      [makeSession(), makeSession({ id: 'session-2' })],
      'session-1',
      { title: 'Updated' },
    )

    expect(updated[0].title).toBe('Updated')
    expect(updated[0].updatedAt).toBeGreaterThanOrEqual(1)
    expect(updated[1].title).toBe('Session')
  })

  it('applies metadata updates to sessions, recovery, and current mirrors', () => {
    const sessions = [makeSession({
      speakers: [{ id: 'speaker-1', label: 'speaker-1' }],
      postProcess: { summary: 'Old summary' },
    })]

    const result = applySessionMetadataUpdate(
      sessions,
      'session-1',
      {
        speakers: [{ id: 'speaker-2', label: 'speaker-2', displayName: 'Speaker 2' }],
        postProcess: { summary: 'New summary' },
      },
      {
        currentSessionId: 'session-1',
        currentSpeakers: [{ id: 'speaker-1', label: 'speaker-1' }],
        currentPostProcess: { summary: 'Old summary' },
        recoverySession: makeSession({ id: 'session-1' }),
      },
    )

    expect(result.sessions[0].speakers).toEqual([
      { id: 'speaker-2', label: 'speaker-2', displayName: 'Speaker 2' },
    ])
    expect(result.currentSpeakers).toEqual([
      { id: 'speaker-2', label: 'speaker-2', displayName: 'Speaker 2' },
    ])
    expect(result.currentPostProcess).toEqual({ summary: 'New summary' })
    expect(result.recoverySession?.postProcess).toEqual({ summary: 'New summary' })
  })

  it('applies session deletion to recovery mirror', () => {
    const result = applySessionDeletion(
      [makeSession(), makeSession({ id: 'session-2' })],
      'session-1',
      makeSession(),
    )

    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].id).toBe('session-2')
    expect(result.recoverySession).toBeNull()
  })
})
