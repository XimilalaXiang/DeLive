import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ASRVendor, type ProviderConfig } from '../../types/asr'
import { WindowedBatchTranscriptionProvider } from '../windowedBatch'

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

  protected async transcribeWindow(): Promise<string> {
    this.transcribeWindowCalls += 1
    const next = this.responses.shift()
    if (next instanceof Error) {
      throw next
    }
    return next ?? ''
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

  it('runs interval-based retranscription and emits partial text', async () => {
    const provider = new TestWindowedProvider('interval')
    provider.responses = ['hello world']

    const partialSpy = vi.fn()
    provider.on('onPartial', partialSpy)

    await provider.connect({})
    provider.sendAudio(new ArrayBuffer(8))

    await vi.advanceTimersByTimeAsync(100)
    await flushAsyncWork()

    expect(provider.transcribeWindowCalls).toBe(1)
    expect(partialSpy).toHaveBeenCalledWith('hello world')
  })

  it('flushes buffered transcript on disconnect', async () => {
    const provider = new TestWindowedProvider('debounce')
    provider.responses = ['final transcript']

    const finalSpy = vi.fn()
    const finishedSpy = vi.fn()
    provider.on('onFinal', finalSpy)
    provider.on('onFinished', finishedSpy)

    await provider.connect({})
    provider.sendAudio(new ArrayBuffer(8))
    await flushAsyncWork()
    await provider.disconnect()
    await flushAsyncWork()

    expect(finalSpy).toHaveBeenCalledWith('final transcript')
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
    expect(partialSpy).toHaveBeenCalledWith('retry success')
  })
})
