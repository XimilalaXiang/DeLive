import { describe, expect, it } from 'vitest'
import {
  buildWindowedTranscriptSnapshot,
  stripLeadingTranscriptOverlap,
} from './windowedTranscript'

describe('stripLeadingTranscriptOverlap', () => {
  it('removes the overlapping prefix already present in committed text', () => {
    expect(
      stripLeadingTranscriptOverlap('How are you today?', 'Hello world. How are'),
    ).toBe(' you today?')
  })

  it('returns the original transcript when no overlap exists', () => {
    expect(
      stripLeadingTranscriptOverlap('Fresh start', 'Existing transcript'),
    ).toBe('Fresh start')
  })

  it('returns the original transcript when committed text is empty', () => {
    expect(stripLeadingTranscriptOverlap('Hello', '')).toBe('Hello')
  })

  it('handles fuzzy overlap with punctuation/space differences', () => {
    const result = stripLeadingTranscriptOverlap(
      'How are you today',
      'Hello world. How are',
    )
    expect(result).toBe(' you today')
  })
})

describe('buildWindowedTranscriptSnapshot', () => {
  it('builds a synthetic full-session snapshot from committed text and rolling transcript', () => {
    expect(
      buildWindowedTranscriptSnapshot('Hello world. How are', 'How are you today?'),
    ).toBe('Hello world. How are you today?')
  })

  it('appends the transcript directly when there is no overlap', () => {
    expect(
      buildWindowedTranscriptSnapshot('Committed: ', 'new text'),
    ).toBe('Committed: new text')
  })

  it('deduplicates when transcript is a re-transcription of the same audio window', () => {
    const committed = 'Hello world how are you'
    const transcript = 'Hello world, how are you? I am fine.'
    const result = buildWindowedTranscriptSnapshot(committed, transcript)
    expect(result).toBe('Hello world how are you? I am fine.')
  })

  it('deduplicates Chinese retranscription with minor punctuation differences', () => {
    const committed = '你好世界你好吗'
    const transcript = '你好世界，你好吗？我很好。'
    const result = buildWindowedTranscriptSnapshot(committed, transcript)
    expect(result).toBe('你好世界你好吗？我很好。')
  })
})
