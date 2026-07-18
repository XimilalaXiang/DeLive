import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ASRVendor, type ProviderConfig } from '../../types/asr'
import { WindowedBatchTranscriptionProvider } from '../windowedBatch'
import type { TimestampedWord } from '../../utils/hypothesisBuffer'

function textToWords(text: string): TimestampedWord[] {
  if (!text) return []
  return text.split(/\s+/).filter(Boolean).map((w, i) => ({
    start: i * 0.5,
    end: (i + 1) * 0.5,
    text: w,
  }))
}

class TestWindowedProvider extends WindowedBatchTranscriptionProvider<string> {
  readonly id = ASRVendor.Groq
  readonly info = {
    id: ASRVendor.Groq,
    name: 'Test',
    description: 'test',
    type: 'cloud' as const,
    supportsStreaming: false,
    capabilities: {
      audioInputMode: 'pcm16' as const,
      transport: { type: 'full-session-retranscription' as const },
    },
    requiredConfigKeys: [],
    supportedLanguages: ['en'],
    website: 'https://example.com',
    configFields: [],
  }

  public responses: Array<string | Error> = []
  public transcribeWindowCalls = 0

  constructor(
    scheduleMode: 'interval' | 'debounce' = 'interval',
    retryOnFailure = false,
    emitErrorOnNonFinalFailure = true,
  ) {
    super({
      maxWindowMs: 10_000,
      transcribeIntervalMs: 100,
      scheduleMode,
    })

    this.retryOnFailure = retryOnFailure
    this.emitErrorOnNonFinalFailure = emitErrorOnNonFinalFailure
  }

  private readonly retryOnFailure: boolean
  private readonly emitErrorOnNonFinalFailure: boolean

  connect(config: ProviderConfig): Promise<void> {
    this.beginWindowedSession(config)
    return Promise.resolve()
  }

  protected shouldEmitErrorOnNonFinalTranscriptionFailure(): boolean {
    return this.emitErrorOnNonFinalFailure
  }

  protected shouldRetryAfterNonFinalTranscriptionFailure(): boolean {
    return this.retryOnFailure
  }

  protected async resolveAudioChunk(): Promise<{ chunk: string; durationMs: number }> {
    return { chunk: 'chunk', durationMs: 100 }
  }

