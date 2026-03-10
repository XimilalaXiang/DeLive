import { describe, expect, it, vi } from 'vitest'
import {
  buildRuntimeStateFromSession,
  createDraftSession,
  mergeSessionPostProcess,
} from './sessionLifecycle'

describe('sessionLifecycle', () => {
  it('creates a draft session with stable metadata', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:30:00Z'))

    const draft = createDraftSession({
      title: 'Meeting Notes',
      providerId: 'soniox',
      sourceMeta: {
        captureMode: 'system-audio',
        platform: 'win32',
        providerMode: 'realtime',
      },
    })

    expect(draft).toEqual(expect.objectContaining({
      title: 'Meeting Notes',
      providerId: 'soniox',
      transcript: '',
      tagIds: [],
      status: 'recording',
      sourceMeta: {
        captureMode: 'system-audio',
        platform: 'win32',
        providerMode: 'realtime',
      },
    }))
    expect(draft.id).toBeTruthy()
    expect(draft.lastPersistedAt).toBe(draft.createdAt)

    vi.useRealTimers()
  })

  it('restores runtime state from a persisted session', () => {
    const runtimeState = buildRuntimeStateFromSession({
      id: 'session-1',
      title: 'Recovered Session',
      date: '2026-03-10',
      time: '18:00',
      createdAt: 1000,
      updatedAt: 2000,
      transcript: '',
      tokens: [
        { text: 'Hello ', isFinal: true, speaker: 'speaker_1' },
        { text: 'world', isFinal: true, speaker: 'speaker_1' },
      ],
      translatedTranscript: {
        text: '你好世界',
      },
    })

    expect(runtimeState.finalTranscript).toBe('Hello world')
    expect(runtimeState.currentTranscript).toBe('Hello world')
    expect(runtimeState.finalTranslatedTranscript).toBe('你好世界')
    expect(runtimeState.currentSpeakers).toHaveLength(1)
    expect(runtimeState.currentSegments).toHaveLength(1)
  })

  it('merges post-process patches while preserving earlier fields', () => {
    const merged = mergeSessionPostProcess(
      {
        summary: 'Summary',
        keywords: ['asr'],
      },
      {
        actionItems: ['Ship transcript refactor'],
      },
      123,
    )

    expect(merged).toEqual({
      summary: 'Summary',
      keywords: ['asr'],
      actionItems: ['Ship transcript refactor'],
      generatedAt: 123,
    })
  })

  it('does not stamp generatedAt for status-only patches', () => {
    const merged = mergeSessionPostProcess(
      {
        summary: 'Summary',
        generatedAt: 456,
      },
      {
        status: 'pending',
      },
      123,
    )

    expect(merged).toEqual({
      summary: 'Summary',
      status: 'pending',
      generatedAt: 456,
    })
  })
})
