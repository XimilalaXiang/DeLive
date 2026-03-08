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
})
