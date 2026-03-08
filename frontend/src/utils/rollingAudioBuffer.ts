export interface TimedAudioChunk<T> {
  data: T
  durationMs: number
}

export class RollingAudioBuffer<T> {
  private chunks: TimedAudioChunk<T>[] = []
  private totalDurationMs = 0

  constructor(private readonly maxWindowMs: number) {}

  add(data: T, durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return
    }

    this.chunks.push({ data, durationMs })
    this.totalDurationMs += durationMs
    this.trim()
  }

  clear(): void {
    this.chunks = []
    this.totalDurationMs = 0
  }

  hasData(): boolean {
    return this.chunks.length > 0
  }

  getDurationMs(): number {
    return this.totalDurationMs
  }

  getItems(): T[] {
    return this.chunks.map((chunk) => chunk.data)
  }

  private trim(): void {
    while (this.totalDurationMs > this.maxWindowMs && this.chunks.length > 1) {
      const removed = this.chunks.shift()
      if (!removed) {
        break
      }
      this.totalDurationMs -= removed.durationMs
    }
  }
}

export function getPcmChunkDurationMs(
  buffer: ArrayBuffer,
  sampleRate: number,
  channels = 1,
  bitsPerSample = 16,
): number {
  const bytesPerSample = bitsPerSample / 8
  const frameSize = channels * bytesPerSample
  if (frameSize <= 0 || sampleRate <= 0) {
    return 0
  }

  const frameCount = buffer.byteLength / frameSize
  return (frameCount / sampleRate) * 1000
}

export function getMediaRecorderChunkDurationMs(defaultChunkMs = 100): number {
  return defaultChunkMs
}
