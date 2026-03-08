import { describe, it, expect } from 'vitest'
import { generateSRT, generateVTT, generateSubtitleFromSession } from './subtitleExport'
import type { TranscriptTokenData, TranscriptSession } from '../types'

function makeTokens(): TranscriptTokenData[] {
  return [
    { text: 'Hello world.', startMs: 0, endMs: 2000 },
    { text: ' This is a test.', startMs: 2000, endMs: 4000 },
    { text: ' Final sentence.', startMs: 4500, endMs: 6500 },
  ]
}

function makeSession(overrides: Partial<TranscriptSession> = {}): TranscriptSession {
  return {
    id: 'test-session',
    title: 'Test Session',
    date: '2026-03-07',
    time: '12:00',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    transcript: 'Hello world. This is a test. Final sentence.',
    ...overrides,
  }
}

describe('generateSRT', () => {
  it('generates valid SRT with sequence numbers and timestamps', () => {
    const srt = generateSRT(makeTokens())
    expect(srt).toContain('1\n')
    // First two tokens are grouped (total chars < 40, duration < 5s)
    expect(srt).toContain('00:00:00,000 --> 00:00:04,000')
    expect(srt).toContain('Hello world.')
  })

  it('uses comma separator for SRT timestamps', () => {
    const srt = generateSRT([{ text: 'Test', startMs: 1500, endMs: 3500 }])
    expect(srt).toContain('00:00:01,500 --> 00:00:03,500')
  })

  it('returns empty string for empty tokens', () => {
    expect(generateSRT([])).toBe('')
  })

  it('includes speaker prefix when available', () => {
    const tokens: TranscriptTokenData[] = [
      { text: 'Hello', startMs: 0, endMs: 1000, speaker: 'Alice' },
    ]
    const srt = generateSRT(tokens, { includeSpeaker: true })
    expect(srt).toContain('[Alice]')
  })

  it('excludes speaker prefix when disabled', () => {
    const tokens: TranscriptTokenData[] = [
      { text: 'Hello', startMs: 0, endMs: 1000, speaker: 'Alice' },
    ]
    const srt = generateSRT(tokens, { includeSpeaker: false })
    expect(srt).not.toContain('[Alice]')
  })

  it('formats hours correctly for long timestamps', () => {
    const tokens: TranscriptTokenData[] = [
      { text: 'Long session', startMs: 3661500, endMs: 3665000 },
    ]
    const srt = generateSRT(tokens)
    expect(srt).toContain('01:01:01,500')
  })
})

describe('generateVTT', () => {
  it('starts with WEBVTT header', () => {
    const vtt = generateVTT(makeTokens())
    expect(vtt.startsWith('WEBVTT\n')).toBe(true)
  })

  it('uses dot separator for VTT timestamps', () => {
    const vtt = generateVTT([{ text: 'Test', startMs: 1500, endMs: 3500 }])
    expect(vtt).toContain('00:00:01.500 --> 00:00:03.500')
  })

  it('includes Kind/Language when title is provided', () => {
    const vtt = generateVTT(makeTokens(), { title: 'My Video' })
    expect(vtt).toContain('Kind: captions')
    expect(vtt).toContain('Language: auto')
  })

  it('uses voice tag for speaker in VTT', () => {
    const tokens: TranscriptTokenData[] = [
      { text: 'Hello', startMs: 0, endMs: 1000, speaker: 'Bob' },
    ]
    const vtt = generateVTT(tokens)
    expect(vtt).toContain('<v Bob>')
  })
})

describe('generateSubtitleFromSession', () => {
  it('uses tokens when available', () => {
    const session = makeSession({ tokens: makeTokens() })
    const srt = generateSubtitleFromSession(session, 'srt')
    expect(srt).toContain('00:00:00,000')
    expect(srt).toContain('Hello world.')
  })

  it('falls back to transcript splitting when no tokens', () => {
    const session = makeSession({ tokens: undefined })
    const srt = generateSubtitleFromSession(session, 'srt')
    expect(srt).toContain('Hello world.')
    expect(srt).toContain('This is a test.')
  })

  it('generates VTT format when requested', () => {
    const session = makeSession({ tokens: makeTokens() })
    const vtt = generateSubtitleFromSession(session, 'vtt')
    expect(vtt.startsWith('WEBVTT\n')).toBe(true)
  })

  it('defaults to SRT format', () => {
    const session = makeSession({ tokens: makeTokens() })
    const result = generateSubtitleFromSession(session)
    expect(result).not.toContain('WEBVTT')
    expect(result).toContain('-->')
  })
})
