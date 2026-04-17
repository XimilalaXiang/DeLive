import { describe, expect, it } from 'vitest'
import type { TranscriptSession } from '../types'
import type { SessionSummary, SessionDetail } from '../../../shared/electronApi'

function toSessionSummary(session: TranscriptSession): SessionSummary {
  return {
    id: session.id,
    title: session.title,
    date: session.date,
    time: session.time,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    duration: session.duration,
    status: session.status,
    topicId: session.topicId,
    tagIds: session.tagIds,
    providerId: session.providerId,
    hasSummary: Boolean(session.postProcess?.summary),
    hasMindMap: Boolean(session.mindMap?.markdown),
    transcriptLength: session.transcript?.length ?? 0,
  }
}

function toSessionDetail(session: TranscriptSession): SessionDetail {
  return {
    id: session.id,
    title: session.title,
    date: session.date,
    time: session.time,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    duration: session.duration,
    status: session.status,
    topicId: session.topicId,
    tagIds: session.tagIds,
    providerId: session.providerId,
    transcript: session.transcript ?? '',
    translatedTranscript: session.translatedTranscript
      ? { text: session.translatedTranscript.text, targetLanguage: session.translatedTranscript.targetLanguage }
      : undefined,
    tokens: session.tokens?.map(t => ({
      text: t.text,
      isFinal: t.isFinal,
      startMs: t.startMs,
      endMs: t.endMs,
      speaker: t.speaker,
    })),
    speakers: session.speakers?.map(s => ({
      id: s.id,
      label: s.label,
      displayName: s.displayName,
    })),
    segments: session.segments?.map(s => ({
      text: s.text,
      translatedText: s.translatedText,
      startMs: s.startMs,
      endMs: s.endMs,
      speakerId: s.speakerId,
    })),
    postProcess: session.postProcess
      ? {
          summary: session.postProcess.summary,
          actionItems: session.postProcess.actionItems,
          keywords: session.postProcess.keywords,
          titleSuggestion: session.postProcess.titleSuggestion,
          tagSuggestions: session.postProcess.tagSuggestions,
          generatedAt: session.postProcess.generatedAt,
          status: session.postProcess.status,
        }
      : undefined,
    mindMap: session.mindMap
      ? {
          markdown: session.mindMap.markdown,
          title: session.mindMap.title,
          generatedAt: session.mindMap.generatedAt,
          status: session.mindMap.status,
        }
      : undefined,
    askHistory: session.askHistory?.map(turn => ({
      id: turn.id,
      question: turn.question,
      answer: turn.answer,
      createdAt: turn.createdAt,
      status: turn.status,
    })),
  }
}

function makeSession(overrides: Partial<TranscriptSession> = {}): TranscriptSession {
  return {
    id: 'test-1',
    title: 'Test Session',
    date: '2026-04-17',
    time: '14:30',
    createdAt: 1713340200000,
    updatedAt: 1713340200000,
    transcript: 'Hello world',
    ...overrides,
  }
}

describe('toSessionSummary', () => {
  it('maps basic fields', () => {
    const session = makeSession({ duration: 5000, status: 'completed', providerId: 'soniox' })
    const summary = toSessionSummary(session)

    expect(summary.id).toBe('test-1')
    expect(summary.title).toBe('Test Session')
    expect(summary.date).toBe('2026-04-17')
    expect(summary.time).toBe('14:30')
    expect(summary.duration).toBe(5000)
    expect(summary.status).toBe('completed')
    expect(summary.providerId).toBe('soniox')
  })

  it('calculates transcriptLength correctly', () => {
    const session = makeSession({ transcript: 'Hello world, this is a test.' })
    const summary = toSessionSummary(session)

    expect(summary.transcriptLength).toBe('Hello world, this is a test.'.length)
  })

  it('handles empty transcript', () => {
    const session = makeSession({ transcript: '' })
    const summary = toSessionSummary(session)

    expect(summary.transcriptLength).toBe(0)
  })

  it('detects hasSummary and hasMindMap', () => {
    const session = makeSession({
      postProcess: { summary: 'A meeting about AI', status: 'success' },
      mindMap: { markdown: '# Root\n## Branch', status: 'success' },
    })
    const summary = toSessionSummary(session)

    expect(summary.hasSummary).toBe(true)
    expect(summary.hasMindMap).toBe(true)
  })

  it('reports false for missing postProcess/mindMap', () => {
    const session = makeSession()
    const summary = toSessionSummary(session)

    expect(summary.hasSummary).toBe(false)
    expect(summary.hasMindMap).toBe(false)
  })

  it('preserves topicId and tagIds', () => {
    const session = makeSession({ topicId: 'topic-1', tagIds: ['tag-a', 'tag-b'] })
    const summary = toSessionSummary(session)

    expect(summary.topicId).toBe('topic-1')
    expect(summary.tagIds).toEqual(['tag-a', 'tag-b'])
  })
})

