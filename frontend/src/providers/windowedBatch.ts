import type { ProviderConfig } from '../types/asr'
import { RollingAudioBuffer } from '../utils/rollingAudioBuffer'
import { TranscriptStabilizer } from '../utils/transcriptStabilizer'
import { buildWindowedTranscriptSnapshot } from '../utils/windowedTranscript'
import { BaseASRProvider } from './base'

type WindowedBatchScheduleMode = 'interval' | 'debounce'

export interface TimedProviderChunk<TChunk> {
  chunk: TChunk
  durationMs: number
}

export interface WindowedBatchProviderOptions {
  maxWindowMs: number
  transcribeIntervalMs: number
  scheduleMode?: WindowedBatchScheduleMode
}

export abstract class WindowedBatchTranscriptionProvider<TChunk> extends BaseASRProvider {
  private readonly audioWindow: RollingAudioBuffer<TChunk>
  private readonly transcribeIntervalMs: number
  private readonly scheduleMode: WindowedBatchScheduleMode
  private transcribeLoop: ReturnType<typeof setInterval> | null = null
  private transcribeTimer: ReturnType<typeof setTimeout> | null = null
  private inFlight = false
  private pendingFinal = false
  private hasPendingAudio = false
  private stabilizer = new TranscriptStabilizer()
  private lastPartialText = ''

  protected constructor(options: WindowedBatchProviderOptions) {
    super()
    this.audioWindow = new RollingAudioBuffer<TChunk>(options.maxWindowMs)
    this.transcribeIntervalMs = options.transcribeIntervalMs
    this.scheduleMode = options.scheduleMode ?? 'interval'
  }

  protected beginWindowedSession(config: ProviderConfig): void {
    this._config = config
    this.resetWindowedSession()
    this.setState('connected')
  }

  protected endWindowedSession(): void {
    this.setState('idle')
    this.resetWindowedSession()
  }

  protected getBufferedChunks(): TChunk[] {
    return this.audioWindow.getItems()
  }

  protected getActiveConfig(): ProviderConfig | null {
    return this._config
  }

  protected createTranscriptionError(message: string) {
    return this.createError('TRANSCRIPTION_ERROR', message)
  }

  protected shouldEmitErrorOnNonFinalTranscriptionFailure(): boolean {
    return true
  }

  protected shouldRetryAfterNonFinalTranscriptionFailure(): boolean {
    return false
  }

  protected handleAudioInputError(error: unknown): void {
    console.error(`[${this.id}] 处理音频输入失败:`, error)
  }

  protected abstract resolveAudioChunk(
    data: Blob | ArrayBuffer,
  ): Promise<TimedProviderChunk<TChunk> | null>

  protected abstract transcribeWindow(
    chunks: TChunk[],
    config: ProviderConfig,
  ): Promise<string>

  async disconnect(): Promise<void> {
    this.clearScheduler()

    if (this.audioWindow.hasData()) {
      this.pendingFinal = true
      await this.transcribe(true)
      return
    }

    this.endWindowedSession()
  }

  sendAudio(data: Blob | ArrayBuffer): void {
    if (!this._config) {
      console.warn(`[${this.id}] 未连接，忽略音频数据`)
      return
    }

    this.setState('recording')
    void this.enqueueAudio(data)
  }

  private async enqueueAudio(data: Blob | ArrayBuffer): Promise<void> {
    try {
      const resolved = await this.resolveAudioChunk(data)
      if (!resolved || resolved.durationMs <= 0) {
        return
      }

      this.audioWindow.add(resolved.chunk, resolved.durationMs)
      this.hasPendingAudio = true
      this.scheduleTranscribe()
    } catch (error) {
      this.handleAudioInputError(error)
    }
  }

  private scheduleTranscribe(): void {
    if (this.scheduleMode === 'debounce') {
      this.clearDebounceTimer()
      this.transcribeTimer = setTimeout(() => {
        void this.transcribe(false)
      }, this.transcribeIntervalMs)
      return
    }

    if (this.transcribeLoop) {
      return
    }

    this.transcribeLoop = setInterval(() => {
      if (this.inFlight || !this.hasPendingAudio || this.pendingFinal) {
        return
      }

      void this.transcribe(false)
    }, this.transcribeIntervalMs)
  }

  private clearScheduler(): void {
    if (this.transcribeLoop) {
      clearInterval(this.transcribeLoop)
      this.transcribeLoop = null
    }

    this.clearDebounceTimer()
  }

  private clearDebounceTimer(): void {
    if (this.transcribeTimer) {
      clearTimeout(this.transcribeTimer)
      this.transcribeTimer = null
    }
  }

  private async transcribe(isFinal: boolean): Promise<void> {
    const config = this._config
    if (!config || !this.audioWindow.hasData()) {
      return
    }

    if (this.inFlight) {
      if (isFinal) {
        this.pendingFinal = true
      }
      return
    }

    this.inFlight = true
    this.hasPendingAudio = false
    let shouldRunFinalPass = false

    try {
      const transcriptText = await this.transcribeWindow(this.audioWindow.getItems(), config)
      const syntheticSnapshot = buildWindowedTranscriptSnapshot(
        this.stabilizer.getCommittedText(),
        transcriptText,
      )
      const update = isFinal
        ? this.stabilizer.flush(syntheticSnapshot)
        : this.stabilizer.process(syntheticSnapshot)

      if (update.finalizedText) {
        this.emitFinal(update.finalizedText)
      }

      if (update.partialText !== this.lastPartialText) {
        this.lastPartialText = update.partialText
        if (update.partialText) {
          this.emitPartial(update.partialText)
        }
      }

      if (isFinal) {
        this.lastPartialText = ''
        this.emitFinished()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '转录失败'
      console.error(`[${this.id}] 转录失败:`, error)

      if (isFinal || this.shouldEmitErrorOnNonFinalTranscriptionFailure()) {
        this.emitError(this.createTranscriptionError(message))
      }

      if (!isFinal && this.shouldRetryAfterNonFinalTranscriptionFailure()) {
        this.hasPendingAudio = true
      }
    } finally {
      this.inFlight = false

      if (this.pendingFinal && !isFinal) {
        this.pendingFinal = false
        shouldRunFinalPass = true
      } else if (isFinal) {
        this.endWindowedSession()
      }
    }

    if (shouldRunFinalPass) {
      await this.transcribe(true)
    }
  }

  private resetWindowedSession(): void {
    this.clearScheduler()
    this.audioWindow.clear()
    this.inFlight = false
    this.pendingFinal = false
    this.hasPendingAudio = false
    this.stabilizer.reset()
    this.lastPartialText = ''
  }
}
