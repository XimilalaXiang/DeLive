import { describe, expect, it } from 'vitest'
import {
  RollingAudioBuffer,
  getMediaRecorderChunkDurationMs,
  getPcmChunkDurationMs,
} from './rollingAudioBuffer'

describe('RollingAudioBuffer', () => {
  it('keeps chunks within the configured rolling window', () => {
    const buffer = new RollingAudioBuffer<string>(300)

    buffer.add('a', 100)
    buffer.add('b', 100)
    buffer.add('c', 100)
    buffer.add('d', 100)

    expect(buffer.getItems()).toEqual(['b', 'c', 'd'])
    expect(buffer.getDurationMs()).toBe(300)
  })

  it('retains the latest chunk even if it exceeds the window by itself', () => {
    const buffer = new RollingAudioBuffer<string>(100)

    buffer.add('oversized', 250)

    expect(buffer.getItems()).toEqual(['oversized'])
    expect(buffer.getDurationMs()).toBe(250)
  })

  it('clears all buffered chunks', () => {
    const buffer = new RollingAudioBuffer<string>(300)

    buffer.add('a', 100)
    buffer.clear()

    expect(buffer.hasData()).toBe(false)
    expect(buffer.getItems()).toEqual([])
    expect(buffer.getDurationMs()).toBe(0)
  })
})

describe('getPcmChunkDurationMs', () => {
  it('calculates PCM chunk duration using sample rate and bit depth', () => {
    const oneSecondBuffer = new ArrayBuffer(16000 * 2)

    expect(getPcmChunkDurationMs(oneSecondBuffer, 16000)).toBe(1000)
  })
})

describe('getMediaRecorderChunkDurationMs', () => {
  it('returns the configured fallback chunk duration', () => {
    expect(getMediaRecorderChunkDurationMs()).toBe(100)
    expect(getMediaRecorderChunkDurationMs(250)).toBe(250)
  })
})