  protected async transcribeWindow(): Promise<TimestampedWord[]> {
    this.transcribeWindowCalls += 1
    const next = this.responses.shift()
    if (next instanceof Error) {
      throw next
    }
    return textToWords(next ?? '')
  }
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('WindowedBatchTranscriptionProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('emits partial text from incomplete hypothesis after first call', async () => {
    const provider = new TestWindowedProvider('interval')
    provider.responses = ['hello world']

    const partialSpy = vi.fn()
    provider.on('onPartial', partialSpy)

    await provider.connect({})
    provider.sendAudio(new ArrayBuffer(8))

    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    expect(provider.transcribeWindowCalls).toBe(1)
    expect(partialSpy).toHaveBeenCalled()
  })

  it('commits agreed words after two consistent calls and flushes on disconnect', async () => {
    const provider = new TestWindowedProvider('debounce')
    provider.responses = ['hello world', 'hello world']

    const finalSpy = vi.fn()
    const finishedSpy = vi.fn()
    provider.on('onFinal', finalSpy)
    provider.on('onFinished', finishedSpy)

    await provider.connect({})
    provider.sendAudio(new ArrayBuffer(8))
    await flushAsyncWork()
    await provider.disconnect()
    await flushAsyncWork()

    expect(finalSpy).toHaveBeenCalled()
    expect(finishedSpy).toHaveBeenCalledTimes(1)
    expect(provider.state).toBe('idle')
  })

  it('can retry non-final failures without emitting an error', async () => {
    const provider = new TestWindowedProvider('interval', true, false)
    provider.responses = [new Error('temporary failure'), 'retry success']

    const errorSpy = vi.fn()
    const partialSpy = vi.fn()
    provider.on('onError', errorSpy)
    provider.on('onPartial', partialSpy)

    await provider.connect({})
    provider.sendAudio(new ArrayBuffer(8))

    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    expect(provider.transcribeWindowCalls).toBe(2)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

/**
 * Provider that mimics whisper.cpp — returns the entire transcription
 * as a single TimestampedWord {start:0, end:0, text}.
 */
class SingleBlobProvider extends WindowedBatchTranscriptionProvider<string> {
  readonly id = ASRVendor.Groq
  readonly info = {
    id: ASRVendor.Groq,
    name: 'SingleBlob',
    description: 'test single-blob provider',
    type: 'cloud' as const,
    supportsStreaming: false,
    capabilities: {
      audioInputMode: 'pcm16' as const,
      transport: { type: 'full-session-retranscription' as const },
    },
    requiredConfigKeys: [],
    supportedLanguages: ['en'],
    website: 'https://example.com',
    configFields: [],
  }

  public responses: Array<string | Error> = []

  constructor() {
    super({ maxWindowMs: 10_000, transcribeIntervalMs: 100, scheduleMode: 'debounce' })
  }

  connect(config: ProviderConfig): Promise<void> {
    this.beginWindowedSession(config)
    return Promise.resolve()
  }

  protected shouldEmitErrorOnNonFinalTranscriptionFailure() { return true }
  protected shouldRetryAfterNonFinalTranscriptionFailure() { return false }

  protected async resolveAudioChunk() {
    return { chunk: 'chunk', durationMs: 100 }
  }

  protected async transcribeWindow(): Promise<TimestampedWord[]> {
    const next = this.responses.shift()
    if (next instanceof Error) throw next
    if (!next) return []
    return [{ start: 0, end: 0, text: next }]
  }
}

describe('WindowedBatchTranscriptionProvider — single-blob split (Issue #12)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('commits stable words from single-blob results', async () => {
    const provider = new SingleBlobProvider()
    provider.responses = ['hello world', 'hello world foo']

    const finalSpy = vi.fn()
    provider.on('onFinal', finalSpy)

    await provider.connect({})

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    expect(finalSpy).toHaveBeenCalled()
    const committed = finalSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('')
    expect(committed).toContain('hello')
    expect(committed).toContain('world')
  })

  it('preserves spaces in committed English text', async () => {
    const provider = new SingleBlobProvider()
    provider.responses = ['alpha beta gamma', 'alpha beta gamma']

    const finalSpy = vi.fn()
    provider.on('onFinal', finalSpy)

    await provider.connect({})

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    expect(finalSpy).toHaveBeenCalled()
    const committed = finalSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('')
    expect(committed).toBe('alpha beta gamma')
  })

  it('handles Korean text with spaces correctly', async () => {
    const provider = new SingleBlobProvider()
    provider.responses = ['안녕하세요 세상', '안녕하세요 세상']

    const finalSpy = vi.fn()
    provider.on('onFinal', finalSpy)

    await provider.connect({})

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    expect(finalSpy).toHaveBeenCalled()
    const committed = finalSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('')
    expect(committed).toBe('안녕하세요 세상')
  })

  it('handles CJK text without spaces via character-level split', async () => {
    const provider = new SingleBlobProvider()
    provider.responses = ['你好世界', '你好世界']

    const finalSpy = vi.fn()
    provider.on('onFinal', finalSpy)

    await provider.connect({})

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    expect(finalSpy).toHaveBeenCalled()
    const committed = finalSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('')
    expect(committed).toBe('你好世界')
  })

  it('handles single-word transcription without splitting', async () => {
    const provider = new SingleBlobProvider()
    provider.responses = ['hello', 'hello']

    const finalSpy = vi.fn()
    provider.on('onFinal', finalSpy)

    await provider.connect({})

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    provider.sendAudio(new ArrayBuffer(8))
    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    expect(finalSpy).toHaveBeenCalled()
    const committed = finalSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('')
    expect(committed).toBe('hello')
  })
})
