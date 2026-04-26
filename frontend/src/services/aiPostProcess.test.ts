import { describe, expect, it } from 'vitest'
import {
  parseAiBriefingResponse,
  parseSessionMindMapResponse,
  parseSessionQaResponse,
  isAiPostProcessConfigured,
  resolveTranscriptText,
} from './aiPostProcess'
import type { TranscriptSession } from '../types'

describe('aiPostProcess', () => {
  it('parses plain json responses', () => {
    const result = parseAiBriefingResponse(JSON.stringify({
      titleSuggestion: 'Weekly Sync',
      tagSuggestions: ['planning', 'release'],
      summary: 'A concise summary',
      actionItems: ['Ship the feature'],
      keywords: ['ai', 'summary'],
      chapters: [
        { title: 'Intro', summary: 'Context' },
      ],
    }), 'gpt-test')

    expect(result.titleSuggestion).toBe('Weekly Sync')
    expect(result.tagSuggestions).toEqual(['planning', 'release'])
    expect(result.summary).toBe('A concise summary')
    expect(result.actionItems).toEqual(['Ship the feature'])
    expect(result.keywords).toEqual(['ai', 'summary'])
    expect(result.chapters).toEqual([{ title: 'Intro', summary: 'Context' }])
    expect(result.model).toBe('gpt-test')
    expect(result.status).toBe('success')
  })

  it('parses fenced json responses', () => {
    const result = parseAiBriefingResponse(
      '```json\n{"summary":"Brief","keywords":["demo"]}\n```',
      'demo-model',
    )

    expect(result.summary).toBe('Brief')
    expect(result.keywords).toEqual(['demo'])
  })

  it('detects whether ai post-process is configured', () => {
    expect(isAiPostProcessConfigured({
      apiKey: '',
      languageHints: ['zh', 'en'],
      aiPostProcess: {
        enabled: true,
        provider: 'openai-compatible',
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'qwen2.5:7b',
      },
    })).toBe(true)

    expect(isAiPostProcessConfigured({
      apiKey: '',
      languageHints: ['zh', 'en'],
      aiPostProcess: {
        enabled: false,
        provider: 'openai-compatible',
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'qwen2.5:7b',
      },
    })).toBe(false)
  })

  it('parses session qa responses with citations', () => {
    const result = parseSessionQaResponse(JSON.stringify({
      answer: 'Alice suggested shipping this week.',
      citations: [
        { quote: 'We should ship it this week.', speakerLabel: 'Alice' },
      ],
    }), 'qwen-test')

    expect(result).toEqual({
      answer: 'Alice suggested shipping this week.',
      citations: [
        { quote: 'We should ship it this week.', speakerLabel: 'Alice' },
      ],
      model: 'qwen-test',
    })
  })

  it('parses session mind map responses', () => {
    const result = parseSessionMindMapResponse(JSON.stringify({
      title: 'Weekly Sync',
      markdown: '# Weekly Sync\n## Decisions\n### Ship this week',
    }), 'mindmap-model')

    expect(result).toEqual({
      title: 'Weekly Sync',
      markdown: '# Weekly Sync\n## Decisions\n### Ship this week',
      model: 'mindmap-model',
      status: 'success',
      error: undefined,
      generatedAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })
})

describe('resolveTranscriptText', () => {
  const baseSession = {
    id: 'test-1',
    title: 'Test',
    transcript: '  original raw transcript  ',
    createdAt: Date.now(),
    segments: [],
    speakers: [],
  } as unknown as TranscriptSession

  const sessionWithCorrection = {
    ...baseSession,
    correction: {
      status: 'done' as const,
      mode: 'quick' as const,
      correctedText: '  corrected clean transcript  ',
    },
  } as unknown as TranscriptSession

  const sessionCorrecting = {
    ...baseSession,
    correction: {
      status: 'correcting' as const,
      mode: 'quick' as const,
      correctedText: 'partial output',
    },
  } as unknown as TranscriptSession

  const sessionReset = {
    ...baseSession,
    correction: {
      status: 'idle' as const,
      mode: 'quick' as const,
      correctedText: undefined,
    },
  } as unknown as TranscriptSession

  const sessionEmptyCorrection = {
    ...baseSession,
    correction: {
      status: 'done' as const,
      mode: 'quick' as const,
      correctedText: '   ',
    },
  } as unknown as TranscriptSession

  it('auto: uses corrected text when available and done', () => {
    expect(resolveTranscriptText(sessionWithCorrection, 'auto'))
      .toBe('corrected clean transcript')
  })

  it('auto: falls back to original when no correction', () => {
    expect(resolveTranscriptText(baseSession, 'auto'))
      .toBe('original raw transcript')
  })

  it('auto: falls back to original when correction is still in progress', () => {
    expect(resolveTranscriptText(sessionCorrecting, 'auto'))
      .toBe('original raw transcript')
  })

  it('auto: falls back to original after reset (status=idle, correctedText=undefined)', () => {
    expect(resolveTranscriptText(sessionReset, 'auto'))
      .toBe('original raw transcript')
  })

  it('auto: falls back to original when correctedText is whitespace-only', () => {
    expect(resolveTranscriptText(sessionEmptyCorrection, 'auto'))
      .toBe('original raw transcript')
  })

  it('original: always uses original transcript even when corrected exists', () => {
    expect(resolveTranscriptText(sessionWithCorrection, 'original'))
      .toBe('original raw transcript')
  })

  it('corrected: uses corrected text when available', () => {
    expect(resolveTranscriptText(sessionWithCorrection, 'corrected'))
      .toBe('corrected clean transcript')
  })

  it('corrected: falls back to original when no correction available', () => {
    expect(resolveTranscriptText(baseSession, 'corrected'))
      .toBe('original raw transcript')
  })

  it('undefined preference defaults to auto behavior', () => {
    expect(resolveTranscriptText(sessionWithCorrection, undefined))
      .toBe('corrected clean transcript')
    expect(resolveTranscriptText(baseSession, undefined))
      .toBe('original raw transcript')
  })

  it('trims whitespace from both original and corrected text', () => {
    expect(resolveTranscriptText(baseSession, 'original'))
      .toBe('original raw transcript')
    expect(resolveTranscriptText(sessionWithCorrection, 'corrected'))
      .toBe('corrected clean transcript')
  })
})
