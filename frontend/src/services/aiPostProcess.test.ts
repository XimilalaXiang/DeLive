import { describe, expect, it } from 'vitest'
import {
  parseAiBriefingResponse,
  parseSessionMindMapResponse,
  parseSessionQaResponse,
  isAiPostProcessConfigured,
} from './aiPostProcess'

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
