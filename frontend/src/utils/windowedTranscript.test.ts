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

  it('handles fuzzy overlap with punctuation differences (long enough)', () => {
    const committed = 'Hello world. The quick brown fox jumps over'
    const transcript = 'The quick brown fox jumps over the lazy dog'
    const result = stripLeadingTranscriptOverlap(transcript, committed)
    expect(result).toBe(' the lazy dog')
  })

  it('does not fuzzy-match when overlap is too short', () => {
    const result = stripLeadingTranscriptOverlap(
      '你好世界新内容',
      '某些之前的文字你好世界',
    )
    expect(result).toBe('新内容')
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

  it('deduplicates overlap when re-transcription has minor punctuation differences', () => {
    const committed = '搞懂金融与投资 欢迎收看本期初识金融业 我是楚国老张'
    const transcript = '我是楚国老张，既然这是第一期视频，大家此时对金融一定有很多好奇。'
    const result = buildWindowedTranscriptSnapshot(committed, transcript)
    expect(result).toBe('搞懂金融与投资 欢迎收看本期初识金融业 我是楚国老张，既然这是第一期视频，大家此时对金融一定有很多好奇。')
  })
})