describe('toSessionDetail', () => {
  it('includes full transcript', () => {
    const session = makeSession({ transcript: 'Full meeting transcript here' })
    const detail = toSessionDetail(session)

    expect(detail.transcript).toBe('Full meeting transcript here')
  })

  it('handles translated transcript', () => {
    const session = makeSession({
      translatedTranscript: { text: 'Translated text', targetLanguage: 'en' },
    })
    const detail = toSessionDetail(session)

    expect(detail.translatedTranscript).toEqual({ text: 'Translated text', targetLanguage: 'en' })
  })

  it('handles missing translated transcript', () => {
    const session = makeSession()
    const detail = toSessionDetail(session)

    expect(detail.translatedTranscript).toBeUndefined()
  })

  it('maps tokens with all fields', () => {
    const session = makeSession({
      tokens: [
        { text: 'Hello', isFinal: true, startMs: 0, endMs: 500, speaker: 'speaker-1' },
        { text: 'world', isFinal: false, startMs: 500, endMs: 1000 },
      ],
    })
    const detail = toSessionDetail(session)

    expect(detail.tokens).toHaveLength(2)
    expect(detail.tokens![0]).toEqual({
      text: 'Hello',
      isFinal: true,
      startMs: 0,
      endMs: 500,
      speaker: 'speaker-1',
    })
  })

  it('maps speakers', () => {
    const session = makeSession({
      speakers: [
        { id: 'sp-1', label: 'Speaker 1', displayName: 'Alice' },
      ],
    })
    const detail = toSessionDetail(session)

    expect(detail.speakers).toHaveLength(1)
    expect(detail.speakers![0]).toEqual({
      id: 'sp-1',
      label: 'Speaker 1',
      displayName: 'Alice',
    })
  })

  it('maps postProcess', () => {
    const session = makeSession({
      postProcess: {
        summary: 'Summary text',
        actionItems: ['Do A', 'Do B'],
        keywords: ['AI', 'meeting'],
        titleSuggestion: 'AI Meeting',
        tagSuggestions: ['important'],
        generatedAt: 1713340200000,
        status: 'success',
      },
    })
    const detail = toSessionDetail(session)

    expect(detail.postProcess).toBeDefined()
    expect(detail.postProcess!.summary).toBe('Summary text')
    expect(detail.postProcess!.actionItems).toEqual(['Do A', 'Do B'])
    expect(detail.postProcess!.status).toBe('success')
  })

  it('maps mindMap', () => {
    const session = makeSession({
      mindMap: {
        markdown: '# Root\n## Branch 1',
        title: 'Meeting Map',
        generatedAt: 1713340200000,
        status: 'success',
      },
    })
    const detail = toSessionDetail(session)

    expect(detail.mindMap).toBeDefined()
    expect(detail.mindMap!.markdown).toBe('# Root\n## Branch 1')
    expect(detail.mindMap!.title).toBe('Meeting Map')
  })

  it('maps askHistory', () => {
    const session = makeSession({
      askHistory: [
        { id: 'q1', question: 'What was discussed?', answer: 'AI topics', createdAt: 1713340200000, status: 'success' as const },
      ],
    })
    const detail = toSessionDetail(session)

    expect(detail.askHistory).toHaveLength(1)
    expect(detail.askHistory![0].question).toBe('What was discussed?')
    expect(detail.askHistory![0].answer).toBe('AI topics')
  })

  it('handles empty session', () => {
    const session = makeSession({ transcript: '', tokens: undefined, speakers: undefined })
    const detail = toSessionDetail(session)

    expect(detail.transcript).toBe('')
    expect(detail.tokens).toBeUndefined()
    expect(detail.speakers).toBeUndefined()
    expect(detail.postProcess).toBeUndefined()
    expect(detail.mindMap).toBeUndefined()
    expect(detail.askHistory).toBeUndefined()
  })
})

describe('search filtering logic', () => {
  const sessions = [
    makeSession({ id: '1', title: 'AI Meeting', transcript: 'We discussed machine learning' }),
    makeSession({ id: '2', title: 'Lunch Plan', transcript: 'Pizza or sushi?' }),
    makeSession({ id: '3', title: 'Code Review', transcript: 'The AI module needs refactoring' }),
  ]

  it('filters by title match', () => {
    const query = 'ai'
    const filtered = sessions.filter(s =>
      s.title.toLowerCase().includes(query.toLowerCase())
      || (s.transcript ?? '').toLowerCase().includes(query.toLowerCase()),
    )
    expect(filtered).toHaveLength(2)
    expect(filtered.map(s => s.id)).toEqual(['1', '3'])
  })

  it('filters by transcript content', () => {
    const query = 'pizza'
    const filtered = sessions.filter(s =>
      s.title.toLowerCase().includes(query.toLowerCase())
      || (s.transcript ?? '').toLowerCase().includes(query.toLowerCase()),
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('2')
  })

  it('returns all for empty query', () => {
    const query: string = ''
    const lowerQuery = query.toLowerCase()
    const filtered = query
      ? sessions.filter(s =>
        s.title.toLowerCase().includes(lowerQuery)
        || (s.transcript ?? '').toLowerCase().includes(lowerQuery),
      )
      : sessions
    expect(filtered).toHaveLength(3)
  })
})
