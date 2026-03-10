import { describe, expect, it } from 'vitest'
import { normalizeTranscriptSession } from './sessionSchema'

describe('sessionSchema', () => {
  it('normalizes ask history entries and citations', () => {
    const normalized = normalizeTranscriptSession({
      id: 'session-1',
      title: 'Session',
      date: '2026-03-10',
      time: '12:00',
      createdAt: 1,
      updatedAt: 2,
      transcript: 'Hello world',
      askHistory: [
        {
          id: 'turn-1',
          conversationId: 'conv-1',
          question: 'What happened?',
          answer: 'The team agreed to ship.',
          status: 'success',
          createdAt: 100,
          answeredAt: 200,
          citations: [
            { quote: 'We should ship it this week.', speakerLabel: 'Alice' },
          ],
        },
      ],
    })

    expect(normalized.askHistory).toEqual([
      {
        id: 'turn-1',
        conversationId: 'conv-1',
        question: 'What happened?',
        answer: 'The team agreed to ship.',
        status: 'success',
        createdAt: 100,
        answeredAt: 200,
        citations: [
          { quote: 'We should ship it this week.', speakerLabel: 'Alice' },
        ],
      },
    ])
  })
})
