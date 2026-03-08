import { describe, it, expect } from 'vitest'
import { generateSRT, generateVTT, generateSubtitleFromSession } from '../subtitleExport'
import type { TranscriptTokenData, TranscriptSession } from '../../types'

function makeTokens(count: number, durationMs = 2000): TranscriptTokenData[] {
  return Array.from({ length: count }, (_, i) => ({
    text: `Token ${i + 1}. `,
    startMs: i * durationMs,
    endMs: (i + 1) * durationMs,
  }))
}

function makeSession(overrides: Partial<TranscriptSession> = {}): TranscriptSession {
  return {
    id: 'test-1',
    title: 'Test Session',
    date: '2026-03-07',
    time: '12:00',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    transcript: 'Hello world. This is a test.',
    ...overrides,
  }
}

describe('generateSRT', () => {
  it('returns empty string for no tokens', () => {
    expect(generateSRT([])).toBe('')
  })

  it('produces valid SRT format', () => {
    const tokens = makeTokens(2)
    const srt = generateSRT(tokens)
    expect(srt).toContain('1\n')
    // Two short tokens get grouped into one subtitle
    expect(srt).toContain('00:00:00,000 --> 00:00:04,000')
    expect(srt).toContain('Token 1.')
    expect(srt).toContain('Token 2.')
  })

  it('uses comma in time codes (SRT convention)', () => {
    const tokens = makeTokens(1, 61500)
    const srt = generateSRT(tokens)
    expect(srt).toContain('00:00:00,000 --> 00:01:01,500')
  })

  it('includes speaker prefix when present', () => {
    const tokens: TranscriptTokenData[] = [
      { text: 'Hello', startMs: 0, endMs: 1000, speaker: 'Alice' },
    ]
    const srt = generateSRT(tokens, { includeSpeaker: true })
    expect(srt).toContain('[Alice]')
  })

  it('omits speaker prefix when disabled', () => {
    const tokens: TranscriptTokenData[] = [
      { text: 'Hello', startMs: 0, endMs: 1000, speaker: 'Alice' },
    ]
    const srt = generateSRT(tokens, { includeSpeaker: false })
    expect(srt).not.toContain('[Alice]')
  })

  it('handles hour-level timestamps', () => {
    const tokens: TranscriptTokenData[] = [
      { text: 'Late token', startMs: 3661000, endMs: 3662000 },
    ]
    const srt = generateSRT(tokens)
    expect(srt).toContain('01:01:01,000')
  })
})

describe('generateVTT', () => {
  it('starts with WEBVTT header', () => {
    const vtt = generateVTT([])
    expect(vtt.startsWith('WEBVTT')).toBe(true)
  })

  it('uses dot in time codes (VTT convention)', () => {
    const tokens = makeTokens(1, 1500)
    const vtt = generateVTT(tokens)
    expect(vtt).toContain('00:00:00.000 --> 00:00:01.500')
  })

  it('includes Kind/Language when title is provided', () => {
    const tokens = makeTokens(1)
    const vtt = generateVTT(tokens, { title: 'My Video' })
    expect(vtt).toContain('Kind: captions')
    expect(vtt).toContain('Language: auto')
  })

  it('uses <v> tag for speaker in VTT', () => {
    const tokens: TranscriptTokenData[] = [
      { text: 'Hello', startMs: 0, endMs: 1000, speaker: 'Bob' },
    ]
    const vtt = generateVTT(tokens, { includeSpeaker: true })
    expect(vtt).toContain('<v Bob>')
  })
})

describe('generateSubtitleFromSession', () => {
  it('uses tokens when available', () => {
    const session = makeSession({
      tokens: makeTokens(2),
    })
    const srt = generateSubtitleFromSession(session, 'srt')
    expect(srt).toContain('Token 1.')
    expect(srt).toContain('Token 2.')
  })

  it('falls back to transcript text when no tokens', () => {
    const session = makeSession({
      transcript: 'First sentence. Second sentence.',
    })
    const srt = generateSubtitleFromSession(session, 'srt')
    expect(srt).toContain('First sentence.')
    expect(srt).toContain('Second sentence.')
  })

  it('produces VTT format when requested', () => {
    const session = makeSession({ tokens: makeTokens(1) })
    const vtt = generateSubtitleFromSession(session, 'vtt')
    expect(vtt.startsWith('WEBVTT')).toBe(true)
  })

  it('handles empty transcript gracefully', () => {
    const session = makeSession({ transcript: '' })
    const srt = generateSubtitleFromSession(session, 'srt')
    expect(srt).toBe('')
  })
})
