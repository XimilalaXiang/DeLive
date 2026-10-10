import { afterEach, describe, expect, it, vi } from 'vitest'
import { transcribeFile, whisperCppResponseToResult } from '../whisperCppFileApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(body: unknown, init: { status?: number } = {}) {
  const fetchMock = vi.fn(async () => new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    { status: init.status ?? 200, headers: { 'content-type': 'application/json' } },
  ))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('whisper.cpp file transcription request', () => {
  it('posts the WAV to /inference with verbose_json and auto language by default', async () => {
    const fetchMock = stubFetch({ text: 'hi' })
    const wav = new Blob([new Uint8Array(44)], { type: 'audio/wav' })

    await transcribeFile('http://127.0.0.1:8177/', wav, {})

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:8177/inference')
    expect(init.method).toBe('POST')
    const form = init.body as FormData
    expect(form.get('response_format')).toBe('verbose_json')
    expect(form.get('language')).toBe('auto')
    expect((form.get('file') as File).name).toBe('audio.wav')
  })

  it('passes the language hint through', async () => {
    const fetchMock = stubFetch({ text: '你好' })
    await transcribeFile('http://127.0.0.1:8177', new Blob([]), { language: 'zh' })
    const form = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData
    expect(form.get('language')).toBe('zh')
  })

  it('surfaces server errors', async () => {
    stubFetch('failed to read audio data', { status: 400 })
    await expect(transcribeFile('http://127.0.0.1:8177', new Blob([]), {}))
      .rejects.toThrow('whisper.cpp error 400: failed to read audio data')

    stubFetch({ error: 'model not loaded' })
    await expect(transcribeFile('http://127.0.0.1:8177', new Blob([]), {}))
      .rejects.toThrow('whisper.cpp error: model not loaded')
  })
})

describe('whisperCppResponseToResult', () => {
  it('maps verbose_json segments to timed segments', () => {
    const result = whisperCppResponseToResult({
      text: ' Hello world. Second line.',
      language: 'en',
      duration: 4.5,
      segments: [
        { id: 0, text: ' Hello world.', start: 0, end: 2.2 },
        { id: 1, text: ' Second line.', start: 2.2, end: 4.5 },
        { id: 2, text: '   ', start: 4.5, end: 4.5 },
      ],
    }, 1000)

    expect(result.transcript).toBe('Hello world. Second line.')
    expect(result.durationMs).toBe(4500)
    expect(result.segments).toEqual([
      { text: 'Hello world.', startMs: 0, endMs: 2200, language: 'en', isFinal: true },
      { text: 'Second line.', startMs: 2200, endMs: 4500, language: 'en', isFinal: true },
    ])
    expect(result.tokens).toHaveLength(2)
    expect(result.tokens[1]).toMatchObject({ startMs: 2200, endMs: 4500, isFinal: true })
  })

  it('falls back to a single segment for plain json responses', () => {
    const result = whisperCppResponseToResult({ text: ' just text ' }, 3000)
    expect(result.transcript).toBe('just text')
    expect(result.durationMs).toBe(3000)
    expect(result.segments).toEqual([{ text: 'just text', startMs: 0, endMs: 3000, isFinal: true }])
  })

  it('returns an empty transcript when nothing was recognized', () => {
    const result = whisperCppResponseToResult({ text: '', segments: [] }, 1000)
    expect(result.transcript).toBe('')
    expect(result.segments).toEqual([])
    expect(result.tokens).toEqual([])
  })
})
