import { describe, it, expect } from 'vitest'
import { buildPcmWavBlob } from './pcmWav'

function makePcmChunk(samples: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(samples.length * 2)
  const view = new DataView(buf)
  samples.forEach((s, i) => view.setInt16(i * 2, s, true))
  return buf
}

function readAscii(view: DataView, offset: number, length: number): string {
  let s = ''
  for (let i = 0; i < length; i++) s += String.fromCharCode(view.getUint8(offset + i))
  return s
}

describe('buildPcmWavBlob', () => {
  it('produces a Blob with audio/wav MIME type', () => {
    const blob = buildPcmWavBlob([], { sampleRate: 16000 })
    expect(blob.type).toBe('audio/wav')
  })

  it('creates a 44-byte WAV header for empty audio', async () => {
    const blob = buildPcmWavBlob([], { sampleRate: 16000 })
    expect(blob.size).toBe(44)

    const buf = await blob.arrayBuffer()
    const view = new DataView(buf)

    expect(readAscii(view, 0, 4)).toBe('RIFF')
    expect(readAscii(view, 8, 4)).toBe('WAVE')
    expect(readAscii(view, 12, 4)).toBe('fmt ')
    expect(readAscii(view, 36, 4)).toBe('data')
  })

  it('writes correct RIFF chunk size for empty audio', async () => {
    const blob = buildPcmWavBlob([], { sampleRate: 16000 })
    const view = new DataView(await blob.arrayBuffer())
    // RIFF size = 36 + pcmSize (0)
    expect(view.getUint32(4, true)).toBe(36)
  })

  it('writes correct fmt sub-chunk for 16kHz mono 16-bit', async () => {
    const blob = buildPcmWavBlob([], { sampleRate: 16000 })
    const view = new DataView(await blob.arrayBuffer())

    expect(view.getUint32(16, true)).toBe(16) // fmt chunk size
    expect(view.getUint16(20, true)).toBe(1)  // PCM format
    expect(view.getUint16(22, true)).toBe(1)  // channels
    expect(view.getUint32(24, true)).toBe(16000) // sample rate
    expect(view.getUint32(28, true)).toBe(32000) // byte rate = 16000 * 1 * 2
    expect(view.getUint16(32, true)).toBe(2)  // block align = 1 * 2
    expect(view.getUint16(34, true)).toBe(16) // bits per sample
  })

  it('writes correct fmt sub-chunk for stereo 48kHz', async () => {
    const blob = buildPcmWavBlob([], { sampleRate: 48000, channels: 2, bitsPerSample: 16 })
    const view = new DataView(await blob.arrayBuffer())

    expect(view.getUint16(22, true)).toBe(2)     // channels
    expect(view.getUint32(24, true)).toBe(48000)  // sample rate
    expect(view.getUint32(28, true)).toBe(192000) // byte rate = 48000 * 2 * 2
    expect(view.getUint16(32, true)).toBe(4)      // block align = 2 * 2
  })

  it('appends PCM data after the header', async () => {
    const chunk = makePcmChunk([100, -200, 300])
    const blob = buildPcmWavBlob([chunk], { sampleRate: 16000 })
    expect(blob.size).toBe(44 + 6) // header + 3 samples * 2 bytes

    const view = new DataView(await blob.arrayBuffer())
    expect(view.getUint32(4, true)).toBe(36 + 6) // RIFF size
    expect(view.getUint32(40, true)).toBe(6)      // data chunk size

    expect(view.getInt16(44, true)).toBe(100)
    expect(view.getInt16(46, true)).toBe(-200)
    expect(view.getInt16(48, true)).toBe(300)
  })

  it('concatenates multiple chunks', async () => {
    const c1 = makePcmChunk([10, 20])
    const c2 = makePcmChunk([30])
    const blob = buildPcmWavBlob([c1, c2], { sampleRate: 16000 })
    expect(blob.size).toBe(44 + 6)

    const view = new DataView(await blob.arrayBuffer())
    expect(view.getInt16(44, true)).toBe(10)
    expect(view.getInt16(46, true)).toBe(20)
    expect(view.getInt16(48, true)).toBe(30)
  })

  it('defaults channels to 1 and bitsPerSample to 16', async () => {
    const blob = buildPcmWavBlob([], { sampleRate: 8000 })
    const view = new DataView(await blob.arrayBuffer())

    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(28, true)).toBe(16000) // 8000 * 1 * 2
  })
})
