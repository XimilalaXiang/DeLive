import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIXTYDB_STT_URL, sixtydbResponseToResult, transcribeFile } from '../sixtydbFileApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('60db file transcription request', () => {
  it('posts the file to /stt with a bearer token and lets 60db detect the language', async () => {
    const fetchMock = stubFetch({ text: 'hi' })
    await transcribeFile('sk_live_test', new Blob([new Uint8Array(4)]), 'talk.mp3', {})

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(SIXTYDB_STT_URL)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk_live_test')
    const form = init.body as FormData
    expect((form.get('file') as File).name).toBe('talk.mp3')
    expect(form.get('language')).toBeNull()
    expect(form.get('languages')).toBeNull()
    expect(form.get('diarize')).toBeNull()
  })

  it('narrows languages from hints, skipping the realtime "multi" placeholder, and enables diarization', async () => {
    const fetchMock = stubFetch({ text: 'hi' })
    await transcribeFile('k', new Blob([]), 'a.wav', { languageHints: ['en', 'multi', ' hi '], diarize: true })
    const form = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData
    expect(form.get('languages')).toBe('en,hi')
    expect(form.get('diarize')).toBe('true')
  })

  it('includes the API error detail', async () => {
    stubFetch({ detail: 'Invalid API key' }, 401)
    await expect(transcribeFile('bad', new Blob([]), 'a.wav', {})).rejects.toThrow('60db API error 401: Invalid API key')
  })
})

describe('sixtydbResponseToResult', () => {
  it('maps segments, speakers and duration (diarize=true response shape)', () => {
    const result = sixtydbResponseToResult({
      language: 'en',
      duration_sec: 5.2,
      text: 'Hello there. General Kenobi.',
      segments: [
        { start: 0, end: 2.5, text: ' Hello there. ', language: 'en', confidence: 0.9, speaker: 'SPEAKER_00', words: [] },
        { start: 2.5, end: 5.2, text: 'General Kenobi.', speaker: 'SPEAKER_01', words: [] },
        { start: 5.2, end: 5.2, text: '  ' },
      ],
      speakers: [
        { speaker: 'SPEAKER_00', start: 0, end: 2.4 },
        { speaker: 'SPEAKER_01', start: 2.4, end: 5.2 },
      ],
    })

    expect(result.transcript).toBe('Hello there. General Kenobi.')
    expect(result.durationMs).toBe(5200)
    expect(result.segments).toEqual([
      { text: 'Hello there.', startMs: 0, endMs: 2500, speakerId: 'SPEAKER_00', language: 'en', isFinal: true },
      { text: 'General Kenobi.', startMs: 2500, endMs: 5200, speakerId: 'SPEAKER_01', language: 'en', isFinal: true },
    ])
    expect(result.tokens.map((t) => t.text).join('')).toBe('Hello there. General Kenobi.')
    expect(result.speakers).toEqual([
      { id: 'SPEAKER_00', label: 'SPEAKER_00' },
      { id: 'SPEAKER_01', label: 'SPEAKER_01' },
    ])
  })

  it('falls back to top-level speaker turns when a segment has no speaker', () => {
    const result = sixtydbResponseToResult({
      text: 'a b',
      segments: [{ start: 0, end: 2, text: 'a' }, { start: 2, end: 4, text: 'b' }],
      speakers: [{ speaker: 'SPEAKER_00', start: 0, end: 1.8 }, { speaker: 'SPEAKER_01', start: 1.8, end: 4 }],
    })
    expect(result.segments.map((s) => s.speakerId)).toEqual(['SPEAKER_00', 'SPEAKER_01'])
  })

  it('leaves speakers empty without diarization', () => {
    const result = sixtydbResponseToResult({ text: 'hi', duration_sec: 1, segments: [{ start: 0, end: 1, text: 'hi' }] })
    expect(result.segments[0].speakerId).toBeUndefined()
    expect(result.speakers).toEqual([])
  })

  it('falls back to the full text when there are no segments', () => {
    const result = sixtydbResponseToResult({ text: ' only text ', duration_sec: 3 })
    expect(result.transcript).toBe('only text')
    expect(result.segments).toEqual([{ text: 'only text', startMs: 0, endMs: 3000, isFinal: true }])
  })

  it('reports an empty transcript for silence', () => {
    const result = sixtydbResponseToResult({ text: '', segments: [], warning_codes: ['no_speech_detected'] })
    expect(result.transcript).toBe('')
    expect(result.tokens).toEqual([])
  })
})
