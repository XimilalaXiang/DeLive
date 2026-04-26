import { describe, expect, it, vi } from 'vitest'
import {
  applyTranscriptEvent,
  buildSegmentsFromTokens,
  buildSpeakersFromTokens,
  createEmptyTranscriptRuntimeState,
  hasPostProcessContent,
} from './transcriptState'

describe('transcriptState', () => {
  it('derives speakers and segments from final tokens', () => {
    const tokens = [
      { text: 'Hello ', isFinal: true, speaker: 'speaker_1', language: 'en', startMs: 0, endMs: 400 },
      { text: 'world', isFinal: true, speaker: 'speaker_1', language: 'en', startMs: 400, endMs: 900 },
      { text: '你好', isFinal: true, speaker: 'speaker_2', language: 'zh', startMs: 900, endMs: 1300 },
    ]

    expect(buildSpeakersFromTokens(tokens)).toEqual([
      { id: 'speaker_1', label: 'speaker_1', displayName: 'speaker_1' },
      { id: 'speaker_2', label: 'speaker_2', displayName: 'speaker_2' },
    ])

    expect(buildSegmentsFromTokens(tokens)).toEqual([
      {
        text: 'Hello world',
        startMs: 0,
        endMs: 900,
        speakerId: 'speaker_1',
        language: 'en',
        isFinal: true,
      },
      {
        text: '你好',
        startMs: 900,
        endMs: 1300,
        speakerId: 'speaker_2',
        language: 'zh',
        isFinal: true,
      },
    ])
  })

  it('applies token events into a unified runtime state', () => {
    const initial = createEmptyTranscriptRuntimeState()

    const next = applyTranscriptEvent(initial, {
      type: 'tokens',
      tokens: [
        { text: 'Hello ', isFinal: true, speaker: 'speaker_1' },
        { text: 'world', isFinal: false },
        { text: 'Bonjour', isFinal: true, translationStatus: 'translation' },
        { text: ' le monde', isFinal: false, translationStatus: 'translation' },
      ],
    })

    expect(next.finalTranscript).toBe('Hello ')
    expect(next.nonFinalTranscript).toBe('world')
    expect(next.currentTranscript).toBe('Hello world')
    expect(next.finalTranslatedTranscript).toBe('Bonjour')
    expect(next.nonFinalTranslatedTranscript).toBe(' le monde')
    expect(next.currentTranslatedTranscript).toBe('Bonjour le monde')
    expect(next.currentSpeakers).toHaveLength(1)
    expect(next.currentSegments).toHaveLength(1)
  })

  it('applies partial and final text events without going through token compatibility', () => {
    const withFinal = {
      ...createEmptyTranscriptRuntimeState(),
      finalTranscript: 'Hello ',
      currentTranscript: 'Hello ',
    }

    const withPartial = applyTranscriptEvent(withFinal, {
      type: 'partial-text',
      text: 'world',
    })
    expect(withPartial.nonFinalTranscript).toBe('world')
    expect(withPartial.currentTranscript).toBe('Hello world')

    const withCommittedFinal = applyTranscriptEvent(withPartial, {
      type: 'final-text',
      text: 'world.',
    })
    expect(withCommittedFinal.finalTranscript).toBe('Hello world.')
    expect(withCommittedFinal.nonFinalTranscript).toBe('')
    expect(withCommittedFinal.currentTranscript).toBe('Hello world.')
  })

  it('preserves text from prior providers after config-change + tokens', () => {
    let state = createEmptyTranscriptRuntimeState()

    state = applyTranscriptEvent(state, {
      type: 'tokens',
      tokens: [{ text: 'Hello from Soniox. ', isFinal: true, speaker: 's1' }],
    })
    expect(state.finalTranscript).toBe('Hello from Soniox. ')

    state = applyTranscriptEvent(state, {
      type: 'config-change',
      description: 'Provider: soniox → volcengine',
    })
    expect(state.finalTranscript).toContain('Hello from Soniox. ')
    expect(state.finalTranscript).toContain('Provider: soniox → volcengine')
    expect(state.finalTokens).toHaveLength(0)

    state = applyTranscriptEvent(state, { type: 'final-text', text: '火山引擎的文本。' })
    expect(state.finalTranscript).toContain('火山引擎的文本。')

    state = applyTranscriptEvent(state, {
      type: 'config-change',
      description: 'Provider: volcengine → soniox',
    })
    expect(state.finalTranscript).toContain('Hello from Soniox. ')
    expect(state.finalTranscript).toContain('火山引擎的文本。')

    state = applyTranscriptEvent(state, {
      type: 'tokens',
      tokens: [{ text: 'New Soniox text', isFinal: true, speaker: 's1' }],
    })
    expect(state.finalTranscript).toContain('Hello from Soniox. ')
    expect(state.finalTranscript).toContain('火山引擎的文本。')
    expect(state.finalTranscript).toContain('New Soniox text')
  })

  it('merges post-process patches and reports content correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-09T12:00:00Z'))

    const state = applyTranscriptEvent(createEmptyTranscriptRuntimeState(), {
      type: 'post-process',
      patch: {
        summary: 'Key points',
        actionItems: ['Ship P0 transcript reducer'],
      },
    })

    expect(state.currentPostProcess).toEqual({
      summary: 'Key points',
      actionItems: ['Ship P0 transcript reducer'],
      generatedAt: new Date('2026-03-09T12:00:00Z').getTime(),
    })
    expect(hasPostProcessContent(state.currentPostProcess)).toBe(true)
    expect(hasPostProcessContent(undefined)).toBe(false)

    vi.useRealTimers()
  })
})
